import { NextResponse } from 'next/server';
import { deleteVideo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password, id } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: '삭제할 영상 ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const success = await deleteVideo(id);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '경기가 성공적으로 삭제되었습니다.' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: '해당 경기를 찾을 수 없거나 삭제에 실패했습니다.' },
        { status: 404 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
