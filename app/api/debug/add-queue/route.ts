import { NextResponse } from 'next/server';
import { addTrackToQueue } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const donationId = searchParams.get('donationId');

  if (!donationId) {
    return NextResponse.json({ error: 'Missing donationId' }, { status: 400 });
  }

  try {
    console.log(`🔧 [DEBUG] Ручное добавление трека в очередь для доната: ${donationId}`);
    await addTrackToQueue(donationId);
    return NextResponse.json({ success: true, message: 'Track added!' });
  } catch (error: any) {
    console.error('❌ [DEBUG] Ошибка:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
