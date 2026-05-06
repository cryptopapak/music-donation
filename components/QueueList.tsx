'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

// Helper functions for fallback when API JOIN fails
const getTrackTitle = (item: QueueItem) => item.tracks?.title ?? (item as any).title ?? 'Неизвестный трек';
const getTrackArtist = (item: QueueItem) => item.tracks?.artist ?? (item as any).artist ?? 'Неизвестный исполнитель';

interface QueueListProps {
  streamerId?: string;
  className?: string;
  onRefetch?: () => void;
  refetchKey?: number;
}

export function QueueList({ streamerId, className = '', onRefetch, refetchKey = 0 }: QueueListProps) {
  console.log('🎵 QueueList component rendered');
  
  // Add fallback for streamerId to prevent undefined
  const actualStreamerId = streamerId || 'default-streamer-id';
  
  const [tracks, setTracks] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  const fetchQueue = useCallback(async (showLoader = false) => {
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoader) setIsLoading(true);
      setError('');

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const apiUrl = actualStreamerId ? `/api/queue?streamerId=${actualStreamerId}` : '/api/queue';
      const response = await fetch(apiUrl, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('📥 Fetched queue:', data);
      setTracks(data.tracks || []);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        return;
      }
      console.error('❌ Error fetching queue:', err);
      setError('Ошибка загрузки очереди');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [actualStreamerId]);

  useEffect(() => {
    console.log('🔄 Starting queue polling for streamer:', actualStreamerId);
    fetchQueue(true);
    const interval = setInterval(() => fetchQueue(false), 15000);
    return () => {
      console.log('🛑 Stopping queue polling');
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQueue, actualStreamerId]);

  const handlePlay = async (trackId: string) => {
    if (playingTrackId) {
      alert('Дождитесь завершения текущего трека');
      return;
    }

    try {
      setPlayingTrackId(trackId);
      // Проверяем наличие actualStreamerId перед вызовом API
      if (!actualStreamerId) {
        console.error('❌ Не указан actualStreamerId для воспроизведения трека');
        alert('Не удается воспроизвести трек: отсутствует идентификатор стримера');
        return;
      }
      
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerId: actualStreamerId, trackId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn('⚠️ Play error:', data.error);
        if (data.error?.includes('already played') || data.error?.includes('already playing')) {
          alert('Трек уже обработан. Обновляем очередь...');
          await fetchQueue(false);
        } else {
          alert(data.error || 'Ошибка воспроизведения');
        }
        return;
      }

      console.log('✅ Track started:', data);
      setTracks(prevTracks =>
        prevTracks.map(t =>
          t.id === trackId ? { ...t, status: 'playing' as const } : t
        )
      );
      setTimeout(() => fetchQueue(false), 2000);

    } catch (err) {
      console.error('❌ Play error:', err);
      alert('Ошибка сети');
    } finally {
      setPlayingTrackId(null);
    }
  };

  if (isLoading && tracks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Загрузка очереди...</p>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">🎵 Очередь треков</h2>
        <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
          {tracks.length} треков
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {(tracks && tracks.length > 0) ? (
        <div className="space-y-3">
          {tracks.map((item) => {
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
                      {getTrackArtist(item)} {/* Bug #4 fix: use helper with fallback */}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {getTrackTitle(item)} {/* Bug #4 fix: use helper with fallback */}
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
    </div>
  );
}

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
