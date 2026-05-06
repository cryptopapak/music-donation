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

  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const playingRef = useRef<string | null>(null); // Changed from useState to useRef
  const isMounted = useRef(true); // Added mountedRef for memory leak prevention
  // Processing queue ID to prevent concurrent requests on same track
  const processingRef = useRef<string | null>(null);

  console.log('🎵 QueueList component rendered');

  const fetchQueue = useCallback(async (showLoader = false) => {
    if (!isMounted.current) return; // Check if component is still mounted
    
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoader) setIsLoading(true);
      setError(null);

      // First create the new controller and store it in the ref
      const newAbortController = new AbortController();
      const oldAbortController = abortControllerRef.current;
      abortControllerRef.current = newAbortController;

      // Then abort the old controller if it exists
      if (oldAbortController) {
        oldAbortController.abort();
      }

      const response = await fetch(`/api/queue?streamerId=${streamerId}`, {
        signal: newAbortController.signal,
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('📥 Fetched queue:', data);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setTracks(data.tracks || []);
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        // Reset the fetching flag immediately to allow new requests
        isFetchingRef.current = false;
        setIsLoading(false);
        return;
      }
      console.error('❌ Error fetching queue:', err);
      // Only update error state if component is still mounted
      if (isMounted.current) {
        setError('Ошибка загрузки очереди');
      }
    } finally {
      // Only update loading states if component is still mounted
      if (isMounted.current) {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [streamerId]);

  useEffect(() => {
    // Initialize mounted ref
    isMounted.current = true;
    
    console.log('🔄 Starting queue polling for streamer:', streamerId);
    fetchQueue(true);
    const interval = setInterval(() => fetchQueue(false), 15000);
    
    return () => {
      console.log('🛑 Stopping queue polling');
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Mark component as unmounted
      isMounted.current = false;
    };
  }, [fetchQueue, streamerId]);

  const handlePlay = async (trackId: string) => {
    // Prevent double clicks and concurrent requests for same track
    if (playingRef.current || processingRef.current === trackId) {
      if (processingRef.current !== trackId) {
        alert('Дождитесь завершения текущего трека');
      }
      return;
    }

    // Mark this track as being processed
    processingRef.current = trackId;

    try {
      // Update ref immediately for sync access
      playingRef.current = trackId;
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerId, trackId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn('⚠️ Play error:', data.error);
        // Improved error handling
        if (response.status === 400) {
          if (data.currentStatus) {
            let statusMessage = '';
            if (data.currentStatus === 'playing') {
              statusMessage = 'Трек уже воспроизводится';
            } else if (data.currentStatus === 'played') {
              statusMessage = 'Трек уже воспроизведен';
            } else if (data.currentStatus === 'skipped') {
              statusMessage = 'Трек был пропущен';
            } else {
              statusMessage = `Трек находится в статусе: ${data.currentStatus}`;
            }
            
            alert(`${statusMessage}. Автоматическое обновление очереди...`);
          } else {
            alert(data.error || 'Трек уже обработан. Обновляем очередь...');
          }
          // Refresh queue to sync state with DB
          await fetchQueue(false);
        } else if (response.status === 429) {
          alert('Слишком много запросов. Пожалуйста, подождите немного.');
        } else {
          alert(data.error || `Ошибка воспроизведения (${response.status})`);
        }
        return;
      }

      console.log('✅ Track started:', data);
      // Only update state if component is mounted
      if (isMounted.current) {
        setTracks(prevTracks =>
          prevTracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  status: 'playing' as const,
                  // Обновляем также вложенные объекты если нужно
                }
              : t
          )
        );
      }
      
      // Use immediate fetch instead of timeout
      await fetchQueue(false);

    } catch (err: any) {
      console.error('❌ Play error:', err);
      if (err.name !== 'AbortError') {
        alert('Ошибка сети');
      }
    } finally {
      // Reset the refs immediately
      if (playingRef.current === trackId) {
        playingRef.current = null;
      }
      if (processingRef.current === trackId) {
        processingRef.current = null;
      }
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

  // Дебаг информации перед рендером
  console.log('🔍 [DEBUG JSX] tracks.length:', tracks.length);
  if (tracks.length > 0) {
    console.log('🔍 [DEBUG JSX] track[0]:', tracks[0]);
    console.log('🔍 [DEBUG JSX] track[0]?.tracks?.title:', tracks[0]?.tracks?.title);
    console.log('🔍 [DEBUG JSX] track[0]?.donation?.donor_name:', tracks[0]?.donation?.donor_name);
    console.log('🔍 [DEBUG JSX] pendingTracks.length:', pendingTracks.length);
    console.log('🔍 [DEBUG JSX] playingTrack:', playingTrack);
  }

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

                <button
                  onClick={() => handlePlay(track.id)}
                  disabled={!!playingRef.current}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    playingRef.current === track.id
                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                      : playingRef.current
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {playingRef.current === track.id ? 'Загрузка...' : 'Играть'}
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
