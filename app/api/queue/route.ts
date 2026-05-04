import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Интерфейс для трека с данными из таблицы tracks
interface TrackData {
  id: string;
  url: string;
  provider: string;
  title: string | null;
  artist: string | null;
  thumbnail_url: string | null;
  duration: number | null;
}

// Интерфейс для трека с данными из очереди
interface QueueItem {
  id: string;
  status: string;
  position: number;
  priority_score: number;
  votes_count: number;
  created_at: string;
  tracks: TrackData | null;
  donation: {
    id: string;
    amount: number;
    donor_name: string | null;
    created_at: string;
  } | null;
}

// Интерфейс для финального трека с данными доната
interface TrackWithQueueData extends TrackData {
  queueId: string;
  status: string;
  position: number;
  priority_score: number;
  votes_count: number;
  created_at: string;
  donation: {
    id: string;
    amount: number;
    donor_name: string | null;
    created_at: string;
  } | null;
}

/**
 * Получение очереди треков с пагинацией
 * Возвращает треки из таблицы queue с данными из tracks и donations
 * Сортировка: по priority_score (descending) для приоритетной очереди
 * Фильтрация: только треки со статусом 'pending'
 */
export async function GET(request: NextRequest) {
  try {
    // Получение query параметров для пагинации
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 🔍 ЛОГИРОВАНИЕ ПЕРЕД ЗАПРОСОМ
    console.log('🔍 [SQL] Запрос к таблице queue...');
    console.log('🔍 [SQL] Фильтр по статусу: pending');
    console.log('🔍 [SQL] Текущее время:', new Date().toISOString());
    console.log('🔍 [SQL] Пагинация: offset=' + offset + ', limit=' + limit);
    console.log('🔍 [SQL] JOIN с tracks: INNER (фильтрует если track_id не найден)');
    console.log('🔍 [SQL] JOIN с donations: INNER (фильтрует если donation_id не найден)');

    // Получение очереди из таблицы queue с данными из tracks и donations
    // Используем !inner чтобы явно указать INNER JOIN (по умолчанию Supabase использует INNER JOIN)
    // Если нужно LEFT JOIN, используй !left
    const { data: queueItems, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        position,
        priority_score,
        votes_count,
        created_at,
        track_id,
        donation_id,
        tracks!inner (
          id,
          url,
          provider,
          title,
          artist,
          thumbnail_url,
          duration
        ),
        donation:donations!inner (
          id,
          amount,
          donor_name,
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
      
    console.log('🔍 [SQL] track_id и donation_id из queue:', queueItems?.map((q: any) => ({ id: q.id, track_id: q.track_id, donation_id: q.donation_id })));

    // 🔍 ЛОГИРОВАНИЕ ПОСЛЕ ЗАПРОСА
    console.log('📊 [SQL] Найдено записей:', queueItems?.length || 0);
    if (error) {
      console.error('❌ [SQL] Ошибка Supabase:', JSON.stringify(error, null, 2));
    }
    if (queueItems && queueItems.length > 0) {
      console.log('📦 [SQL] Первая запись:', JSON.stringify(queueItems[0], null, 2));
    }
    console.log('🔍 [SQL] queueItems raw:', JSON.stringify(queueItems, null, 2));

    if (error) {
      console.error('Queue fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      );
    }

    // Преобразование данных в нужный формат
    const tracks = (queueItems as unknown as QueueItem[])
      .filter((item) => item.tracks !== null)
      .map((item) => ({
        ...(item.tracks as TrackData),
        queueId: item.id,
        status: item.status,
        position: item.position,
        priority_score: item.priority_score,
        votes_count: item.votes_count,
        created_at: item.created_at,
        donation: item.donation,
      }));

    console.log(`[QUEUE DEBUG] Filtered tracks: ${tracks.length} items`);

    // Возвращаем все треки из очереди без фильтрации по метаданным
    const filteredTracks = tracks;

    console.log('RESPONSE PAYLOAD:', JSON.stringify({ success: true, tracks: filteredTracks, total: filteredTracks.length, hasMore: offset + limit < filteredTracks.length }, null, 2));

    return NextResponse.json(
      {
        success: true,
        tracks: filteredTracks,
        total: filteredTracks.length,
        hasMore: offset + limit < filteredTracks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Queue GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
