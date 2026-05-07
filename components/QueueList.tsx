'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface QueueTrack {
  id: string;
  status: 'pending' | 'playing' | 'played' | 'skipped';
  created_at: string;
  tracks: {
    id: string;
    title: string;
    artist: string;
    url: string;
    thumbnail_url: string;
  };
  donation: {
    id: string;
    donor_name: string;
    amount: number;
  };
}

interface QueueListProps {
  streamerId: string;
}

export default function QueueList({ streamerId }: QueueListProps) {
  const [tracks, setTracks] = useState<QueueTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ✅ useState для UI — вызывает ре-рендер кнопки
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const isMounted = useRef(true);
  // useRef только для защиты от двойных кликов (не для UI)
  const processingRef = useRef<string | null>(null);

  const fetchQueue = useCallback(async (showLoader = false) => {
    if (!isMounted.current) return;
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoader) setIsLoading(true);
      setError(null);

      // ✅ Сначала создаём новый контроллер, потом отменяем старый
      const newAbortController = new AbortController();
      const oldAbortController = abortControllerRef.current;
      abortControllerRef.current = newAbortController;
      if (oldAbortController) oldAbortController.abort();

      const response = await fetch(`/api/queue?streamerId=${streamerId}`, {
        signal: newAbortController.signal,
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('📥 Fetched queue:', data);

      if (isMounted.current) {
        setTracks(data.tracks || []);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        isFetchingRef.current = false;
        setIsLoading(false);
        return;
      }
      console.error('❌ Error fetching queue:', err);
      if (isMounted.current) {
        setError('Ошибка загрузки очереди');
      }
    } finally {
      if (isMounted.current) {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [streamerId]);

  useEffect(() => {
    isMounted.current = true;
    console.log('🔄 Starting queue polling for streamer:', streamerId);
    fetchQueue(true);
    const interval = setInterval(() => fetchQueue(false), 15000);

    return () => {
      console.log('🛑 Stopping queue polling');
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      isMounted.current = false;
    };
  }, [fetchQueue, streamerId]);

  const handlePlay = async (queueId: string) => {
    // ✅ Защита от двойного клика
    if (loadingTrackId || processingRef.current === queueId) return;

    processingRef.current = queueId;
    // ✅ useState триггерит ре-рендер кнопки (useRef не триггерит)
    setLoadingTrackId(queueId);

    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ Передаём queueId (ID записи в queue), не trackId
        body: JSON.stringify({ queueId, streamerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn('⚠️ Play error:', data.error);

        if (response.status === 400) {
          const statusMessages: Record<string, string> = {
            playing: 'Трек уже воспроизводится',
            played: 'Трек уже воспроизведён',
            skipped: 'Трек был пропущен',
          };
          const msg = data.currentStatus
            ? statusMessages[data.currentStatus] || `Статус: ${data.currentStatus}`
            : data.error || 'Трек уже обработан';
          alert(`${msg}. Обновляем очередь...`);
          await fetchQueue(false);
        } else if (response.status === 409) {
          // Race condition — просто синхронизируемся
          await fetchQueue(false);
        } else if (response.status === 429) {
          alert('Слишком много запросов. Подождите немного.');
        } else {
          alert(data.error || `Ошибка воспроизведения (${response.status})`);
        }
        return;
      }

      console.log('✅ Track started:', data);
      // Немедленно синхронизируем с БД
      await fetchQueue(false);

    } catch (err: any) {
      console.error('❌ Play error:', err);
      if (err.name !== 'AbortError') {
        alert('Ошибка сети');
      }
    } finally {
      // ✅ Всегда сбрасываем оба состояния
      if (isMounted.current) {
        setLoadingTrackId(null);
      }
      processingRef.current = null;
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

  if (error && tracks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => fetchQueue(true)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Повторить
        </button>
      </div>
    );
  }

  const pendingTracks = tracks.filter(t => t.status === 'pending');
  const playingTrack = tracks.find(t => t.status === 'playing');

  return (
    <div className="space-y-6">
      {playingTrack && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <h3 className="font-bold text-green-800 mb-2">▶️ Сейчас играет</h3>
          <div>
            <p className="font-semibold">{playingTrack.tracks?.title || 'Неизвестный трек'}</p>
            <p className="text-sm text-gray-600">{playingTrack.tracks?.artist || 'Неизвестный исполнитель'}</p>
            <p className="text-xs text-gray-500">От: {playingTrack.donation?.donor_name || 'Аноним'}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold mb-3">Очередь ({pendingTracks.length})</h3>

        {pendingTracks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Очередь пуста</p>
        ) : (
          <div className="space-y-2">
            {pendingTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center justify-between bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{track.tracks?.title || 'Неизвестный трек'}</p>
                      <p className="text-sm text-gray-600">{track.tracks?.artist || 'Неизвестный исполнитель'}</p>
                      <p className="text-xs text-gray-500">От: {track.donation?.donor_name || 'Аноним'}</p>
                    </div>
                  </div>
                </div>

                {/* ✅ loadingTrackId (useState) корректно обновляет кнопку */}
                <button
                  onClick={() => handlePlay(track.id)}
                  disabled={!!loadingTrackId}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    loadingTrackId === track.id
                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                      : loadingTrackId
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {loadingTrackId === track.id ? 'Запуск...' : '▶ Играть'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p>StreamerID: {streamerId}</p>
          <p>Total tracks: {tracks.length}</p>
          <p>Last update: {new Date().toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}
