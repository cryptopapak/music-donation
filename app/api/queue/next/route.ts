// Mock API для быстрого запуска (без Supabase)
// Используется когда NEXT_PUBLIC_USE_MOCK=true

import { NextRequest, NextResponse } from 'next/server';
import { 
  getQueue
} from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    // Получаем следующий элемент очереди
    const queue = getQueue();
    const nextItem = queue.find(q => q.status === 'pending');

    if (!nextItem) {
      return NextResponse.json(
        { 
          success: true,
          queueItem: null,
          message: 'Queue is empty',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        queueItem: nextItem,
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
