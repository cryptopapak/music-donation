import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'pending';

    console.log(`🔍 [QUEUE API] Запрос: limit=${limit}, offset=${offset}, status=${status}`);

    // Get the total count separately
    const { count, error: countError } = await supabaseAdmin
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    if (countError) {
      console.error('❌ [QUEUE API] Ошибка получения общего количества:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const { data: queueItems, error } = await supabaseAdmin
      .from('queue')
      .select(`
        *,
        tracks:track_id (id, url, title, artist, thumbnail_url),
        donation:donation_id (id, donor_name, amount)
      `)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ [QUEUE API] Ошибка Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📊 [QUEUE API] Найдено записей: ${queueItems?.length || 0}, всего: ${count || 0}`);
    
    if (queueItems && queueItems.length > 0) {
      console.log('📦 [QUEUE API] Первая запись:', JSON.stringify(queueItems[0], null, 2));
      
      // Добавляем отладочную информацию
      console.log('🔍 [DEBUG] track_id из queue:', queueItems[0].track_id);
      console.log('🔍 [DEBUG] tracks данные:', queueItems[0].tracks);
    }

    return NextResponse.json({
      success: true,
      tracks: queueItems || [],
      total: count || 0,
      hasMore: (count || 0) > (offset + (queueItems?.length || 0)),
    });
  } catch (error) {
    console.error('❌ [QUEUE API] Ошибка:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
