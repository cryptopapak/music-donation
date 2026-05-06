'use client';
import { useState } from 'react';
import { DonationForm } from '@/components/DonationForm';
import QueueList from '@/components/QueueList';
import { Player } from '@/components/Player';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Временный streamerId для MVP (позже заменить на auth)
const DEFAULT_STREAMER_ID = 'default-streamer';

export default function Home() {
  const [queueRefetchKey, setQueueRefetchKey] = useState(0);

  const handleQueueRefetch = () => {
    setQueueRefetchKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎵 Music Donation
          </h1>
          <p className="text-slate-400">
            Поддержи музыку и выбери, что будет играть дальше
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <ErrorBoundary>
              <DonationForm onQueueRefetch={handleQueueRefetch} />
            </ErrorBoundary>
          </div>

          {/* Right Column - Player & Queue */}
          <div className="lg:col-span-2 space-y-6">
            <Player />
            <ErrorBoundary fallback={<div className="card p-4 text-red-400">Ошибка загрузки очереди</div>}>
              <QueueList key={queueRefetchKey} streamerId="main-streamer" />
            </ErrorBoundary>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>Минимальный донат: 10 ₽</p>
          <p className="mt-1">Поддерживаем YouTube, SoundCloud</p>
          <div className="mt-4 space-x-4">
            <a href="/legal/offer" className="hover:text-slate-300 underline">Публичная оферта</a>
            <a href="/legal/privacy" className="hover:text-slate-300 underline">Политика конфиденциальности</a>
            <a href="/legal/refund" className="hover:text-slate-300 underline">Политика возврата</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
