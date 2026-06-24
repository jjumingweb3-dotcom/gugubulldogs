import { NextResponse } from 'next/server';
import { getVisitorStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 비밀번호입니다.' },
        { status: 401 }
      );
    }

    const stats = await getVisitorStats();
    return NextResponse.json({ success: true, stats });
  } catch (e) {
    console.error('Error fetching stats API:', e);
    return NextResponse.json(
      { success: false, error: '통계 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
