import { NextResponse } from 'next/server';
import { addVideos } from '@/lib/db';

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
function parseYouTubeRss(xmlText, teamDivision) {
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

      // Apply April 2026 date filter
      if (publishedAt < CUTOFF_DATE) {
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
function parseSoopVods(vodArray, bjId, teamDivision) {
  const videos = [];
  
  if (!Array.isArray(vodArray)) return videos;

  for (const item of vodArray) {
    const titleNo = item.title_no;
    const title = item.title_name;
    const regDate = item.reg_date;
    const publishedAt = parseSoopDate(regDate);

    // Apply April 2026 date filter
    if (publishedAt < CUTOFF_DATE) {
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
async function resolveYtChannelId(handle) {
  try {
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const url = `https://www.youtube.com/${encodeURIComponent(formattedHandle)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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

export async function GET() {
  const youtubeHandle = process.env.YOUTUBE_CHANNEL_HANDLE || '@구구불독스유소년야구';
  const youtubeChannelIdOverride = process.env.YOUTUBE_CHANNEL_ID || 'UCDTAqwh48UIZgczSQYTtFHw'; // Fallback verified channel ID
  const soopNewBjId = process.env.SOOP_NEW_BJ_ID || 'pik7688';      // U9 새싹부
  const soopOldBjId = process.env.SOOP_OLD_BJ_ID || 'ncoolpis1245';  // U13 유소년부
  
  let allScrapedVideos = [];
  let youtubeSuccess = false;
  let soopNewSuccess = false;
  let soopOldSuccess = false;

  // 1. YouTube Scraping (꿈나무부)
  try {
    let channelId = youtubeChannelIdOverride;
    
    // Resolve handle if needed
    if (!channelId && youtubeHandle) {
      channelId = await resolveYtChannelId(youtubeHandle);
    }
    
    if (channelId) {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const response = await fetch(rssUrl, { next: { revalidate: 0 } });
      if (response.ok) {
        const xmlText = await response.text();
        const ytVideos = parseYouTubeRss(xmlText, '꿈나무부');
        allScrapedVideos = [...allScrapedVideos, ...ytVideos];
        youtubeSuccess = true;
      }
    }
  } catch (e) {
    console.error('Error fetching YouTube RSS for 꿈나무부:', e);
  }

  // 2. SOOP Scraping - 새싹부 (pik7688)
  try {
    const apiUrl = `https://bjapi.afreecatv.com/api/${soopNewBjId}/vods?page=1`;
    const response = await fetch(apiUrl, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      next: { revalidate: 0 } 
    });
    if (response.ok) {
      const data = await response.json();
      const soopVideos = parseSoopVods(data.data, soopNewBjId, '새싹부');
      allScrapedVideos = [...allScrapedVideos, ...soopVideos];
      soopNewSuccess = true;
    }
  } catch (e) {
    console.error('Error fetching SOOP VODs for 새싹부:', e);
  }

  // 3. SOOP Scraping - 유소년부 (ncoolpis1245)
  try {
    const apiUrl = `https://bjapi.afreecatv.com/api/${soopOldBjId}/vods?page=1`;
    const response = await fetch(apiUrl, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      next: { revalidate: 0 } 
    });
    if (response.ok) {
      const data = await response.json();
      const soopVideos = parseSoopVods(data.data, soopOldBjId, '유소년부');
      allScrapedVideos = [...allScrapedVideos, ...soopVideos];
      soopOldSuccess = true;
    }
  } catch (e) {
    console.error('Error fetching SOOP VODs for 유소년부:', e);
  }

  // Save parsed videos to DB (ignores duplicate source_video_id)
  const addedCount = await addVideos(allScrapedVideos);

  return NextResponse.json({
    success: youtubeSuccess || soopNewSuccess || soopOldSuccess,
    message: `${addedCount}개의 새로운 경기 영상이 동기화되었습니다.`,
    addedCount,
    scrapedTotal: allScrapedVideos.length,
    platforms: {
      youtube_꿈나무부: youtubeSuccess ? 'success' : 'failed',
      soop_새싹부: soopNewSuccess ? 'success' : 'failed',
      soop_유소년부: soopOldSuccess ? 'success' : 'failed'
    }
  });
}
