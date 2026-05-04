'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Проверка платежа...');

  useEffect(() => {
    const paymentId = searchParams.get('paymentId');
    const paymentStatus = searchParams.get('status');
    const donationId = searchParams.get('donation_id');

    console.log(`💰 [SUCCESS PAGE] paymentId: ${paymentId}, donationId: ${donationId}`);

    if (!paymentId) {
      setStatus('error');
      setMessage('Не указан ID платежа');
      return;
    }

    // Проверяем статус платежа
    const verifyPayment = async () => {
      try {
        console.log(`💰 [SUCCESS PAGE] Проверка платежа ${paymentId}`);
        const response = await fetch(`/api/payment-verify?paymentId=${paymentId}`);
        const data = await response.json();
        console.log(`💰 [SUCCESS PAGE] Результат проверки:`, data);

        if (data.success && data.verified) {
          setStatus('success');
          setMessage('Платеж успешно подтвержден! Трек добавлен в очередь.');
          
          // Перенаправление через 3 секунды
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Платеж не подтвержден. Попробуйте снова.');
        }
      } catch (error) {
        console.error('❌ [SUCCESS PAGE] Payment verification error:', error);
        setStatus('error');
        setMessage('Ошибка при проверке платежа');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-12 w-12 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">✅ Платеж подтвержден!</h2>
            <p className="text-slate-300 mb-4">{message}</p>
            <p className="text-sm text-slate-500">Перенаправление на главную страницу...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">❌ Ошибка</h2>
            <p className="text-slate-300 mb-4">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary"
            >
              На главную
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
