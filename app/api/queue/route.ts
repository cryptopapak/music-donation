import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const streamerId = searchParams.get('streamerId');

    console.log(`🔍 [QUEUE API] Запрос: limit=${limit}, offset=${offset}, streamerId=${streamerId}`);

    // Temporarily disable streamer_id validation as the column may not exist in the table
    // if (!streamerId) {
    //   console.error('❌ [QUEUE API] streamerId is required');
    //   return NextResponse.json({ error: 'streamerId is required' }, { status: 400 });
    // }

    // Get the total count separately
    const queryBuilder = supabaseAdmin.from('queue').select('*', { count: 'exact', head: true });
    
    if (streamerId) {
      queryBuilder.eq('streamer_id', streamerId);
    }
    queryBuilder.in('status', ['pending', 'playing']);

    const { count, error: countError } = await queryBuilder;

    if (countError) {
      console.error('❌ [QUEUE API] Ошибка получения общего количества:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Build main query
    const mainQuery = supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        created_at,
        tracks:track_id (id, url, title, artist, thumbnail_url),
        donation:donation_id (id, donor_name, amount)
      `)
      .in('status', ['pending', 'playing'])
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (streamerId) {
      mainQuery.eq('streamer_id', streamerId);
    }

    const { data: queueItems, error } = await mainQuery;

    if (error) {
      console.error('❌ [QUEUE API] Ошибка Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📊 [QUEUE API] Найдено записей: ${queueItems?.length || 0}, всего: ${count || 0}`);
    
    if (queueItems && queueItems.length > 0) {
      console.log('📦 [QUEUE API] Первая запись:', JSON.stringify(queueItems[0], null, 2));
      
      // Добавляем отладочную информацию
      // Remove debug log since track_id is not directly accessible after join
      // console.log('🔍 [DEBUG] track_id из queue:', queueItems[0].track_id);
      console.log('🔍 [DEBUG] tracks данные:', queueItems[0].tracks);
    }

    return NextResponse.json(
      { tracks: queueItems || [] },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  } catch (error) {
    console.error('❌ [QUEUE API] Ошибка:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
