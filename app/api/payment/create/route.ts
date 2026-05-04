import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { createPayment } from '@/lib/payments/yukassa';
import { fetchMetadataFromUrl } from '@/lib/metadata-parser';
import { isTrackInBlacklist, isTrackTooLong, MAX_TRACK_DURATION } from '@/lib/database';

// Схема валидации для создания платежа
const PaymentCreateSchema = z.object({
  amount: z.number().min(10, 'Минимальный донат: 10 рублей'),
  description: z.string().min(1, 'Описание обязательно'),
  donorName: z.string().min(1, 'Имя обязательно').optional(),
  email: z.string().email('Неверный email').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация входных данных
    const validation = PaymentCreateSchema.safeParse(body);
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

    const { amount, description, donorName, email } = validation.data;

    // Определение провайдера из URL
    const provider = description.includes('youtube.com') || description.includes('youtu.be')
      ? 'youtube'
      : description.includes('soundcloud.com')
      ? 'soundcloud'
      : null;

    if (!provider) {
      return NextResponse.json(
        { error: 'Неверный URL трека. Поддерживаются только YouTube и SoundCloud' },
        { status: 400 }
      );
    }

    // Получение метаданных для проверки
    let metadata: any = null;
    try {
      metadata = await fetchMetadataFromUrl(description);

      // Проверка blacklist
      if (isTrackInBlacklist(metadata.title, metadata.artist)) {
        console.warn(`❌ Трек "${metadata.title}" от "${metadata.artist}" в blacklist`);
        return NextResponse.json(
          { error: 'Трек находится в blacklist' },
          { status: 403 }
        );
      }

      // Проверка длительности
      if (isTrackTooLong(metadata.duration)) {
        console.warn(`❌ Трек "${metadata.title}" слишком длинный: ${metadata.duration} сек`);
        return NextResponse.json(
          { error: `Максимальная длительность трека: ${MAX_TRACK_DURATION / 60} минут` },
          { status: 403 }
        );
      }
    } catch (metadataError) {
      console.error('Failed to fetch metadata for track:', metadataError);
      // Не прерываем выполнение, если не удалось получить метаданные
    }

    // Создание доната в Supabase (статус processing - ожидает оплаты)
    console.log(`💰 [CREATE PAYMENT] Создание доната для трека: ${description}`);
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .insert({
        amount,
        track_url: description,
        track_title: metadata?.title || donorName || null,
        track_artist: metadata?.artist || email || null,
        provider: process.env.NEXT_PUBLIC_USE_MOCK === 'false' ? 'yookassa' : 'mock',
        status: 'processing',
      })
      .select()
      .single();

    if (donationError) {
      console.error('❌ [CREATE PAYMENT] Donation insert error:', donationError);
      return NextResponse.json(
        { error: 'Failed to create donation' },
        { status: 500 }
      );
    }
    console.log(`✅ [CREATE PAYMENT] Донат создан: id=${donation.id}, amount=${amount}`);

    // Создание платежа через ЮKassa
    // createPayment(amount, trackUrl, trackTitle?, trackArtist?, donationId?)
    // URL трека передается как description (он содержит URL)
    const paymentResult = await createPayment(
      amount,
      description,
      metadata?.title || donorName || null,
      metadata?.artist || email || null,
      donation.id
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    // Обновляем донат с payment_id
    if (paymentResult.paymentId) {
      await supabaseAdmin
        .from('donations')
        .update({ payment_id: paymentResult.paymentId })
        .eq('id', donation.id);
    }

    return NextResponse.json(
      {
        success: true,
        paymentId: paymentResult.paymentId,
        confirmationUrl: paymentResult.confirmationUrl,
        donation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
