import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { parseTrackUrl } from '@/lib/parser';
import { fetchMetadataFromUrl } from '@/lib/metadata-parser';
import { isTrackInBlacklist, isTrackTooLong, MAX_TRACK_DURATION, DEFAULT_BLACKLIST_ARTISTS, DEFAULT_BLACKLIST_KEYWORDS } from '@/lib/database';

// Схема валидации для создания трека в очереди
const QueueAddSchema = z.object({
  track_link: z.string().url('Неверный URL трека'),
  donor_name: z.string().min(1, 'Имя донора обязательно'),
  message: z.string().optional(),
  amount: z.number().min(10, 'Минимальный донат: 10 рублей'),
});

/**
 * Определяет провайдер по URL (YouTube или SoundCloud)
 */
function getProviderFromUrl(url: string): 'youtube' | 'soundcloud' | null {
  const trimmedUrl = url.trim();
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (trimmedUrl.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  return null;
}

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

    // Определение провайдера из URL
    const provider = getProviderFromUrl(track_link);
    if (!provider) {
      return NextResponse.json(
        { error: 'Неверный URL трека. Поддерживаются только YouTube и SoundCloud' },
        { status: 400 }
      );
    }

    // Создание доната в Supabase
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .insert({
        amount,
        track_url: track_link,
        track_title: message || null,
        track_artist: donor_name,
        donor_name: donor_name,
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

    // Создание/получение трека с правильным провайдером
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .upsert(
        {
          url: track_link,
          provider: provider,
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

    // Получение метаданных для проверки
    try {
      const metadata = await fetchMetadataFromUrl(track_link);

      // Проверка blacklist
      if (isTrackInBlacklist(metadata.title, metadata.artist)) {
        console.warn(`❌ Трек "${metadata.title}" от "${metadata.artist}" в blacklist`);
        // Удаляем донат и трек, если трек в blacklist
        await supabaseAdmin.from('donations').delete().eq('id', donation.id);
        await supabaseAdmin.from('tracks').delete().eq('id', track.id);
        return NextResponse.json(
          { error: 'Трек находится в blacklist' },
          { status: 403 }
        );
      }

      // Проверка длительности
      if (isTrackTooLong(metadata.duration)) {
        console.warn(`❌ Трек "${metadata.title}" слишком длинный: ${metadata.duration} сек`);
        // Удаляем донат и трек, если трек слишком длинный
        await supabaseAdmin.from('donations').delete().eq('id', donation.id);
        await supabaseAdmin.from('tracks').delete().eq('id', track.id);
        return NextResponse.json(
          { error: `Максимальная длительность трека: ${MAX_TRACK_DURATION / 60} минут` },
          { status: 403 }
        );
      }

      // Обновление трека метаданными
      const { error: updateError } = await supabaseAdmin
        .from('tracks')
        .update({
          title: metadata.title,
          artist: metadata.artist,
          thumbnail_url: metadata.thumbnail_url,
          duration: metadata.duration
        })
        .eq('id', track.id);

      if (updateError) {
        console.error('Track metadata update error:', updateError);
      }
    } catch (metadataError) {
      console.error('Failed to fetch metadata for track:', metadataError);
      // Не прерываем выполнение, если не удалось получить метаданные
    }

    // Добавление в очередь
    const status = 'pending';
    console.log(`💰 [QUEUE ADD] Добавляю трек со статусом: ${status}`);
    console.log(`💰 [QUEUE ADD] Данные для вставки:`, {
      track_id: track.id,
      donation_id: donation.id,
      position: 1,
      status: status,
      priority_score: Math.floor(amount / 100),
      votes_count: 0,
    });
    
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('queue')
      .insert({
        track_id: track.id,
        donation_id: donation.id,
        position: 1,
        status: status,
        priority_score: Math.floor(amount / 100), // Приоритет на основе суммы доната
        votes_count: 0,
      })
      .select()
      .single();

    if (queueError) {
      console.error('💰 [QUEUE ADD] Queue insert error:', queueError);
      return NextResponse.json(
        { error: 'Failed to add to queue' },
        { status: 500 }
      );
    }
    
    console.log(`💰 [QUEUE ADD] Трек успешно добавлен в очередь! id=${queueItem.id}, status=${queueItem.status}`);

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
