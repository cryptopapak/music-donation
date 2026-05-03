import { supabaseAdmin } from '../supabase';

const CLOUDPAYMENTS_API_URL = 'https://api.cloudpayments.ru';
const CLOUDPAYMENTS_PUBLIC_ID = process.env.CLOUDPAYMENTS_PUBLIC_ID;
const CLOUDPAYMENTS_SECRET_KEY = process.env.CLOUDPAYMENTS_SECRET_KEY;

// Проверка конфигурации
if (!CLOUDPAYMENTS_PUBLIC_ID || !CLOUDPAYMENTS_SECRET_KEY) {
  console.warn('⚠️ CloudPayments не настроена. Укажите CLOUDPAYMENTS_PUBLIC_ID и CLOUDPAYMENTS_SECRET_KEY в .env.local');
}

// Создание платежа
export async function createCloudpaymentsPayment(amount: number, trackUrl: string, description: string) {
  if (!CLOUDPAYMENTS_PUBLIC_ID || !CLOUDPAYMENTS_SECRET_KEY) {
    throw new Error('CloudPayments не настроена');
  }

  const paymentData = {
    publicId: CLOUDPAYMENTS_PUBLIC_ID,
    amount: amount,
    currency: 'RUB',
    description: description,
    invoiceId: generateInvoiceId(),
    accountId: generateAccountId(),
    email: '', // Можно добавить email пользователя
    ip: '', // IP пользователя
    jsonData: JSON.stringify({
      trackUrl,
    }),
  };

  try {
    const response = await fetch(`${CLOUDPAYMENTS_API_URL}/payments/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${CLOUDPAYMENTS_PUBLIC_ID}:${CLOUDPAYMENTS_SECRET_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка создания платежа');
    }

    return {
      success: true,
      paymentId: data.model.transactionId,
      confirmationUrl: data.model.redirectUrl,
    };
  } catch (error) {
    console.error('Cloudpayments payment error:', error);
    throw error;
  }
}

// Проверка статуса платежа
export async function verifyCloudpaymentsPayment(paymentId: string): Promise<boolean> {
  if (!CLOUDPAYMENTS_PUBLIC_ID || !CLOUDPAYMENTS_SECRET_KEY) {
    throw new Error('CloudPayments не настроена');
  }

  try {
    const response = await fetch(`${CLOUDPAYMENTS_API_URL}/payments/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${CLOUDPAYMENTS_PUBLIC_ID}:${CLOUDPAYMENTS_SECRET_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        publicId: CLOUDPAYMENTS_PUBLIC_ID,
        transactionId: paymentId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка проверки платежа');
    }

    return data.model.status === 'Completed';
  } catch (error) {
    console.error('Cloudpayments verify error:', error);
    throw error;
  }
}

// Генерация invoice ID
function generateInvoiceId(): string {
  return `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Генерация account ID
function generateAccountId(): string {
  return `ACC-${Math.random().toString(36).substring(2, 15)}`;
}

// Mock режим (для разработки)
export async function createMockPayment(amount: number, trackUrl: string) {
  return {
    success: true,
    paymentId: `mock-${Date.now()}`,
    confirmationUrl: null,
  };
}

// Основная функция создания платежа
export async function createPayment(amount: number, trackUrl: string, trackTitle?: string, trackArtist?: string, donationId?: string) {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  if (provider === 'mock') {
    return createMockPayment(amount, trackUrl);
  }

  if (provider === 'cloudpayments') {
    const description = trackArtist
      ? `${trackArtist} - ${trackTitle || 'Трек'}`
      : `Донат за трек: ${trackUrl}`;
    
    return createCloudpaymentsPayment(amount, trackUrl, description);
  }

  throw new Error(`Неизвестный провайдер: ${provider}`);
}

// Основная функция проверки платежа
export async function verifyPayment(paymentId: string): Promise<boolean> {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  if (provider === 'mock') {
    return true;
  }

  if (provider === 'cloudpayments') {
    return verifyCloudpaymentsPayment(paymentId);
  }

  throw new Error(`Неизвестный провайдер: ${provider}`);
}
