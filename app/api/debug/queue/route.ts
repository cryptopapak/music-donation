import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    console.log('🔍 [DEBUG QUEUE] Начинаю проверку таблицы queue...');

    // Проверка 1: Все записи из queue без JOIN
    const { data: allQueue, error: queueError } = await supabaseAdmin
      .from('queue')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG QUEUE] Все записи из queue:', JSON.stringify(allQueue, null, 2));
    if (queueError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при получении queue:', JSON.stringify(queueError, null, 2));
    }

    // Проверка 2: Записи со статусом 'pending'
    const { data: pendingQueue, error: pendingError } = await supabaseAdmin
      .from('queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG QUEUE] Записи со статусом pending:', JSON.stringify(pendingQueue, null, 2));
    if (pendingError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при получении pending queue:', JSON.stringify(pendingError, null, 2));
    }

    // Проверка 3: JOIN с tracks
    const { data: queueWithTracks, error: tracksError } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        track_id,
        tracks (
          id,
          url,
          title,
          artist
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG QUEUE] JOIN с tracks:', JSON.stringify(queueWithTracks, null, 2));
    if (tracksError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при JOIN с tracks:', JSON.stringify(tracksError, null, 2));
    }

    // Проверка 4: JOIN с donations
    const { data: queueWithDonations, error: donationsError } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        donation_id,
        donations (
          id,
          amount,
          donor_name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG QUEUE] JOIN с donations:', JSON.stringify(queueWithDonations, null, 2));
    if (donationsError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при JOIN с donations:', JSON.stringify(donationsError, null, 2));
    }

    // Проверка 5: Проверка существующих треков
    const { data: allTracks, error: tracksFetchError } = await supabaseAdmin
      .from('tracks')
      .select('id, url, title');

    console.log('🔍 [DEBUG QUEUE] Все треки в tracks:', JSON.stringify(allTracks, null, 2));
    if (tracksFetchError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при получении tracks:', JSON.stringify(tracksFetchError, null, 2));
    }

    // Проверка 6: Проверка существующих донатов
    const { data: allDonations, error: donationsFetchError } = await supabaseAdmin
      .from('donations')
      .select('id, amount, donor_name, status');

    console.log('🔍 [DEBUG QUEUE] Все донаты в donations:', JSON.stringify(allDonations, null, 2));
    if (donationsFetchError) {
      console.error('❌ [DEBUG QUEUE] Ошибка при получении donations:', JSON.stringify(donationsFetchError, null, 2));
    }

    return NextResponse.json({
      success: true,
      allQueue: allQueue || [],
      pendingQueue: pendingQueue || [],
      queueWithTracks: queueWithTracks || [],
      queueWithDonations: queueWithDonations || [],
      allTracks: allTracks || [],
      allDonations: allDonations || [],
    });
  } catch (error: any) {
    console.error('❌ [DEBUG QUEUE] Критическая ошибка:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
