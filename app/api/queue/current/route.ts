import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('💰 [QUEUE CURRENT] === НОВЫЙ ЗАПРОС ===');
  
  try {
    // Ищем трек со статусом 'playing' в очереди
    console.log('💰 [QUEUE CURRENT] Ищу трек со статусом playing...');
    const { data: queueItem, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        track_id,
        priority_score,
        votes_count,
        donation_id,
        tracks (
          id,
          url,
          provider,
          title,
          artist,
          thumbnail_url,
          duration
        ),
        donation:donations (
          id,
          amount,
          donor_name,
          created_at
        )
      `)
      .eq('status', 'playing')
      .single();
      
    console.log(`💰 [QUEUE CURRENT] Найден трек:`, queueItem ? `id=${queueItem.id}, status=${queueItem.status}` : 'null');

    if (error && error.code !== 'PGRST116') { // PGRST116 - это "не найдено", что ок
      console.error('Current track fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch current track' }, { status: 500 });
    }

    if (!queueItem?.tracks) {
      return NextResponse.json({
        success: true,
        currentTrack: null,
        donorInfo: null,
      });
    }

    // Извлекаем информацию о донатере
    const donorInfo = queueItem.donation && Array.isArray(queueItem.donation) && queueItem.donation.length > 0
      ? {
          name: queueItem.donation[0].donor_name || 'Аноним',
          amount: Number(queueItem.donation[0].amount),
        }
      : null;

    return NextResponse.json({
      success: true,
      currentTrack: {
        ...queueItem.tracks,
        priority_score: queueItem.priority_score,
        votes_count: queueItem.votes_count,
      },
      donorInfo,
    });
  } catch (error) {
    console.error('Current track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
