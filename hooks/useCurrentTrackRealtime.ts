import { useEffect, useState } from 'react';
import { getCurrentTrack, setCurrentTrack } from '@/lib/storage';

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnailUrl?: string | null;
}

export function useCurrentTrackRealtime() {
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Начальная загрузка текущего трека
    const loadCurrentTrack = async () => {
      try {
        const track = getCurrentTrack();
        
        if (track) {
          setCurrentTrackState(track);
        }
      } catch (err: any) {
        setError('Ошибка при загрузке текущего трека');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentTrack();
  }, []);

  return {
    currentTrack,
    isLoading,
    error,
  };
}
