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
    created_at: string;
  } | null;
}

/**
 * Получение очереди треков с пагинацией
 * Возвращает треки из таблицы queue с данными из tracks
 * Сортировка: по priority_score (descending) для приоритетной очереди
 */
export async function GET(request: NextRequest) {
  try {
    // Получение query параметров для пагинации
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Получение очереди из таблицы queue с данными из tracks
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
        )
      `)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Queue fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      );
    }

    // Получение общего количества треков
    const { count: totalCount } = await supabaseAdmin
      .from('queue')
      .select('*', { count: 'exact', head: true });

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
      }));

    // Фильтрация треков без метаданных (исключаем треки с title=NULL, пустым title и provider='yookassa')
    const filteredTracks = tracks.filter(
      (track) =>
        track.title !== null &&
        track.title !== '' &&
        track.provider !== 'yookassa'
    );

    // Добавление donation данных
    const tracksWithDonations = (await Promise.all(
      filteredTracks.map(async (track) => {
        const { data: queueItem } = await supabaseAdmin
          .from('queue')
          .select('donation_id')
          .eq('id', track.queueId)
          .single();

        if (queueItem?.donation_id) {
          const { data: donation } = await supabaseAdmin
            .from('donations')
            .select('id, amount, created_at')
            .eq('id', queueItem.donation_id)
            .single();

          return {
            ...track,
            donation: donation || null,
          };
        }

        return {
          ...track,
          donation: null,
        };
      })
    )) as TrackWithQueueData[];

    return NextResponse.json(
      {
        success: true,
        tracks: tracksWithDonations,
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
