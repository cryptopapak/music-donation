import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 [DEBUG PLAY] Тело запроса:', JSON.stringify(body));

    const { queueId } = body;
    console.log('🔍 [DEBUG PLAY] queueId из тела:', queueId);

    if (!queueId) {
      console.error('❌ [DEBUG PLAY] queueId не передан!');
      return NextResponse.json({ 
        error: 'queueId required',
        success: false
      }, { status: 400 });
    }

    // Проверяем существование трека в очереди
    const { data: queueItem, error: fetchError } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        track_id,
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
        donation (
          id,
          amount,
          donor_name
        )
      `)
      .eq('id', queueId)
      .single();

    console.log('🔍 [DEBUG PLAY] Найден трек:', JSON.stringify(queueItem));
    console.log('🔍 [DEBUG PLAY] Ошибка при поиске:', fetchError);

    if (fetchError || !queueItem) {
      console.error('❌ [DEBUG PLAY] Трек не найден:', fetchError);
      return NextResponse.json({ 
        error: 'Track not found',
        queueId,
        fetchError,
        success: false
      }, { status: 404 });
    }

    // Проверяем статус трека
    const statusInfo = {
      currentStatus: queueItem.status,
      possibleIssues: [] as string[],
      isPlayable: false
    };

    if (queueItem.status === 'pending') {
      statusInfo.isPlayable = true;
    } else if (queueItem.status === 'playing') {
      statusInfo.possibleIssues.push('Track is already playing');
    } else if (queueItem.status === 'played') {
      statusInfo.possibleIssues.push('Track has already been played');
    } else if (queueItem.status === 'skipped') {
      statusInfo.possibleIssues.push('Track was skipped');
    } else {
      statusInfo.possibleIssues.push(`Unknown status: ${queueItem.status}`);
    }

    // Проверяем, есть ли другие треки в статусе playing
    const { count: playingCount, error: playingCountError } = await supabaseAdmin
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'playing');

    console.log('🔍 [DEBUG PLAY] Количество треков в статусе playing:', playingCount);

    return NextResponse.json({
      success: true,
      queueId,
      trackFound: !!queueItem,
      queueItem: queueItem,
      statusInfo,
      playingTracksCount: playingCount || 0,
      message: 'Debug info retrieved successfully'
    });
  } catch (error: any) {
    console.error('❌ [DEBUG PLAY] Ошибка:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false
    }, { status: 500 });
  }
}