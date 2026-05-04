// Mock API для быстрого запуска (без Supabase)
// Используется когда NEXT_PUBLIC_USE_MOCK=true

import { NextRequest, NextResponse } from 'next/server';
import { 
  createDonation, 
  getOrCreateTrack,
  addToQueue
} from '@/lib/storage';
import { parseTrackUrl } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, trackUrl, trackTitle, trackArtist, donorName } = body;

    // Валидация входных данных
    if (!amount || !trackUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and trackUrl' },
        { status: 400 }
      );
    }

    // Валидация суммы
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 10 || numericAmount > 100000) {
      return NextResponse.json(
        { error: 'Amount must be between 10 and 100000 rubles' },
        { status: 400 }
      );
    }

    // Парсинг URL трека
    const parsedTrack = parseTrackUrl(trackUrl);
    if (!parsedTrack) {
      return NextResponse.json(
        { error: 'Invalid track URL. Supported: YouTube, SoundCloud' },
        { status: 400 }
      );
    }

    // Создание доната
    const donation = createDonation(
      amount,
      trackUrl,
      trackTitle || parsedTrack.title || undefined,
      trackArtist || parsedTrack.artist || undefined,
      donorName || undefined,
      parsedTrack.provider
    );

    // Создание/получение трека
    const track = getOrCreateTrack(
      trackUrl,
      parsedTrack.provider,
      parsedTrack.title || undefined,
      parsedTrack.artist || undefined
    );

    // Добавление в очередь
    addToQueue(track.id, donation.id);

    return NextResponse.json(
      { 
        success: true,
        donation,
        track,
        message: 'Donation created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create donation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
