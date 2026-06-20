import { NextResponse } from 'next/server';
import { addVideos } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper to extract video ID from YouTube or SOOP URL
function extractVideoId(source, url) {
  if (!url) return '';
  const trimmedUrl = url.trim();
  
  if (source === 'youtube') {
    // Standard: https://www.youtube.com/watch?v=VIDEO_ID
    let match = trimmedUrl.match(/[?&]v=([^&#]+)/);
    if (match) return match[1];
    
    // Short: https://youtu.be/VIDEO_ID
    match = trimmedUrl.match(/youtu\.be\/([^?&#]+)/);
    if (match) return match[1];
    
    // Embed: https://www.youtube.com/embed/VIDEO_ID
    match = trimmedUrl.match(/embed\/([^?&#]+)/);
    if (match) return match[1];
    
    return trimmedUrl; // fallback
  } else {
    // SOOP: https://vod.sooplive.co.kr/player/1234567
    // or: https://play.sooplive.co.kr/bj_id/1234567
    const match = trimmedUrl.match(/\/(\d+)(?:\?|$)/);
    if (match) return match[1];
    
    return trimmedUrl; // fallback
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { 
      password, 
      source, 
      url, 
      title, 
      published_at, 
      team_division, 
      tournament, 
      opponent,
      home_team,
      away_team,
      home_score,
      away_score,
      win_team
    } = payload;

    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    if (!url || !title) {
      return NextResponse.json(
        { success: false, error: '영상 주소와 제목은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const sourceVideoId = extractVideoId(source, url);
    if (!sourceVideoId) {
      return NextResponse.json(
        { success: false, error: '올바른 영상 주소 형식을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const finalVideoUrl = source === 'youtube'
      ? `https://www.youtube.com/watch?v=${sourceVideoId}`
      : `https://vod.sooplive.co.kr/player/${sourceVideoId}`;

    const thumbnailUrl = source === 'youtube'
      ? `https://i.ytimg.com/vi/${sourceVideoId}/hqdefault.jpg`
      : 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800'; // Default sports placeholder for SOOP manual add

    const newVideo = {
      source,
      source_video_id: sourceVideoId,
      title: title.trim(),
      thumbnail_url: thumbnailUrl,
      published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
      url: finalVideoUrl,
      team_division: team_division || '미분류',
      tournament: tournament?.trim() || '',
      opponent: opponent?.trim() || '',
      home_team: home_team?.trim() || '',
      away_team: away_team?.trim() || '',
      home_score: home_score !== '' && home_score !== null && home_score !== undefined ? Number(home_score) : null,
      away_score: away_score !== '' && away_score !== null && away_score !== undefined ? Number(away_score) : null,
      win_team: win_team?.trim() || '',
      parsed_status: team_division === '미분류' ? 'pending' : 'success'
    };

    const addedCount = await addVideos([newVideo]);

    if (addedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: '새로운 영상이 성공적으로 수기 등록되었습니다.' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: '이미 등록된 영상이거나 저장에 실패했습니다.' },
        { status: 409 }
      );
    }
  } catch (e) {
    console.error('Error adding video manually:', e);
    return NextResponse.json(
      { success: false, error: '영상 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
