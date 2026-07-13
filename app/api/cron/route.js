import { NextResponse } from 'next/server';
import { addVideos, getCrawlTargets } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Cutoff Date: April 1, 2026 KST
const CUTOFF_DATE = new Date('2026-04-01T00:00:00+09:00');

// Regex helper to extract Tournament
function extractTournament(title) {
  const tournamentRegex = /([가-힣A-Za-z0-9]+(?:리그|컵|대회|배))/;
  const match = title.match(tournamentRegex);
  return match ? match[1] : '';
}

// Regex helper to extract Opponent
function extractOpponent(title) {
  const opponentRegex = /(?:vs|VS|상대|@)\s*([가-힣A-Za-z0-9]+)/i;
  const match = title.match(opponentRegex);
  return match ? match[1] : '';
}

// Custom parser to parse YouTube RSS feed XML without external dependencies
function parseYouTubeRss(xmlText, teamDivision, cutoffDate = CUTOFF_DATE) {
  const videos = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryContent = match[1];
    
    const idMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entryContent.match(/<published>([^<]+)<\/published>/);
    const thumbnailMatch = entryContent.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    
    if (idMatch && titleMatch) {
      const sourceVideoId = idMatch[1].trim();
      const title = titleMatch[1].trim();
      const publishedAtStr = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();
      const publishedAt = new Date(publishedAtStr);

      // Apply date filter
      if (publishedAt < cutoffDate) {
        continue;
      }

      const thumbnailUrl = thumbnailMatch 
        ? thumbnailMatch[1].trim() 
        : `https://i.ytimg.com/vi/${sourceVideoId}/hqdefault.jpg`;
      
      const tournament = extractTournament(title);
      const opponent = extractOpponent(title);
      
      videos.push({
        source: 'youtube',
        source_video_id: sourceVideoId,
        title,
        thumbnail_url: thumbnailUrl,
        published_at: publishedAt.toISOString(),
        url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
        team_division: teamDivision,
        tournament,
        opponent,
        parsed_status: 'success' // Classified by source channel!
      });
    }
  }
  
  return videos;
}

// Parse SOOP VOD API reg_date in KST to ISO string
function parseSoopDate(dateStr) {
  // dateStr format is 'YYYY-MM-DD HH:mm:ss' (KST)
  try {
    const formattedStr = dateStr.replace(' ', 'T') + '+09:00';
    return new Date(formattedStr);
  } catch (e) {
    return new Date();
  }
}

// Parse SOOP VOD API payload
function parseSoopVods(vodArray, bjId, teamDivision, cutoffDate = CUTOFF_DATE) {
  const videos = [];
  
  if (!Array.isArray(vodArray)) return videos;

  for (const item of vodArray) {
    const titleNo = item.title_no;
    const title = item.title_name;
    const regDate = item.reg_date;
    const publishedAt = parseSoopDate(regDate);

    // Apply date filter
    if (publishedAt < cutoffDate) {
      continue;
    }

    let thumbUrl = '';
    if (item.ucc && item.ucc.thumb) {
      thumbUrl = item.ucc.thumb.startsWith('//') 
        ? `https:${item.ucc.thumb}` 
        : item.ucc.thumb;
    }

    const tournament = extractTournament(title);
    const opponent = extractOpponent(title);

    videos.push({
      source: 'soop',
      source_video_id: String(titleNo),
      title,
      thumbnail_url: thumbUrl || 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800',
      published_at: publishedAt.toISOString(),
      url: `https://vod.sooplive.co.kr/player/${titleNo}`,
      team_division: teamDivision,
      tournament,
      opponent,
      parsed_status: 'success' // Classified by source channel!
    });
  }

  return videos;
}

