'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnailUrl?: string | null;
}

interface CurrentTrackProps {
  className?: string;
}

export function CurrentTrack({ className = '' }: CurrentTrackProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadCurrentTrack = async () => {
      try {
        const response = await fetch('/api/queue/current');
        const data = await response.json();

        if (data.success) {
          setCurrentTrack(data.currentTrack);
        } else {
          setError(data.error || 'Ошибка при загрузке текущего трека');
        }
      } catch (err) {
        console.error('Error loading current track:', err);
        setError('Не удалось загрузить текущий трек');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentTrack();

    // Автоматическое обновление каждые 5 секунд
    const intervalId = setInterval(loadCurrentTrack, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Извлечение ID из URL
  const getVideoId = (url: string, provider: string): string | null => {
    if (provider === 'youtube') {
      const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
      return match ? match[1] : null;
    }
    return null;
  };

  // Получение URL миниатюры
  const getThumbnailUrl = (track: Track): string => {
    if (track.thumbnailUrl) return track.thumbnailUrl;
    
    if (track.provider === 'youtube' && track.id) {
      return `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`;
    }
    
    return '/placeholder-track.png';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-red-500 ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <div className="w-16 h-16 mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Очередь пуста</p>
      </div>
    );
  }

  const videoId = getVideoId(currentTrack.url, currentTrack.provider);
  const thumbnailUrl = getThumbnailUrl(currentTrack);

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="relative aspect-video bg-black">
        {videoId && (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1`}
            title="Current Track"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {!videoId && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <p className="text-white text-sm">Воспроизведение не поддерживается для этого провайдера</p>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
            <Image
              src={thumbnailUrl}
              alt={currentTrack.title || 'Track thumbnail'}
              fill
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjM2M0MTUwIi8+PC9zdmc+"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
              {currentTrack.title || 'Без названия'}
            </h3>
            <p className="text-gray-600 truncate mb-2">
              {currentTrack.artist || 'Неизвестный исполнитель'}
            </p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-full capitalize">
                {currentTrack.provider}
              </span>
              <span className="truncate max-w-[150px]">
                {currentTrack.url}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
