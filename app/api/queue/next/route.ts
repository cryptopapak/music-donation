import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startPlayingTrack as dbStartPlayingTrack, getCurrentPlayingTrack } from '@/lib/database';

// Константы для AFK detection
const AFK_TIMEOUT_SECONDS = 300; // 5 минут без heartbeat
const HEARTBEAT_INTERVAL_SECONDS = 30; // Heartbeat каждые 30 секунд

/**
 * Проверяет, активен ли стример (не AFK)
 */
async function isStreamerActive(streamerId: string): Promise<boolean> {
  try {
    const { data: streamer, error } = await supabaseAdmin
      .from('users')
      .select('last_heartbeat_at')
      .eq('id', streamerId)
      .single();

    if (error || !streamer) {
      // Если нет данных о стримере, считаем его активным
      return true;
    }

    const lastHeartbeat = new Date(streamer.last_heartbeat_at).getTime();
    const now = Date.now();
    const timeSinceHeartbeat = (now - lastHeartbeat) / 1000;

    return timeSinceHeartbeat < AFK_TIMEOUT_SECONDS;
  } catch (error) {
    console.error('Error checking streamer activity:', error);
    return true; // Если ошибка, считаем стримера активным
  }
}

/**
 * Получает следующий трек из очереди
 */
async function getNextTrackFromQueue() {
  try {
    console.log('💰 [GET NEXT TRACK] === НОВЫЙ ЗАПРОС ===');
    console.log('💰 [GET NEXT TRACK] Ищу трек со статусом pending...');
    
    // Получаем следующий трек из очереди (статус 'pending', по priority_score descending)
    const { data: queueItem, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        position,
        priority_score,
        votes_count,
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
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('💰 [GET NEXT TRACK] Ошибка при получении трека:', error);
    }
    
    console.log(`💰 [GET NEXT TRACK] Найден трек:`, queueItem ? `id=${queueItem.id}, status=${queueItem.status}` : 'null');

    if (error || !queueItem) {
      console.log('💰 [GET NEXT TRACK] Трек не найден');
      return null;
    }

    return queueItem;
  } catch (error) {
    console.error('💰 [GET NEXT TRACK] Error getting next track:', error);
    return null;
  }
}

/**
 * Обновляет статус трека на 'playing' и сдвигает позиции
 * Использует функцию из lib/database.ts для централизованной логики
 */
async function startPlayingTrack(queueId: string) {
  try {
    return await dbStartPlayingTrack(queueId);
  } catch (error) {
    console.error('Error starting track:', error);
    return false;
  }
}

/**
 * Пропускает текущий трек (авто-скип AFK или вручную)
 */
async function skipCurrentTrack() {
  try {
    // Получаем текущий играющий трек
    const { data: currentQueueItem, error } = await supabaseAdmin
      .from('queue')
      .select('id')
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !currentQueueItem) {
      return false;
    }

    // Обновляем статус на 'skipped'
    const { error: updateError } = await supabaseAdmin
      .from('queue')
      .update({
        status: 'skipped',
        ended_at: new Date().toISOString(),
      })
      .eq('id', currentQueueItem.id);

    if (updateError) {
      console.error('Error skipping track:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in skipCurrentTrack:', error);
    return false;
  }
}

/**
 * Проверяет AFK и пропускает текущий трек, если стример неактивен
 */
async function checkAndSkipAFK() {
  try {
    // Получаем текущий играющий трек
    const { data: currentQueueItem, error: fetchError } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        donation_id
      `)
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !currentQueueItem) {
      return false;
    }

    // Получаем donation
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .select('user_id')
      .eq('id', currentQueueItem.donation_id)
      .single();

    if (donationError || !donation) {
      return false;
    }

    const streamerId = donation.user_id;
    if (!streamerId) {
      return false;
    }

    // Проверяем, активен ли стример
    const isActive = await isStreamerActive(streamerId);
    if (!isActive) {
      console.log(`⚠️ Стример ${streamerId} AFK, пропускаем трек`);
      await skipCurrentTrack();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkAndSkipAFK:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Только проверяем AFK и показываем следующий трек
  await checkAndSkipAFK();
  
  const nextQueueItem = await getNextTrackFromQueue();
  
  return NextResponse.json({
    success: true,
    queueItem: nextQueueItem,
    message: 'Next track info (NOT started)',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('💰 [QUEUE NEXT POST] Тело запроса:', JSON.stringify(body));
    
    const { queueId } = body;
    console.log('💰 [QUEUE NEXT POST] queueId из тела:', queueId);
    
    if (!queueId) {
      console.error('❌ [QUEUE NEXT POST] queueId не передан!');
      return NextResponse.json({ error: 'queueId required' }, { status: 400 });
    }

    // Перед запуском проверь, существует ли трек
    const { data: queueItem, error: fetchError } = await supabaseAdmin
      .from('queue')
      .select('id, status, track_id')
      .eq('id', queueId)
      .single();
    
    console.log('🔍 [QUEUE NEXT POST] Найден трек:', JSON.stringify(queueItem));
    
    if (fetchError || !queueItem) {
      console.error('❌ [QUEUE NEXT POST] Трек не найден:', fetchError);
      return NextResponse.json({ 
        error: 'Track not found',
        queueId,
        fetchError 
      }, { status: 404 });
    }
    
    if (queueItem.status !== 'pending') {
      console.error('❌ [QUEUE NEXT POST] Трек не в статусе pending:', queueItem.status);
      return NextResponse.json({ 
        error: `Track status is ${queueItem.status}, not pending` 
      }, { status: 400 });
    }

    // Теперь запускай
    const result = await startPlayingTrack(queueId);
    console.log('✅ [QUEUE NEXT POST] Трек успешно запущен!');
    
    return NextResponse.json({ success: true, queueItem });
  } catch (error: any) {
    console.error('❌ [QUEUE NEXT POST] Ошибка:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}