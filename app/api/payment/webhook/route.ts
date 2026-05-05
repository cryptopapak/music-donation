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
    console.log('💰 [WEBHOOK] === НОВЫЙ ЗАПРОС ===');
    const rawBody = await request.text();
    console.log('💰 [WEBHOOK] Raw body received:', rawBody.substring(0, 500) + (rawBody.length > 500 ? '...' : ''));
    
    const signature = request.headers.get('yookassa-signature') || '';
    console.log('💰 [WEBHOOK] HMAC signature:', signature || 'MISSING');
    
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

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ [WEBHOOK] Ошибка парсинга JSON:', parseError);
      console.error('❌ [WEBHOOK] Raw body:', rawBody);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    const { event, object } = body;
    console.log('💰 [WEBHOOK] Event:', event);
    console.log('💰 [WEBHOOK] Object:', JSON.stringify(object, null, 2));

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
  console.log('💰 [WEBHOOK] === ОБРАБОТКА ПЛАТЕЖА ===');
  const { id: paymentId, metadata, amount } = payment;
  const { trackUrl, donationId } = metadata || {};

  console.log(`💰 [WEBHOOK] Платеж ${paymentId} успешно завершен на сумму ${amount.value}`);
  console.log(`💰 [WEBHOOK] Metadata:`, JSON.stringify(metadata, null, 2));
  console.log(`💰 [WEBHOOK] donationId из metadata:`, donationId || 'MISSING');

  // Проверка наличия donationId
  if (!donationId || donationId.trim() === '') {
    console.error('❌ [WEBHOOK] donationId отсутствует в metadata!');
    console.error('❌ [WEBHOOK] Metadata целиком:', JSON.stringify(metadata, null, 2));
    return;
  }

  // Обновляем статус доната на completed
  console.log(`💰 [WEBHOOK] Обновление доната с payment_id=${paymentId}`);
  const { error: donationError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'completed',
      payment_id: paymentId,
    })
    .eq('payment_id', paymentId)
    .eq('status', 'processing');

  if (donationError) {
    console.error('❌ [WEBHOOK] Donation update error:', donationError);
    console.error('❌ [WEBHOOK] Данные доната:', { paymentId, status: 'processing' });
  } else {
    console.log(`✅ [WEBHOOK] Статус доната обновлен на completed`);
  }

  // Добавляем трек в очередь
  console.log(`💰 [WEBHOOK] Вызов addTrackToQueue(${donationId})`);
  try {
    await addTrackToQueue(donationId);
    console.log(`✅ [WEBHOOK] Трек добавлен в очередь: donation_id=${donationId}`);
    
    // Проверяем, что происходит с очередью после добавления
    const { data: queueAfterAdd, error: queueError } = await supabaseAdmin
      .from('queue')
      .select('*')
      .eq('donation_id', donationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (queueError) {
      console.error(`❌ [WEBHOOK] Ошибка проверки очереди:`, queueError);
    } else {
      console.log(`💰 [WEBHOOK] Проверка очереди после добавления:`, {
        id: queueAfterAdd?.id,
        status: queueAfterAdd?.status,
        donation_id: queueAfterAdd?.donation_id
      });
    }
  } catch (queueError) {
    console.error(`❌ [WEBHOOK] Ошибка добавления в очередь:`, queueError);
    console.error(`❌ [WEBHOOK] donationId: ${donationId}`);
    console.error(`❌ [WEBHOOK] paymentId: ${paymentId}`);
    console.error(`❌ [WEBHOOK] Данные платежа:`, JSON.stringify(payment, null, 2));
    // Не возвращаем ошибку ЮKassa, чтобы не было повторных отправок
  }
}
