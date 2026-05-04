import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trackId = params.id;
    const body = await request.json();
    const { userId, ipAddress } = body;

    if (!userId && !ipAddress) {
      return NextResponse.json(
        { error: 'userId или ipAddress должен быть указан' },
        { status: 400 }
      );
    }

    // Проверяем, голосовал ли пользователь за этот трек
    let query = supabaseAdmin
      .from('votes')
      .select('id')
      .eq('track_id', trackId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }

    const { data: existingVote, error: voteError } = await query.single();

    if (voteError && voteError.code !== 'PGRST116') {
      console.error('Vote check error:', voteError);
      return NextResponse.json(
        { error: 'Failed to check vote' },
        { status: 500 }
      );
    }

    if (existingVote) {
      return NextResponse.json(
        { error: 'Вы уже голосовали за этот трек' },
        { status: 400 }
      );
    }

    // Создаем голос
    const { error: insertError } = await supabaseAdmin
      .from('votes')
      .insert({
        track_id: trackId,
        user_id: userId || null,
        ip_address: ipAddress || null,
      });

    if (insertError) {
      console.error('Vote insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create vote' },
        { status: 500 }
      );
    }

    // Получаем текущее значение votes_count
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('queue')
      .select('votes_count')
      .eq('track_id', trackId)
      .eq('status', 'pending')
      .single();

    if (queueError) {
      console.error('Queue fetch error:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch queue item' },
        { status: 500 }
      );
    }

    // Обновляем votes_count
    const newVotesCount = (queueItem?.votes_count || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('queue')
      .update({ votes_count: newVotesCount })
      .eq('track_id', trackId)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Votes count update error:', updateError);
      // Не прерываем выполнение, если не удалось обновить votes_count
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Голос успешно добавлен',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
