import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const streamerId = searchParams.get('streamerId');

    console.log(`🔍 [QUEUE API] limit=${limit}, offset=${offset}, streamerId=${streamerId}`);

    // ✅ Переприсваиваем при каждом .eq() — иначе фильтры теряются
    let countQuery = supabaseAdmin
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'playing']);

    if (streamerId) {
      countQuery = countQuery.eq('streamer_id', streamerId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ [QUEUE API] Ошибка count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // ✅ Переприсваиваем mainQuery при добавлении фильтров
    let mainQuery = supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        created_at,
        tracks:track_id (id, url, title, artist, thumbnail_url),
        donation:donation_id (id, donor_name, amount)
      `)
      .in('status', ['pending', 'playing'])
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (streamerId) {
      mainQuery = mainQuery.eq('streamer_id', streamerId);
    }

    const { data: queueItems, error } = await mainQuery;

    if (error) {
      console.error('❌ [QUEUE API] Ошибка Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📊 [QUEUE API] Найдено: ${queueItems?.length || 0} из ${count || 0}`);

    return NextResponse.json(
      { tracks: queueItems || [], total: count || 0 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('❌ [QUEUE API] Ошибка:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
