import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      console.error('Next track fetch error:', error);
      return null;
    }

    return queueItem;
  } catch (error) {
    console.error('Error getting next track:', error);
    return null;
  }
}

/**
 * Обновляет статус трека на 'playing' и сдвигает позиции
 */
async function startPlayingTrack(queueId: string) {
  try {
    // 1. Останавливаем всё, что сейчас играет
    await supabaseAdmin
      .from('queue')
      .update({
        status: 'played',
        ended_at: new Date().toISOString()
      })
      .eq('status', 'playing');

    // 2. Запускаем новый трек
    const { error } = await supabaseAdmin
      .from('queue')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (error) {
      console.error('Error updating track status:', error);
      return false;
    }

    return true;
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
  try {
    // Проверяем AFK и пропускаем текущий трек, если стример неактивен
    const skippedAFK = await checkAndSkipAFK();

    // Получаем следующий трек из очереди
    const nextQueueItem = await getNextTrackFromQueue();

    if (!nextQueueItem) {
      return NextResponse.json(
        { 
          success: true,
          queueItem: null,
          message: skippedAFK ? 'Previous track skipped (AFK)' : 'Queue is empty',
        },
        { status: 200 }
      );
    }

    // Обновляем статус трека на 'playing'
    const started = await startPlayingTrack(nextQueueItem.id);

    if (!started) {
      return NextResponse.json(
        { error: 'Failed to start track' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        queueItem: nextQueueItem,
        message: skippedAFK ? 'Previous track skipped (AFK), starting next' : 'Starting next track',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Next queue item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
