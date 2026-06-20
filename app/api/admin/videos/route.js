import { NextResponse } from 'next/server';
import { getVideos } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234'; // Default admin password is '1234' for local testing

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    const videos = await getVideos();
    return NextResponse.json({ success: true, videos });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: '데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
