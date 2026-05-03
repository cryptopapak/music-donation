import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { createPayment } from '@/lib/payments/yukassa';

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

    // Создание доната в Supabase (статус processing - ожидает оплаты)
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .insert({
        amount,
        track_url: description, // Используем description как track_url для упрощения
        track_title: donorName || null,
        track_artist: email || null,
        provider: process.env.NEXT_PUBLIC_USE_MOCK === 'false' ? 'yookassa' : 'mock',
        status: 'processing',
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

    // Генерация trackUrl для платежа (используем URL для возврата)
    const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?donation_id=${donation.id}`;

    // Создание платежа через ЮKassa
    const paymentResult = await createPayment(
      amount,
      trackUrl,
      description,
      email || donorName || undefined,
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
