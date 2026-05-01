import { useEffect, useState } from 'react';
import { getQueue, updateQueueStatus } from '@/lib/storage';

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

export function useQueueRealtime() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null);

  // Функция загрузки очереди
  const loadInitialQueue = async () => {
    try {
      const queueData = getQueue();
      
      // Преобразуем данные в формат QueueItem
      const formattedQueue: QueueItem[] = queueData.map((item, index) => ({
        id: item.id,
        position: item.position,
        status: item.status,
        started_at: item.startedAt || undefined,
        created_at: item.createdAt,
        tracks: {
          id: item.trackId,
          url: `https://example.com/track/${item.trackId}`,
          provider: 'mock',
          title: null,
          artist: null,
          thumbnail_url: null,
        },
        donations: {
          id: item.donationId,
          amount: 100,
          created_at: item.createdAt,
        },
      }));

      setQueue(formattedQueue);
      
      // Находим текущий играющий трек
      const playingItem = formattedQueue.find((item: QueueItem) => item.status === 'playing');
      if (playingItem) {
        setCurrentTrack(playingItem);
      }
    } catch (err: any) {
      setError('Ошибка при загрузке очереди');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialQueue();
  }, []);

  // Функция для пропуска трека
  const handleSkip = async (queueId: string) => {
    try {
      updateQueueStatus(queueId, 'skipped');
      // Обновляем очередь
      loadInitialQueue();
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  };

  // Функция для воспроизведения трека
  const handlePlay = async (queueId: string) => {
    try {
      updateQueueStatus(queueId, 'playing');
      // Обновляем очередь
      loadInitialQueue();
    } catch (err) {
      console.error('Error playing track:', err);
    }
  };

  return {
    queue,
    isLoading,
    error,
    currentTrack,
    handleSkip,
    handlePlay,
  };
}
