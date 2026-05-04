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
    console.log('🔍 [DB QUERY] Начинаю поиск треков в очереди...');
    console.log('🔍 [DB QUERY] Статус для поиска: pending');
    console.log('🔍 [DB QUERY] Таблица: queue');
    console.log('🔍 [DB QUERY] JOIN с tracks: да');
    console.log('🔍 [DB QUERY] JOIN с donations: да');
    console.log('🔍 [DB QUERY] Пагинация: offset=' + offset + ', limit=' + limit);

    // Получение очереди из таблицы queue с данными из tracks и donations
    const { data: queueItems, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        position,
        priority_score,
        votes_count,
        created_at,
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
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    // 🔍 ЛОГИРОВАНИЕ ПОСЛЕ ЗАПРОСА
    console.log('🔍 [DB QUERY] Найдено записей в БД:', queueItems?.length);
    if (error) console.error('❌ [DB QUERY] Ошибка Supabase:', error);
    console.log('🔍 [DB QUERY] queueItems:', JSON.stringify(queueItems, null, 2));

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
