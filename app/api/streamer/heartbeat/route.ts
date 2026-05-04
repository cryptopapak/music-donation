import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Константы для AFK detection
const AFK_TIMEOUT_SECONDS = 300; // 5 минут без heartbeat
const HEARTBEAT_INTERVAL_SECONDS = 30; // Heartbeat каждые 30 секунд

/**
 * Обновляет last_heartbeat_at для стримера
 */
async function updateHeartbeat(streamerId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq('id', streamerId);

    if (error) {
      console.error('Error updating heartbeat:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateHeartbeat:', error);
    return false;
  }
}

/**
 * Получает текущий играющий трек
 */
async function getCurrentTrack() {
  try {
    const { data: queueItem, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
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
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Current track fetch error:', error);
      return null;
    }

    return queueItem;
  } catch (error) {
    console.error('Error getting current track:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamerId } = body;

    if (!streamerId) {
      return NextResponse.json(
        { error: 'streamerId is required' },
        { status: 400 }
      );
    }

    // Обновляем heartbeat
    const updated = await updateHeartbeat(streamerId);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    // Получаем текущий играющий трек
    const currentTrack = await getCurrentTrack();

    return NextResponse.json(
      {
        success: true,
        message: 'Heartbeat received',
        streamerId,
        currentTrack,
        afkTimeoutSeconds: AFK_TIMEOUT_SECONDS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
