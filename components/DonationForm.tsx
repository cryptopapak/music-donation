'use client';

import { useState } from 'react';

interface DonationFormProps {
  onDonationSuccess?: () => void;
  onQueueRefetch?: () => void;
}

export function DonationForm({ onDonationSuccess, onQueueRefetch }: DonationFormProps) {
  const [donorName, setDonorName] = useState<string>('');
  const [trackLink, setTrackLink] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [amount, setAmount] = useState<string>('100');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Валидация
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 10) {
      setError('Минимальный донат: 10 рублей');
      return;
    }

    if (!trackLink.trim()) {
      setError('Введите ссылку на трек');
      return;
    }

    // Проверка URL (простая валидация)
    try {
      new URL(trackLink);
    } catch {
      setError('Неверная ссылка. Введите корректный URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Создаем платеж через ЮKassa
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numericAmount,
          description: trackLink.trim(),
          donorName: donorName.trim() || undefined,
          email: undefined, // email не обязателен
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании платежа');
      }

      // Если есть confirmation_url, перенаправляем пользователя на оплату
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
        return;
      }

      // Для mock режима (без confirmation_url)
      setSuccess(true);
      setTrackLink('');
      setMessage('');
      setAmount('100');
      
      if (onDonationSuccess) {
        onDonationSuccess();
      }
      
      if (onQueueRefetch) {
        onQueueRefetch();
      }

      // Сброс через 3 секунды
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка. Попробуйте снова');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 text-white">
        🎁 Сделать донат
      </h2>
      
      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
          ✅ Донат успешно создан! Трек добавлен в очередь.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Сумма доната */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Сумма (₽)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="10"
            max="100000"
            className="input"
            placeholder="Минимум 10 ₽"
          />
          <p className="text-xs text-slate-500 mt-1">
            Минимальная сумма: 10 ₽
          </p>
        </div>

        {/* Ссылка на трек */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Ссылка на трек (YouTube/SoundCloud)
          </label>
          <input
            type="text"
            value={trackLink}
            onChange={(e) => setTrackLink(e.target.value)}
            className="input"
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-slate-500 mt-1">
            Поддерживаем YouTube, SoundCloud
          </p>
        </div>

        {/* Имя донора */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Ваше имя (опционально)
          </label>
          <input
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="input"
            placeholder="Ваше имя"
          />
        </div>

        {/* Сообщение */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Сообщение (опционально)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input"
            rows={3}
            placeholder="Сообщение стримеру..."
          />
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary py-3 text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Обработка...
            </span>
          ) : (
            '🎵 Отправить донат'
          )}
        </button>
      </form>
    </div>
  );
}
