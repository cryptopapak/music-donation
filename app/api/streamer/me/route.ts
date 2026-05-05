import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Получаем streamerId из query параметров
    const { searchParams } = new URL(request.url);
    const streamerId = searchParams.get('id');

    if (!streamerId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Получаем профиль стримера
    const { data: streamer, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', streamerId)
      .single();

    if (error) {
      console.error('Streamer fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch streamer' },
        { status: 500 }
      );
    }

    if (!streamer) {
      return NextResponse.json(
        { error: 'Streamer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        streamer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Streamer me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
