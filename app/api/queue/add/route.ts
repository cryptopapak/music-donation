import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Схема валидации для создания трека в очереди
const QueueAddSchema = z.object({
  track_link: z.string().url('Неверный URL трека'),
  donor_name: z.string().min(1, 'Имя донора обязательно'),
  message: z.string().optional(),
  amount: z.number().min(10, 'Минимальный донат: 10 рублей'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация входных данных
    const validation = QueueAddSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { track_link, donor_name, message, amount } = validation.data;

    // Создание доната в Supabase
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .insert({
        amount,
        track_url: track_link,
        track_title: message || null,
        track_artist: donor_name,
        provider: 'queue_add',
        status: 'pending',
      })
      .select()
      .single();

    if (donationError) {
      console.error('Donation insert error:', donationError);
      return NextResponse.json(
        { error: 'Failed to create donation' },
        { status: 500 }
      );
    }

    // Создание/получение трека
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .upsert(
        {
          url: track_link,
          provider: 'queue_add',
          title: message || null,
          artist: donor_name,
        },
        { onConflict: 'url' }
      )
      .select()
      .single();

    if (trackError) {
      console.error('Track upsert error:', trackError);
      return NextResponse.json(
        { error: 'Failed to create track' },
        { status: 500 }
      );
    }

    // Добавление в очередь
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('queue')
      .insert({
        track_id: track.id,
        donation_id: donation.id,
        position: 1,
        status: 'pending',
      })
      .select()
      .single();

    if (queueError) {
      console.error('Queue insert error:', queueError);
      return NextResponse.json(
        { error: 'Failed to add to queue' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        donation,
        track,
        queueItem,
        message: 'Track added to queue successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Queue add error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
