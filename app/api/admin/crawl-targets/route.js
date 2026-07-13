import { NextResponse } from 'next/server';
import { getCrawlTargets, addCrawlTarget, deleteCrawlTarget } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { password, action, id, platform, target_id, team_division, memo } = payload;
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    if (action === 'list') {
      const result = await getCrawlTargets();
      return NextResponse.json({ 
        success: true, 
        targets: result.targets, 
        isTableMissing: result.isTableMissing 
      });
    }

    if (action === 'add') {
      if (!platform || !target_id || !team_division) {
        return NextResponse.json(
          { success: false, error: '플랫폼, 대상 ID, 부서 분류는 필수 입력 항목입니다.' },
          { status: 400 }
        );
      }
      
      const success = await addCrawlTarget(platform, target_id, team_division, memo);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: '수집 채널이 성공적으로 추가되었습니다.' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: '수집 채널 추가에 실패했습니다. DB 상태를 확인하세요.' },
          { status: 500 }
        );
      }
    }

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json(
          { success: false, error: '삭제할 대상 ID가 누락되었습니다.' },
          { status: 400 }
        );
      }
      
      const success = await deleteCrawlTarget(id);
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: '수집 채널이 성공적으로 제거되었습니다.' 
        });
      } else {
        return NextResponse.json(
          { success: false, error: '수집 채널 삭제에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: '올바르지 않은 작업 구분(action)입니다.' },
      { status: 400 }
    );
  } catch (e) {
    console.error('Crawl targets API error:', e);
    return NextResponse.json(
      { success: false, error: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