// Dynamically resolve YouTube Handle to Channel ID
// Dynamically resolve YouTube Handle to Channel ID
async function resolveYtChannelId(handle) {
  try {
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const url = `https://www.youtube.com/${encodeURIComponent(formattedHandle)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/channel\/([A-Za-z0-9_-]{24})/) || html.match(/"browseId":"(UC[A-Za-z0-9_-]{22})"/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('Failed to resolve channel ID for', handle, e);
    return null;
  }
}

// Helper to parse relative date into Date object
function parseRelativeDate(text) {
  if (!text) return new Date();
  const now = new Date();
  const match = text.match(/(\d+)\s*(분|시간|일|주|개월|년)\s*전/);
  if (!match) return now;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case '분': return new Date(now.getTime() - val * 60 * 1000);
    case '시간': return new Date(now.getTime() - val * 60 * 60 * 1000);
    case '일': return new Date(now.getTime() - val * 24 * 60 * 60 * 1000);
    case '주': return new Date(now.getTime() - val * 7 * 24 * 60 * 60 * 1000);
    case '개월': return new Date(now.getTime() - val * 30 * 24 * 60 * 60 * 1000);
    case '년': return new Date(now.getTime() - val * 365 * 24 * 60 * 60 * 1000);
    default: return now;
  }
}

// Scrape YouTube channel videos page as fallback
async function scrapeYoutubeHtml(channelId, teamDivision, cutoffDate = CUTOFF_DATE) {
  const videos = [];
  const url = `https://www.youtube.com/channel/${channelId}/videos`;
  console.log(`[YouTube Scraper Fallback] Fetching videos page for channel ${channelId}:`, url);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      console.warn(`[YouTube Scraper Fallback] Page fetch failed with status: ${response.status}`);
      return [];
    }
    const html = await response.text();
    
    // Extract ytInitialData
    const dataRegex = /var ytInitialData = ({[\s\S]*?});<\/script>/;
    const match = html.match(dataRegex);
    if (!match) {
      console.warn('[YouTube Scraper Fallback] Could not find ytInitialData in HTML');
      return [];
    }
    
    const jsonData = JSON.parse(match[1]);
    const tabs = jsonData.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs) {
      console.warn('[YouTube Scraper Fallback] No tabs structure in ytInitialData');
      return [];
    }
    
    for (const tab of tabs) {
      const title = tab.tabRenderer?.title;
      const isVideoTab = title === '동영상' || title === 'Videos';
      const isLiveTab = title === '라이브' || title === 'Live' || title === 'Streams';
      
      if (isVideoTab || isLiveTab) {
        const contents = tab.tabRenderer?.content?.richGridRenderer?.contents;
        if (!contents) continue;
        
        for (const item of contents) {
          const richItem = item.richItemRenderer;
          if (richItem) {
            const lockup = richItem.content?.lockupViewModel;
            if (lockup) {
              const videoId = lockup.contentId;
              const videoTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content;
              
              let relativeTime = '';
              const rows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
              if (rows && rows[0]?.metadataParts) {
                const parts = rows[0].metadataParts;
                if (parts.length > 1) {
                  relativeTime = parts[1].text?.content || '';
                } else if (parts[0]?.text?.content) {
                  relativeTime = parts[0].text.content;
                }
              }
              
              if (videoId && videoTitle) {
                const publishedAt = parseRelativeDate(relativeTime);
                
                // Apply cutoff date filter
                if (publishedAt < cutoffDate) {
                  continue;
                }
                
                const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                const tournament = extractTournament(videoTitle);
                const opponent = extractOpponent(videoTitle);
                
                if (!videos.some(v => v.source_video_id === videoId)) {
                  videos.push({
                    source: 'youtube',
                    source_video_id: videoId,
                    title: videoTitle.trim(),
                    thumbnail_url: thumbnail,
                    published_at: publishedAt.toISOString(),
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    team_division: teamDivision,
                    tournament,
                    opponent,
                    parsed_status: 'success'
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[YouTube Scraper Fallback] Error occurred during HTML scraping:', err);
  }
  return videos;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  let cutoffDate = CUTOFF_DATE;
  if (yearParam && monthParam) {
    const y = parseInt(yearParam, 10);
    const m = parseInt(monthParam, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      const monthStr = String(m).padStart(2, '0');
      cutoffDate = new Date(`${y}-${monthStr}-01T00:00:00+09:00`);
    }
  }

  // Fetch crawl targets from DB
  const { targets } = await getCrawlTargets();
  
  let allScrapedVideos = [];
  const platformsStatus = {};

  for (const target of targets) {
    const { platform, target_id, team_division } = target;
    const statusKey = `${platform}_${team_division}_${target_id}`;
    
    if (platform === 'youtube') {
      try {
        let channelId = target_id;
        // Resolve handle if starts with @
        if (target_id.startsWith('@')) {
          const resolved = await resolveYtChannelId(target_id);
          if (resolved) {
            channelId = resolved;
          }
        }
        
        let youtubeSuccess = false;
        // Try RSS first
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const response = await fetch(rssUrl, { 
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 0 } 
          });
          if (response.ok) {
            const xmlText = await response.text();
            const ytVideos = parseYouTubeRss(xmlText, team_division, cutoffDate);
            if (ytVideos.length > 0) {
              allScrapedVideos = [...allScrapedVideos, ...ytVideos];
              youtubeSuccess = true;
            }
          }
        } catch (rssErr) {
          console.error(`YouTube RSS failed for ${target_id}:`, rssErr);
        }
        
        // Fallback to HTML Scraping if RSS failed or returned 0 videos
        if (!youtubeSuccess) {
          console.log(`[YouTube RSS Fallback Alert] Falling back to HTML scraping for channel ${channelId}`);
          const ytHtmlVideos = await scrapeYoutubeHtml(channelId, team_division, cutoffDate);
          if (ytHtmlVideos.length > 0) {
            allScrapedVideos = [...allScrapedVideos, ...ytHtmlVideos];
            youtubeSuccess = true;
          }
        }
        
        platformsStatus[statusKey] = youtubeSuccess ? 'success' : 'failed';
      } catch (e) {
        console.error(`Error scraping YouTube channel ${target_id}:`, e);
        platformsStatus[statusKey] = 'failed';
      }
    } else if (platform === 'soop') {
      try {
        const apiUrl = `https://bjapi.afreecatv.com/api/${target_id}/vods?page=1`;
        const response = await fetch(apiUrl, { 
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          next: { revalidate: 0 } 
        });
        if (response.ok) {
          const data = await response.json();
          const soopVideos = parseSoopVods(data.data, target_id, team_division, cutoffDate);
          allScrapedVideos = [...allScrapedVideos, ...soopVideos];
          platformsStatus[statusKey] = 'success';
        } else {
          platformsStatus[statusKey] = 'failed';
        }
      } catch (e) {
        console.error(`Error scraping SOOP BJ ${target_id}:`, e);
        platformsStatus[statusKey] = 'failed';
      }
    }
  }

  // Save parsed videos to DB (ignores duplicate source_video_id)
  const addedCount = await addVideos(allScrapedVideos);

  const success = Object.values(platformsStatus).some(status => status === 'success');

  return NextResponse.json({
    success,
    message: `${addedCount}개의 새로운 경기 영상이 동기화되었습니다.`,
    addedCount,
    scrapedTotal: allScrapedVideos.length,
    platforms: platformsStatus
  });
}
