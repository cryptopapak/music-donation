import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Получаем streamerId из query параметров
    const { searchParams } = new URL(request.url);
    const streamerId = searchParams.get('id');
    const period = searchParams.get('period') || 'day'; // day, week, month

    if (!streamerId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Определяем период
    let dateFilter: string;
    switch (period) {
      case 'week':
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'day':
      default:
        dateFilter = "created_at >= NOW() - INTERVAL '1 day'";
        break;
    }

    // Получаем статистику донатов
    const { data: donations, error: donationsError } = await supabaseAdmin
      .from('donations')
      .select('amount, created_at')
      .eq('user_id', streamerId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // last 24 hours

    if (donationsError) {
      console.error('Donations fetch error:', donationsError);
      return NextResponse.json(
        { error: 'Failed to fetch donations' },
        { status: 500 }
      );
    }

    // Подсчитываем статистику
    const totalDonations = donations?.length || 0;
    const totalAmount = donations?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
    const avgDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

    // Получаем количество треков в очереди
    const { count: queueCount, error: queueError } = await supabaseAdmin
      .from('queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending');

    if (queueError) {
      console.error('Queue count fetch error:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch queue count' },
        { status: 500 }
      );
    }

    // Получаем количество треков за период
    const { data: tracks, error: tracksError } = await supabaseAdmin
      .from('queue')
      .select('id, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (tracksError) {
      console.error('Tracks fetch error:', tracksError);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    const totalTracks = tracks?.length || 0;

    return NextResponse.json(
      {
        success: true,
        stats: {
          period,
          totalDonations,
          totalAmount,
          avgDonation,
          queueCount: queueCount || 0,
          totalTracks,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Streamer stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
