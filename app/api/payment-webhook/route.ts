import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addTrackToQueue } from '@/lib/database';
import crypto from 'crypto';

// ЮKassa webhook секрет (для проверки HMAC)
const YUKASSA_WEBHOOK_SECRET = process.env.YUKASSA_WEBHOOK_SECRET || process.env.YUKASSA_SECRET_KEY;

// Проверка HMAC подписи от ЮKassa
function verifyHmac(requestBody: string, signature: string): boolean {
  if (!YUKASSA_WEBHOOK_SECRET) {
    console.warn('⚠️ YUKASSA_WEBHOOK_SECRET не настроен');
    return true; // Пропускаем проверку если нет секрета (для разработки)
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', YUKASSA_WEBHOOK_SECRET)
      .update(requestBody)
      .digest('base64');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('yookassa-signature') || '';
    
    // Проверка HMAC подписи
    if (process.env.PAYMENT_PROVIDER === 'yukassa') {
      if (!verifyHmac(rawBody, signature)) {
        console.error('❌ Неверная HMAC подпись');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const body = JSON.parse(rawBody);
    const { event, object } = body;

    console.log(' webhook event:', event);

    // Обработка различных событий от ЮKassa
    switch (event) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(object);
        break;
      case 'payment.canceled':
        await handlePaymentCanceled(object);
        break;
      case 'payment.waiting_for_capture':
        await handlePaymentWaitingForCapture(object);
        break;
      default:
        console.log('⚠️ Неизвестное событие:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Обработка успешного платежа
async function handlePaymentSucceeded(payment: any) {
  const { id: paymentId, metadata, amount } = payment;
  const { trackUrl } = metadata || {};

  console.log(`💰 Платеж ${paymentId} успешно завершен на сумму ${amount.value}`);

  // Обновляем статус доната
  const { error: donationError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'completed',
      payment_id: paymentId,
    })
    .eq('payment_id', paymentId)
    .eq('status', 'processing');

  if (donationError) {
    console.error('Donation update error:', donationError);
  }

  // Если есть trackUrl, добавляем трек в очередь
  if (trackUrl) {
    try {
      await addTrackToQueue(trackUrl);
      console.log(`✅ Трек добавлен в очередь: ${trackUrl}`);
    } catch (queueError) {
      console.error('Error adding track to queue:', queueError);
    }
  }
}

// Обработка отмененного платежа
async function handlePaymentCanceled(payment: any) {
  const { id: paymentId } = payment;

  console.log(`❌ Платеж ${paymentId} отменен`);

  await supabaseAdmin
    .from('donations')
    .update({ status: 'failed' })
    .eq('payment_id', paymentId)
    .eq('status', 'processing');
}

// Обработка платежа, ожидающего подтверждения
async function handlePaymentWaitingForCapture(payment: any) {
  const { id: paymentId } = payment;

  console.log(`⏳ Платеж ${paymentId} ожидает подтверждения`);

  // Можно добавить логику для ручного подтверждения или автоматического захвата
}
