import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const AFK_TIMEOUT_SECONDS = 300;

async function isStreamerActive(streamerId: string): Promise<boolean> {
  try {
    const { data: streamer, error } = await supabaseAdmin
      .from('users')
      .select('last_heartbeat_at')
      .eq('id', streamerId)
      .single();

    if (error || !streamer) return true;

    const timeSinceHeartbeat = (Date.now() - new Date(streamer.last_heartbeat_at).getTime()) / 1000;
    return timeSinceHeartbeat < AFK_TIMEOUT_SECONDS;
  } catch {
    return true;
  }
}

async function getNextTrackFromQueue(streamerId: string | null) {
  try {
    // ✅ Переприсваиваем queryBuilder — иначе eq/order не применяются
    let query = supabaseAdmin
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
      .limit(1);

    if (streamerId) {
      query = query.eq('streamer_id', streamerId);
    }

    const { data: queueItem, error } = await query.single();

    if (error || !queueItem) return null;
    return queueItem;
  } catch {
    return null;
  }
}

async function skipCurrentTrack() {
  try {
    const { data: currentQueueItem, error } = await supabaseAdmin
      .from('queue')
      .select('id')
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !currentQueueItem) return false;

    const { error: updateError } = await supabaseAdmin
      .from('queue')
      .update({ status: 'skipped', ended_at: new Date().toISOString() })
      .eq('id', currentQueueItem.id);

    return !updateError;
  } catch {
    return false;
  }
}

async function checkAndSkipAFK() {
  try {
    const { data: currentQueueItem, error: fetchError } = await supabaseAdmin
      .from('queue')
      .select('id, donation_id')
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !currentQueueItem) return false;

    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .select('user_id')
      .eq('id', currentQueueItem.donation_id)
      .single();

    if (donationError || !donation?.user_id) return false;

    const isActive = await isStreamerActive(donation.user_id);
    if (!isActive) {
      console.log(`⚠️ Стример AFK, пропускаем трек`);
      await skipCurrentTrack();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const streamerId = new URL(request.url).searchParams.get('streamerId');

  await checkAndSkipAFK();
  const nextQueueItem = await getNextTrackFromQueue(streamerId);

  return NextResponse.json({
    success: true,
    queueItem: nextQueueItem,
    message: 'Next track info (NOT started)',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ✅ queueId — это ID записи в таблице queue, НЕ track.id
    const { queueId, streamerId } = body;

    console.log('💰 [QUEUE NEXT POST] queueId:', queueId, 'streamerId:', streamerId);

    if (!queueId) {
      return NextResponse.json({ error: 'queueId required' }, { status: 400 });
    }

    // ✅ Переприсваиваем query при добавлении фильтров
    let fetchQuery = supabaseAdmin
      .from('queue')
      .select('id, status, track_id')
      .eq('id', queueId);

    if (streamerId) {
      fetchQuery = fetchQuery.eq('streamer_id', streamerId);
    }

    const { data: queueItem, error: fetchError } = await fetchQuery.single();

    if (fetchError || !queueItem) {
      console.error('❌ [QUEUE NEXT POST] Трек не найден:', fetchError);
      return NextResponse.json({ error: 'Track not found', queueId }, { status: 404 });
    }

    if (queueItem.status !== 'pending') {
      return NextResponse.json({
        error: queueItem.status === 'playing'
          ? 'Трек уже воспроизводится'
          : 'Трек уже воспроизведён',
        currentStatus: queueItem.status,
        action: 'refresh_queue',
      }, { status: 400 });
    }

    // ✅ Атомарный апдейт: .eq('status', 'pending') защищает от race condition
    let updateQuery = supabaseAdmin
      .from('queue')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)
      .eq('status', 'pending');

    if (streamerId) {
      updateQuery = updateQuery.eq('streamer_id', streamerId);
    }

    const { data: updatedTrack } = await updateQuery.select().single();

    if (!updatedTrack) {
      return NextResponse.json(
        { error: 'Track status changed during update', shouldRefresh: true },
        { status: 409 }
      );
    }

    // Завершаем предыдущий playing трек (исключая только что запущенный)
    await supabaseAdmin
      .from('queue')
      .update({ status: 'played', ended_at: new Date().toISOString() })
      .eq('status', 'playing')
      .neq('id', queueId);

    console.log('✅ [QUEUE NEXT POST] Трек запущен:', queueId);
    return NextResponse.json({ success: true, queueItem: updatedTrack });

  } catch (error: any) {
    console.error('❌ [QUEUE NEXT POST] Ошибка:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
