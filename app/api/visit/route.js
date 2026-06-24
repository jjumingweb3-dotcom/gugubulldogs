import { NextResponse } from 'next/server';
import { logVisit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const success = await logVisit();
    return NextResponse.json({ success });
  } catch (e) {
    console.error('Error logging visit API:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
