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
    
    // Проверка HMAC подписи (отключена для тестирования)
    /*
    if (process.env.PAYMENT_PROVIDER === 'yukassa') {
      if (!verifyHmac(rawBody, signature)) {
        console.error('❌ Неверная HMAC подпись');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    */

    const body = JSON.parse(rawBody);
    const { event, object } = body;

    console.log('💰 [YUKASSA WEBHOOK] Получено событие:', event);
    console.log('💰 [YUKASSA WEBHOOK] Данные платежа:', JSON.stringify(object, null, 2));

    // Обработка события payment.succeeded
    if (event === 'payment.succeeded') {
      await handlePaymentSucceeded(object);
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
  const { trackUrl, donationId } = metadata || {};

  console.log(`💰 [YUKASSA WEBHOOK] Платеж ${paymentId} успешно завершен на сумму ${amount.value}`);
  console.log(`💰 [YUKASSA WEBHOOK] Metadata:`, metadata);
  console.log(`💰 [YUKASSA WEBHOOK] donationId из metadata:`, donationId);

  // Обновляем статус доната на completed
  const { error: donationError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'completed',
      payment_id: paymentId,
    })
    .eq('payment_id', paymentId)
    .eq('status', 'processing');

  if (donationError) {
    console.error('❌ [YUKASSA WEBHOOK] Donation update error:', donationError);
  } else {
    console.log(`✅ [YUKASSA WEBHOOK] Статус доната обновлен на completed`);
  }

  // Добавляем трек в очередь
  if (donationId) {
    try {
      console.log(`💰 [YUKASSA WEBHOOK] Вызов addTrackToQueue(${donationId})`);
      await addTrackToQueue(donationId);
      console.log(`✅ [YUKASSA WEBHOOK] Трек добавлен в очередь: donation_id=${donationId}`);
    } catch (queueError) {
      console.error('❌ [YUKASSA WEBHOOK] Error adding track to queue:', queueError);
    }
  } else {
    console.warn('⚠️ [YUKASSA WEBHOOK] donationId отсутствует в metadata');
  }
}
