import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addTrackToQueue } from '@/lib/database';
import crypto from 'crypto';

const YUKASSA_WEBHOOK_SECRET = process.env.YUKASSA_WEBHOOK_SECRET || process.env.YUKASSA_SECRET_KEY;

function verifyHmac(requestBody: string, signature: string): boolean {
  if (!YUKASSA_WEBHOOK_SECRET) {
    console.warn('⚠️ YUKASSA_WEBHOOK_SECRET не настроен');
    // Пропускаем проверку только в dev режиме
    return process.env.NODE_ENV === 'development';
  }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', YUKASSA_WEBHOOK_SECRET)
      .update(requestBody)
      .digest('base64');
    // timingSafeEqual защищает от timing-атак
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💰 [WEBHOOK] === НОВЫЙ ЗАПРОС ===');
    const rawBody = await request.text();
    const signature = request.headers.get('yookassa-signature') || '';
    console.log('💰 [WEBHOOK] HMAC signature:', signature || 'MISSING');

    // ✅ HMAC проверка включена (ранее была закомментирована)
    if (process.env.PAYMENT_PROVIDER === 'yukassa') {
      if (!verifyHmac(rawBody, signature)) {
        console.error('❌ Неверная HMAC подпись');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ [WEBHOOK] Ошибка парсинга JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { event, object } = body;
    console.log('💰 [WEBHOOK] Event:', event);

    if (event === 'payment.succeeded') {
      await handlePaymentSucceeded(object);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePaymentSucceeded(payment: any) {
  console.log('💰 [WEBHOOK] === ОБРАБОТКА ПЛАТЕЖА ===');
  const { id: paymentId, metadata, amount } = payment;
  const { donationId } = metadata || {};

  if (!donationId?.trim()) {
    console.error('❌ [WEBHOOK] donationId отсутствует в metadata:', JSON.stringify(metadata));
    return;
  }

  console.log(`💰 [WEBHOOK] Платеж ${paymentId} на сумму ${amount.value}`);

  // ✅ Обновляем только если статус 'processing' — идемпотентный апдейт
  const { data: updatedDonation } = await supabaseAdmin
    .from('donations')
    .update({ status: 'completed', payment_id: paymentId })
    .eq('id', donationId)
    .eq('status', 'processing')
    .select()
    .single();

  if (!updatedDonation) {
    // ✅ Защита от webhook replay: если донат уже completed — трек уже в очереди
    const { data: existing } = await supabaseAdmin
      .from('donations')
      .select('status')
      .eq('id', donationId)
      .single();

    if (existing?.status === 'completed') {
      console.log('⚠️ [WEBHOOK] Донат уже обработан, пропускаем (webhook replay)');
      return;
    }

    console.warn('⚠️ [WEBHOOK] Донат не найден или не в статусе processing');
    return;
  }

  console.log('✅ [WEBHOOK] Статус доната обновлён на completed');

  try {
    await addTrackToQueue(donationId);
    console.log(`✅ [WEBHOOK] Трек добавлен в очередь для donation_id=${donationId}`);
  } catch (queueError) {
    console.error(`❌ [WEBHOOK] Ошибка добавления в очередь:`, queueError);
    // Не бросаем ошибку наружу — ЮKassa не должна делать retry
  }
}
