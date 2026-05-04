import { supabaseAdmin } from '../supabase';

const YUKASSA_API_URL = 'https://api.yookassa.ru/v3';
const YUKASSA_SHOP_ID = process.env.YUKASSA_SHOP_ID;
const YUKASSA_SECRET_KEY = process.env.YUKASSA_SECRET_KEY;

// Проверка конфигурации
if (!YUKASSA_SHOP_ID || !YUKASSA_SECRET_KEY) {
  console.warn('⚠️ ЮKassa не настроена. Укажите YUKASSA_SHOP_ID и YUKASSA_SECRET_KEY в .env.local');
}

// Создание платежа
export async function createYukassaPayment(amount: number, trackUrl: string, description: string, donationId?: string) {
  if (!YUKASSA_SHOP_ID || !YUKASSA_SECRET_KEY) {
    throw new Error('ЮKassa не настроена');
  }

  const metadata: Record<string, string> = {
    trackUrl,
    donationId: donationId || ''
  };

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;

  const paymentData = {
    amount: {
      value: amount.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    },
    description: description,
    metadata,
    capture: true,
    notification: {
      url: webhookUrl,
    },
  };

  try {
    const response = await fetch(`${YUKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': generateIdempotenceKey(),
        'Authorization': `Basic ${Buffer.from(`${YUKASSA_SHOP_ID}:${YUKASSA_SECRET_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка создания платежа');
    }

    const confirmationUrl = data.confirmation?.confirmation_url;
    
    if (!confirmationUrl) {
      console.error('❌ ЮKassa не вернула confirmation_url:', data);
    }
    
    return {
      success: true,
      paymentId: data.id,
      confirmationUrl: confirmationUrl || null,
      donationId: donationId || null,
    };
  } catch (error) {
    console.error('Yukassa payment error:', error);
    throw error;
  }
}

// Проверка статуса платежа
export async function verifyYukassaPayment(paymentId: string): Promise<boolean> {
  if (!YUKASSA_SHOP_ID || !YUKASSA_SECRET_KEY) {
    throw new Error('ЮKassa не настроена');
  }

  try {
    const response = await fetch(`${YUKASSA_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${YUKASSA_SHOP_ID}:${YUKASSA_SECRET_KEY}`).toString('base64')}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка проверки платежа');
    }

    return data.status === 'succeeded';
  } catch (error) {
    console.error('Yukassa verify error:', error);
    throw error;
  }
}

// Генерация idempotence key
function generateIdempotenceKey(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Mock режим (для разработки)
export async function createMockPayment(amount: number, trackUrl: string) {
  return {
    success: true,
    paymentId: `mock-${Date.now()}`,
    confirmationUrl: null,
    donationId: null,
  };
}

// Основная функция создания платежа
export async function createPayment(amount: number, trackUrl: string, trackTitle?: string, trackArtist?: string, donationId?: string) {
  const provider = process.env.NEXT_PUBLIC_USE_MOCK === 'false' ? 'yukassa' : 'mock';

  if (provider === 'mock') {
    return createMockPayment(amount, trackUrl);
  }

  if (provider === 'yukassa') {
    const description = trackArtist
      ? `${trackArtist} - ${trackTitle || 'Трек'}`
      : `Донат за трек: ${trackUrl}`;
    
    return createYukassaPayment(amount, trackUrl, description, donationId);
  }

  throw new Error(`Неизвестный провайдер: ${provider}`);
}

// Основная функция проверки платежа
export async function verifyPayment(paymentId: string): Promise<boolean> {
  const provider = process.env.NEXT_PUBLIC_USE_MOCK === 'false' ? 'yukassa' : 'mock';

  if (provider === 'mock') {
    return true;
  }

  if (provider === 'yukassa') {
    return verifyYukassaPayment(paymentId);
  }

  throw new Error(`Неизвестный провайдер: ${provider}`);
}
