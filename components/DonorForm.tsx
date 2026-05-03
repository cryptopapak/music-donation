'use client';

import { useState } from 'react';
import { parseTrackUrl, isValidDonationAmount } from '@/lib/parser';

interface DonorFormProps {}

export function DonorForm({}: DonorFormProps) {
  const [amount, setAmount] = useState<string>('100');
  const [trackUrl, setTrackUrl] = useState<string>('');
  const [trackTitle, setTrackTitle] = useState<string>('');
  const [trackArtist, setTrackArtist] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Валидация
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || !isValidDonationAmount(numericAmount)) {
      setError('Сумма доната должна быть от 10 до 100000 рублей');
      return;
    }

    if (!trackUrl.trim()) {
      setError('Введите ссылку на трек');
      return;
    }

    const parsedTrack = parseTrackUrl(trackUrl);
    if (!parsedTrack) {
      setError('Неверная ссылка. Поддерживаем YouTube, SoundCloud');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/create-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numericAmount,
          trackUrl,
          trackTitle: trackTitle || undefined,
          trackArtist: trackArtist || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании доната');
      }

      setSuccess(true);
      setTrackUrl('');
      setTrackTitle('');
      setTrackArtist('');
      
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
            Ссылка на трек
          </label>
          <input
            type="text"
            value={trackUrl}
            onChange={(e) => setTrackUrl(e.target.value)}
            className="input"
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-slate-500 mt-1">
            Поддерживаем YouTube, SoundCloud
          </p>
        </div>

        {/* Дополнительная информация (опционально) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Исполнитель (опционально)
            </label>
            <input
              type="text"
              value={trackArtist}
              onChange={(e) => setTrackArtist(e.target.value)}
              className="input"
              placeholder="Artist Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Название (опционально)
            </label>
            <input
              type="text"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              className="input"
              placeholder="Track Title"
            />
          </div>
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
