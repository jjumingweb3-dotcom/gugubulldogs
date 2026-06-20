import { NextResponse } from 'next/server';
import { updateVideo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password, id, team_division, tournament, opponent, title, win_team, lose_team, score_win, score_lose } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    const success = await updateVideo(id, {
      team_division,
      tournament,
      opponent,
      title,
      win_team: win_team?.trim() || '',
      lose_team: lose_team?.trim() || '',
      score_win: score_win !== '' && score_win !== null && score_win !== undefined ? Number(score_win) : null,
      score_lose: score_lose !== '' && score_lose !== null && score_lose !== undefined ? Number(score_lose) : null,
      parsed_status: team_division === '미분류' ? 'pending' : 'success'
    });

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '경기가 성공적으로 업데이트되었습니다.' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: '해당 경기를 데이터베이스에서 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: '업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
