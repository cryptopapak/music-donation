import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Ищем трек со статусом 'playing' в очереди
    const { data: queueItem, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        track_id,
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
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 - это "не найдено", что ок
      console.error('Current track fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch current track' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      currentTrack: queueItem?.tracks || null,
    });
  } catch (error) {
    console.error('Current track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
