'use client';

import { useState, useEffect, useCallback } from 'react';

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
}

interface Donation {
  id: string;
  amount: number;
  donor_name?: string | null;
  created_at: string;
}

interface QueueItem {
  id: string;
  track_id: string;
  url: string;
  provider: string;
  status: string;
  position: number;
  priority_score: number;
  votes_count: number;
  created_at: string;
  tracks?: Track | null;
  donation: Donation | null;
}

interface QueueResponse {
  success: boolean;
  tracks: QueueItem[];
  total: number;
  hasMore: boolean;
  error?: string;
}

// Debug logging helper
const logRenderState = (isLoading: boolean, queue: QueueItem[]) => {
  console.log('🎨 [RENDER] isLoading:', isLoading);
  console.log('🎨 [RENDER] queue:', queue);
  console.log('🎨 [RENDER] length:', queue?.length);
};

interface QueueListProps {
  className?: string;
  onRefetch?: () => void;
  refetchKey?: number;
}

export function QueueList({ className = '', onRefetch, refetchKey = 0 }: QueueListProps) {
  console.log('🎵 QueueList component rendered');
  
  const POLLING_INTERVAL = 15000; // 15 секунд
  const MIN_UPDATE_INTERVAL = 3000; // анти-спам
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  let lastUpdateTime = 0;

  // State watcher to monitor changes
  useEffect(() => {
    console.log('👀 [STATE CHANGE] playingTrackId:', playingTrackId);
  }, [playingTrackId]);

  // Cleanup: ensure isLoading is reset when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 [CLEANUP] reset isLoading');
      setIsLoading(false);
    };
  }, []);

  const handlePlay = async (queueId: string) => {
    setPlayingTrackId(queueId);

    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId })
      });

      if (response.status === 400) {
        const errorData = await response.json();

        console.warn('⚠️ [API 400]:', errorData);
        alert(errorData.error || 'Трек уже обработан');

        // ❗ НЕ дергаем мгновенно (избегаем гонки)
        setTimeout(() => {
          console.log('🔄 [DELAYED SYNC]');
          loadQueue();
        }, 2000);

        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await loadQueue();

    } catch (error) {
      console.error('❌ [PLAY ERROR]:', error);
    } finally {
      setPlayingTrackId(null);
    }
  };

  // Fixed loadQueue function - following the exact specification
  const loadQueue = useCallback(async (newOffset: number = offset, newLimit: number = limit) => {
    if (isLoading) {
      console.log('⛔ [LOAD] Уже загружается — пропуск');
      return;
    }

    console.log('🚀 [LOAD] start');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/queue?status=pending&offset=${newOffset}&limit=${newLimit}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log('📦 RAW DATA:', data);
      console.log('📦 TRACKS:', data.tracks);

      // 🔥 КРИТИЧНО: правильная структура
      const tracks = Array.isArray(data.tracks) ? data.tracks : [];

      console.log('✅ Очередь загружена:', tracks.length, 'треков');

      setQueue(tracks);          // ✅ СНАЧАЛА данные
      setTotal(data.total || 0);

    } catch (error) {
      console.error('❌ [LOAD ERROR]:', error);

    } finally {
      setIsLoading(false);       // ✅ ПОТОМ loading
      console.log('🔓 [LOAD] reset isLoading');
    }
  }, [isLoading]); // Added dependency array that includes isLoading

  // Single useEffect for polling with AbortController to prevent memory leaks
  useEffect(() => {
    console.log('🚀 [INIT] Первый запрос');

    loadQueue();

    const intervalId = setInterval(() => {
      loadQueue();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
      console.log('🧹 [CLEANUP] polling остановлен');
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  // Периодическая "жёсткая" синхронизация
  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log('🔄 [SYNC] Принудительное обновление');
      loadQueue();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  const refetch = async () => {
    await loadQueue(offset, limit);
    if (onRefetch) {
      onRefetch();
    }
  };

  const handlePreviousPage = () => {
    if (offset > 0) {
      loadQueue(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    loadQueue(offset + limit);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'youtube':
        return '▶️';
      case 'soundcloud':
        return '🔊';
      default:
        return '▶️';
    }
  };

  // Добавляем диагностику рендера перед return
  console.log('🔍 [DEBUG RENDER] isLoading:', isLoading);
  console.log('🔍 [DEBUG RENDER] queue:', queue);
  console.log('🔍 [DEBUG RENDER] queue.length:', queue?.length);

  // ИСПРАВЛЕННАЯ логика рендера: 
  // Показываем "Загрузка очереди..." только если isLoading=true И очередь пуста
  if (isLoading && queue.length === 0) {
    return (
      <div className={`card ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-white">🎵 Очередь треков</h2>
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400">Загрузка очереди...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">🎵 Очередь треков</h2>
        <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
          {queue.length} треков
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {(queue && queue.length > 0) ? (
        <div className="space-y-3">
          {queue.map((item) => {
            console.log('🎵 QueueList rendering track:', item);
            console.log('🎨 [UI] Queue item:', {
              id: item.id,           // UUID из queue
              track_id: item.track_id,  // UUID из tracks
              status: item.status,
              tracks_data: item.tracks
            });
            return (
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
                  <span className="text-lg">{getProviderIcon(item.provider || '')}</span>
                  <div>
                    <p className="font-medium text-white truncate">
                      {item.tracks?.artist || 'Неизвестный исполнитель'}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {item.tracks?.title || 'Неизвестный трек'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Информация о донате */}
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium">
                  {item.donation?.amount || 0} ₽
                </span>
                <span className="text-xs text-slate-500">
                  {item.donation?.created_at
                    ? new Date(item.donation.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              {/* Кнопки управления */}
              {item.status === 'pending' && (
                <button
                  onClick={() => handlePlay(item.id)}
                  disabled={playingTrackId === item.id}
                  className={`px-3 py-1 rounded text-sm ${
                    playingTrackId === item.id
                      ? 'bg-indigo-400 text-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {playingTrackId === item.id ? '▶️ Запуск...' : '▶️ Играть'}
                </button>
              )}
              {item.status === 'playing' && (
                <button
                  onClick={() => console.log('Skip:', item.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  ⏭️ Пропустить
                </button>
              )}
            </div>
            );
          })}
        </div>
      ) : (
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
      )}

      {/* Пагинация */}
      {queue.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePreviousPage}
            disabled={offset === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            ← Назад
          </button>
          <span className="text-slate-400 text-sm">
            Страница {Math.floor(offset / limit) + 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={queue.length < limit}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
}
