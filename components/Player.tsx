'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnailUrl?: string | null;
}

interface PlayerProps {}

export function Player({}: PlayerProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerReady, setPlayerReady] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Загрузка YouTube iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };
  }, []);

  // Загрузка текущего трека
  useEffect(() => {
    const loadCurrentTrack = async () => {
      try {
        const response = await fetch('/api/queue/current');
        const data = await response.json();
        
        if (data.success && data.currentTrack) {
          setCurrentTrack(data.currentTrack.tracks);
        }
      } catch (err) {
        console.error('Error loading current track:', err);
      }
    };

    loadCurrentTrack();
  }, []);

  // Управление плеером при изменении трека
  useEffect(() => {
    if (currentTrack && playerReady && playerContainerRef.current) {
      setIsLoading(true);
      
      // Очищаем старый плеер
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      // Создаем новый плеер
      if (currentTrack.provider === 'youtube' && window.YT) {
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          height: '100%',
          width: '100%',
          videoId: currentTrack.id,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            loop: 0,
          },
          events: {
            onReady: () => {
              setIsLoading(false);
              setIsPlaying(true);
            },
            onError: (event: any) => {
              console.error('Player error:', event.data);
              setError('Ошибка воспроизведения трека');
              setIsLoading(false);
            },
            onStateChange: (event: any) => {
              const YT = window.YT;
              if (YT && event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (YT && event.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            },
          },
        });
      }
    }
  }, [currentTrack, playerReady]);

  const getSoundCloudEmbedUrl = (id: string) => {
    return `https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${id}&auto_play=true&visual=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&color=%23ff5500`;
  };

  const renderPlayer = () => {
    if (!currentTrack) return null;

    switch (currentTrack.provider) {
      case 'youtube':
        return (
          <div
            ref={playerContainerRef}
            className="aspect-video rounded-lg overflow-hidden bg-black"
          />
        );
      case 'soundcloud':
        return (
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={getSoundCloudEmbedUrl(currentTrack.id)}
              className="w-full h-full"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              title="SoundCloud Player"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          🎧 Сейчас играет
        </h2>
        {currentTrack && (
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm">
            {isPlaying ? '▶️ Воспроизводится' : '⏸️ Пауза'}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Загрузка трека...</div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
          {error}
        </div>
      )}

      {currentTrack && !isLoading && (
        <div className="space-y-4">
          {/* Информация о треке */}
          <div className="flex items-start gap-4">
            {currentTrack.thumbnailUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800">
                <Image
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title || 'Thumbnail'}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjM2M0MTUwIi8+PC9zdmc+"
                />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {currentTrack.artist || 'Неизвестный исполнитель'}
              </h3>
              <p className="text-slate-300">
                {currentTrack.title || 'Неизвестный трек'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                  {currentTrack.provider}
                </span>
              </div>
            </div>
          </div>

          {/* Плеер */}
          <div className="w-full">{renderPlayer()}</div>
        </div>
      )}

      {!currentTrack && !isLoading && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <svg
            className="w-16 h-16 mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p>Очередь пуста</p>
          <p className="text-sm mt-2">Сделайте донат, чтобы добавить трек</p>
        </div>
      )}
    </div>
  );
}
