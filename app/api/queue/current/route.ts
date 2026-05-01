// Mock API для быстрого запуска (без Supabase)
// Используется когда NEXT_PUBLIC_USE_MOCK=true

import { NextRequest, NextResponse } from 'next/server';
import {
  getQueue,
  getCurrentTrack,
  updateQueueStatus
} from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    // Валидация заголовков (для отладки)
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      console.warn('Request without User-Agent header');
    }

    // Получаем текущий воспроизводимый трек
    let currentTrack = getCurrentTrack();

    // Если текущий трек не найден, проверяем очередь
    if (!currentTrack) {
      const queue = getQueue();
      const playingItem = queue.find(q => q.status === 'playing');
      
      if (playingItem) {
        // Пытаемся найти трек по ID
        const { getTracks } = require('@/lib/storage');
        const tracks = getTracks();
        currentTrack = tracks.find((t: { id: string }) => t.id === playingItem.trackId) || null;
      }
    }

    // Возвращаем пустой объект если трек не найден
    if (!currentTrack) {
      return NextResponse.json(
        {
          success: true,
          currentTrack: null,
          message: 'No track currently playing',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        currentTrack,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Current track error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Обработка недопустимых методов
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
