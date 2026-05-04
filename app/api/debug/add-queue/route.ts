import { NextResponse } from 'next/server';
import { addTrackToQueue } from '@/lib/database';

export async function POST(request: Request) {
  // Только для разработки!
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
  }

  const { donationId } = await request.json();
  
  if (!donationId) {
    return NextResponse.json({ error: 'donationId required' }, { status: 400 });
  }

  try {
    console.log(`🔧 [DEBUG] Ручное добавление в очередь: donationId=${donationId}`);
    await addTrackToQueue(donationId);
    console.log(`✅ [DEBUG] Трек добавлен!`);
    return NextResponse.json({ success: true, message: 'Track added to queue' });
  } catch (error) {
    console.error(`❌ [DEBUG] Ошибка:`, error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
