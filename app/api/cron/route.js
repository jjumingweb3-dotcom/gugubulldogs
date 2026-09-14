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
      const division = detectDivision(title, teamDivision);
      
      videos.push({
        source: 'youtube',
        source_video_id: sourceVideoId,
        title,
        thumbnail_url: thumbnailUrl,
        published_at: publishedAt.toISOString(),
        url: `https://www.youtube.com/watch?v=${sourceVideoId}`,
        team_division: division,
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

// Clean and extract handle or channel ID from any YouTube input (URL, handle, or ID)
function normalizeYoutubeTarget(input) {
  if (!input) return '';
  let str = input.trim();
  
  if (str.includes('youtube.com') || str.includes('youtu.be')) {
    try {
      const urlObj = new URL(str.startsWith('http') ? str : `https://${str}`);
      const pathname = decodeURIComponent(urlObj.pathname);
      const channelMatch = pathname.match(/channel\/(UC[A-Za-z0-9_-]{22})/);
      if (channelMatch) return channelMatch[1];
      const handleMatch = pathname.match(/@([^/?#]+)/);
      if (handleMatch) return `@${handleMatch[1]}`;
    } catch (e) {
      console.error('Error parsing YouTube URL:', str, e);
    }
  }

  if (/^UC[A-Za-z0-9_-]{22}$/.test(str)) {
    return str;
  }

  if (str.startsWith('@')) {
    return str;
  }

  return `@${str}`;
}

// Dynamically resolve YouTube Handle/URL/ID to Channel ID
async function resolveYtChannelId(target) {
  try {
    const normalized = normalizeYoutubeTarget(target);
    if (/^UC[A-Za-z0-9_-]{22}$/.test(normalized)) {
      return normalized;
    }
    
    const formattedHandle = normalized.startsWith('@') ? normalized : `@${normalized}`;
    const url = `https://www.youtube.com/${encodeURIComponent(formattedHandle)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    if (!response.ok) {
      console.warn(`[resolveYtChannelId] Failed to fetch handle page for ${target}, status: ${response.status}`);
      return null;
    }
    const html = await response.text();
    const match = html.match(/channel\/(UC[A-Za-z0-9_-]{22})/) ||
                  html.match(/"browseId":"(UC[A-Za-z0-9_-]{22})"/) ||
                  html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) ||
                  html.match(/feeds\/videos\.xml\?channel_id=(UC[A-Za-z0-9_-]{22})/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('Failed to resolve channel ID for', target, e);
    return null;
  }
}

// Auto detect team division from title if present
function detectDivision(title, defaultDivision) {
  if (!title) return defaultDivision;
  // Remove known channel name to prevent false positive on '유소년'
  const cleanTitle = title.replace(/구구불독스유소년야구중계TV/gi, '');
  if (cleanTitle.includes('꿈나무A') || cleanTitle.includes('꿈나무 A')) return '꿈나무A';
  if (cleanTitle.includes('꿈나무B') || cleanTitle.includes('꿈나무 B')) return '꿈나무B';
  if (cleanTitle.includes('새싹부') || cleanTitle.includes('새싹')) return '새싹부';
  if (cleanTitle.includes('유소년부') || cleanTitle.includes('유소년')) return '유소년부';
  if (cleanTitle.includes('꿈나무부') || cleanTitle.includes('꿈나무')) return '꿈나무부';
  return defaultDivision || '미분류';
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

// Scrape YouTube tab (videos or streams)
async function scrapeYoutubeTab(url, teamDivision, cutoffDate = CUTOFF_DATE, existingVideos = []) {
  const videos = [...existingVideos];
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      console.warn(`[YouTube Scraper] Tab fetch failed (${url}) status: ${response.status}`);
      return videos;
    }
    const html = await response.text();
    const dataRegex = /var ytInitialData = ({[\s\S]*?});<\/script>/;
    const match = html.match(dataRegex);
    if (!match) return videos;

    const jsonData = JSON.parse(match[1]);
    const tabs = jsonData.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs) return videos;

    for (const tab of tabs) {
      const contents = tab.tabRenderer?.content?.richGridRenderer?.contents;
      if (!contents) continue;

      for (const item of contents) {
        const richItem = item.richItemRenderer;
        if (!richItem) continue;
        const lockup = richItem.content?.lockupViewModel;
        if (!lockup) continue;

        const videoId = lockup.contentId;
        const videoTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content;

        let relativeTime = '';
        const rows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        if (rows) {
          for (const row of rows) {
            if (row.metadataParts) {
              for (const part of row.metadataParts) {
                const text = part.text?.content || '';
                if (text.includes('전') || text.includes('스트리밍') || text.includes('시청')) {
                  relativeTime = text;
                }
              }
            }
          }
        }

        if (videoId && videoTitle) {
          const publishedAt = parseRelativeDate(relativeTime);
          if (publishedAt < cutoffDate) continue;

          if (!videos.some(v => v.source_video_id === videoId)) {
            const detectedDiv = detectDivision(videoTitle, teamDivision);
            videos.push({
              source: 'youtube',
              source_video_id: videoId,
              title: videoTitle.trim(),
              thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              published_at: publishedAt.toISOString(),
              url: `https://www.youtube.com/watch?v=${videoId}`,
              team_division: detectedDiv,
              tournament: extractTournament(videoTitle),
              opponent: extractOpponent(videoTitle),
              parsed_status: 'success'
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[YouTube Scraper] Error scraping ${url}:`, err);
  }
  return videos;
}

// Scrape YouTube channel (both streams and videos tabs)
async function scrapeYoutubeHtml(channelId, teamDivision, cutoffDate = CUTOFF_DATE) {
  let videos = [];
  // 1. Scrape streams tab (실시간 경기 중계 다시보기가 위치하는 핵심 탭)
  const streamsUrl = `https://www.youtube.com/channel/${channelId}/streams`;
  videos = await scrapeYoutubeTab(streamsUrl, teamDivision, cutoffDate, videos);

  // 2. Scrape videos tab (일반 업로드 영상)
  const videosUrl = `https://www.youtube.com/channel/${channelId}/videos`;
  videos = await scrapeYoutubeTab(videosUrl, teamDivision, cutoffDate, videos);

  return videos;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || searchParams.get('startDate');
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  let cutoffDate = CUTOFF_DATE;
  if (dateParam) {
    const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const parsed = new Date(`${dateParam}T00:00:00+09:00`);
      if (!isNaN(parsed.getTime())) {
        cutoffDate = parsed;
      }
    }
  } else if (yearParam && monthParam) {
    const y = parseInt(yearParam, 10);
    const m = parseInt(monthParam, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      const monthStr = String(m).padStart(2, '0');
      cutoffDate = new Date(`${y}-${monthStr}-01T00:00:00+09:00`);
    }
  }

  console.log(`[Sync Cron] Cutoff Date: ${cutoffDate.toISOString()} (KST 기준: ${cutoffDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);

  // Fetch crawl targets from DB
  const { targets } = await getCrawlTargets();
  
  let allScrapedVideos = [];
  const platformsStatus = {};

  for (const target of targets) {
    const { platform, target_id, team_division } = target;
    const statusKey = `${platform}_${team_division}_${target_id}`;
    
    if (platform === 'youtube') {
      try {
        const channelId = await resolveYtChannelId(target_id);
        if (!channelId) {
          console.warn(`[YouTube Scraper] Could not resolve channel ID for target: ${target_id}`);
          platformsStatus[statusKey] = 'failed';
          continue;
        }

        console.log(`[YouTube Scraper] Scraping channel ${channelId} for target ${target_id}`);
        let targetVideos = [];

        // 1. Scrape streams & videos tabs via HTML scraping (captures live match replays)
        try {
          const htmlVideos = await scrapeYoutubeHtml(channelId, team_division, cutoffDate);
          targetVideos = [...targetVideos, ...htmlVideos];
        } catch (htmlErr) {
          console.error(`[YouTube Scraper] HTML scraping failed for ${channelId}:`, htmlErr);
        }

        // 2. Try RSS feed for latest uploaded videos
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
            for (const v of ytVideos) {
              if (!targetVideos.some(tv => tv.source_video_id === v.source_video_id)) {
                targetVideos.push(v);
              }
            }
          }
        } catch (rssErr) {
          console.error(`YouTube RSS failed for ${channelId}:`, rssErr);
        }

        if (targetVideos.length > 0) {
          allScrapedVideos = [...allScrapedVideos, ...targetVideos];
        }

        platformsStatus[statusKey] = 'success';
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
    cutoffDate: cutoffDate.toISOString(),
    platforms: platformsStatus
  });
}
