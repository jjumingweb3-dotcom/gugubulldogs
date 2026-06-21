import { NextResponse } from 'next/server';
import { getTournaments, addTournament, deleteTournament } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getTournaments();
    return NextResponse.json({ success: true, tournaments: list });
  } catch (e) {
    return NextResponse.json({ success: false, error: '대회 목록을 가져오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { password, name } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, error: '인증에 실패했습니다.' }, { status: 401 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: '대회 이름을 입력해주세요.' }, { status: 400 });
    }

    const success = await addTournament(name);
    if (success) {
      return NextResponse.json({ success: true, message: '대회가 성공적으로 생성되었습니다.' });
    } else {
      return NextResponse.json({ success: false, error: '이미 존재하는 대회명이거나 생성에 실패했습니다.' }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: '대회 생성 오류' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { password, name } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, error: '인증에 실패했습니다.' }, { status: 401 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: '삭제할 대회 이름이 누락되었습니다.' }, { status: 400 });
    }

    const success = await deleteTournament(name);
    if (success) {
      return NextResponse.json({ success: true, message: '대회가 목록에서 성공적으로 제거되었습니다.' });
    } else {
      return NextResponse.json({ success: false, error: '대회 삭제에 실패했습니다.' }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: '대회 삭제 오류' }, { status: 500 });
  }
}
