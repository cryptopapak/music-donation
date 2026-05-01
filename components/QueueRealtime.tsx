'use client';

import { useState, useEffect } from 'react';
import { useQueueRealtime } from '@/hooks/useQueueRealtime';

interface QueueItem {
  id: string;
  position: number;
  status: string;
  started_at?: string | null;
  created_at: string;
  tracks: {
    id: string;
    url: string;
    provider: string;
    title?: string | null;
    artist?: string | null;
    thumbnail_url?: string | null;
  };
  donations: {
    id: string;
    amount: number;
    created_at: string;
  };
}

export function QueueRealtime() {
  const { queue, isLoading, error, currentTrack, handleSkip, handlePlay } = useQueueRealtime();

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'youtube':
        return '▶️';
      case 'spotify':
        return '🎵';
      case 'soundcloud':
        return '🔊';
      default:
        return '🎵';
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-white">
          🎵 Очередь треков
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400">Загрузка очереди...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          🎵 Очередь треков
        </h2>
        <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
          {queue.length} треков
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <svg
            className="w-12 h-12 mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Очередь пуста</p>
          <p className="text-sm mt-2">Сделайте донат, чтобы добавить трек</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                item.status === 'playing' 
                  ? 'bg-indigo-500/20 border border-indigo-500/50' 
                  : item.status === 'played'
                  ? 'bg-slate-800/50 opacity-70'
                  : 'bg-slate-700/50 hover:bg-slate-700'
              }`}
            >
              {/* Позиция в очереди */}
              <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                item.status === 'playing' 
                  ? 'bg-indigo-600 text-white' 
                  : item.status === 'played'
                  ? 'bg-slate-600 text-slate-400'
                  : 'bg-slate-600 text-slate-300'
              }`}>
                {item.status === 'played' ? '✅' : item.position}
              </div>

              {/* Информация о треке */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getProviderIcon(item.tracks.provider)}</span>
                  <div>
                    <p className="font-medium text-white truncate">
                      {item.tracks.artist || 'Неизвестный исполнитель'}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {item.tracks.title || 'Неизвестный трек'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Информация о донате */}
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium">
                  {item.donations.amount} ₽
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(item.donations.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Кнопки управления */}
              {item.status === 'pending' && (
                <button
                  onClick={() => handlePlay(item.id)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                >
                  ▶️ Играть
                </button>
              )}
              {item.status === 'playing' && (
                <button
                  onClick={() => handleSkip(item.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  ⏭️ Пропустить
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
