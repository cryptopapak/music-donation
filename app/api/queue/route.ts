import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Получение query параметров
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Валидация параметров
    if (limit < 0 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset. Must be non-negative' },
        { status: 400 }
      );
    }

    // Получение всех элементов очереди для подсчета общего количества
    const { data: queueAll, error: countError } = await supabase
      .from('queue')
      .select('id');

    let total = 0;
    if (!countError && queueAll) {
      total = queueAll.length;
    }

    // Получение треков с сортировкой и пагинацией
    // Сначала по amount (убывание), затем по created_at
    const { data: queueItems, error: queueError } = await supabase
      .from('queue')
      .select('id, position, status, started_at, ended_at, created_at, donation_id, track_id')
      .order('amount', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (queueError) {
      console.error('Queue fetch error:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      );
    }

    // Получаем все уникальные donation_id и track_id
    const donationIds = [...new Set((queueItems || []).map((item: any) => item.donation_id).filter(Boolean))];
    const trackIds = [...new Set((queueItems || []).map((item: any) => item.track_id).filter(Boolean))];

    // Получаем данные о донатах
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('id, amount, created_at')
      .in('id', donationIds);

    // Получаем данные о треках
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, url, provider, title, artist, thumbnail_url, duration')
      .in('id', trackIds);

    if (donationsError || tracksError) {
      console.error('Fetch related data error:', donationsError, tracksError);
      return NextResponse.json(
        { error: 'Failed to fetch related data' },
        { status: 500 }
      );
    }

    // Создаем мапы для быстрого поиска
    const donationMap: Record<string, any> = {};
    (donations || []).forEach((d: any) => {
      donationMap[d.id] = d;
    });

    const trackMap: Record<string, any> = {};
    (tracks || []).forEach((t: any) => {
      trackMap[t.id] = t;
    });

    // Форматирование ответа
    const formattedTracks = (queueItems || []).map((item: any) => ({
      id: item.id,
      position: item.position,
      status: item.status,
      started_at: item.started_at,
      ended_at: item.ended_at,
      created_at: item.created_at,
      donation: donationMap[item.donation_id] || null,
      track: trackMap[item.track_id] || null,
    }));

    return NextResponse.json(
      {
        success: true,
        tracks: formattedTracks,
        total,
        hasMore: offset + limit < total,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueId, status } = body;

    if (!queueId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: queueId and status' },
        { status: 400 }
      );
    }

    if (!['playing', 'played', 'skipped'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: playing, played, skipped' },
        { status: 400 }
      );
    }

    // Обновляем статус элемента очереди
    const { data: updatedQueue, error } = await supabase
      .from('queue')
      .update({
        status,
        started_at: status === 'playing' ? new Date().toISOString() : null,
        ended_at: status === 'played' ? new Date().toISOString() : null,
      })
      .eq('id', queueId)
      .select()
      .single();

    if (error) {
      console.error('Queue update error:', error);
      return NextResponse.json(
        { error: 'Failed to update queue item' },
        { status: 500 }
      );
    }

    if (!updatedQueue) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        queueItem: updatedQueue,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Queue PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
