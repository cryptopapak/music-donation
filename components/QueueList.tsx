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

interface QueueListProps {
  className?: string;
  onRefetch?: () => void;
  refetchKey?: number;
}

export function QueueList({ className = '', onRefetch, refetchKey = 0 }: QueueListProps) {
  console.log('🎵 QueueList component rendered');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);

  const loadQueue = useCallback(async (newOffset: number = offset, newLimit: number = limit) => {
    try {
      setIsLoading(true);
      console.log('🔍 Загрузка очереди: offset=', newOffset, 'limit=', newLimit);
      const response = await fetch(`/api/queue?limit=${newLimit}&offset=${newOffset}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const data: QueueResponse = await response.json();
      console.log('📦 Ответ от API:', data);
      console.log('📦 Полный ответ от API (raw):', JSON.stringify(data, null, 2));

      if (data.success) {
        setQueue(data.tracks);
        setOffset(newOffset);
        setLimit(newLimit);
        console.log('✅ Очередь загружена:', data.tracks.length, 'треков');
      } else {
        setError(data.error || 'Ошибка при загрузке очереди');
        console.error('❌ Ошибка загрузки очереди:', data.error);
      }
    } catch (err) {
      console.error('Error loading queue:', err);
      setError('Не удалось загрузить очередь');
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit, setQueue, setIsLoading, setError]);

  useEffect(() => {
    console.log('🔄 [POLLING] Начинаю опрос очереди...');
    
    // Сразу загружаем
    loadQueue();
    
    // И настраиваем polling каждые 5 секунд
    const interval = setInterval(() => {
      console.log('🔄 [POLLING] Обновление очереди...');
      loadQueue();
    }, 5000);
    
    // Очистка при размонтировании
    return () => {
      console.log('🔄 [POLLING] Остановка polling');
      clearInterval(interval);
    };
  }, []); // Пустой массив - запускается один раз при монтировании

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

  if (isLoading) {
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
          {queue.length} из {queue.length} треков
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
          {(() => {
            console.log('🎨 [RENDER] tracks массив:', queue);
            console.log('🎨 [RENDER] tracks.length:', queue?.length);
            console.log('🎨 [RENDER] Первый трек:', queue?.[0]);
            return null;
          })()}
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
                  onClick={async () => {
                    console.log('🎵 [UI] Запуск трека:', item.id);
                    
                    const response = await fetch('/api/queue/next', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ queueId: item.id }),  // Важно! queueId, а не track_id!
                    });
                    
                    if (!response.ok) {
                      const error = await response.json();
                      console.error('❌ [UI] Ошибка запуска:', error);
                    }
                    
                    // Обновляем очередь после успешного запуска трека
                    if (onRefetch) {
                      onRefetch();
                    } else {
                      refetch();
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                >
                  ▶️ Играть
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
