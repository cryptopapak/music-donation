import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamerId, settings } = body;

    if (!streamerId) {
      return NextResponse.json(
        { error: 'streamerId is required' },
        { status: 400 }
      );
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'settings is required' },
        { status: 400 }
      );
    }

    // Обновляем настройки стримера
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        settings: settings,
      })
      .eq('id', streamerId);

    if (error) {
      console.error('Settings update error:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Settings updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
