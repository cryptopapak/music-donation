'use client';

import { useState, useEffect } from 'react';

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnail_url?: string | null;
}

interface DonorInfo {
  name?: string | null;
  amount?: number | null;
}

export default function OverlayPage() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [donorInfo, setDonorInfo] = useState<DonorInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [settings, setSettings] = useState({
    opacity: 100,
    fontSize: 24,
    position: 'top-left',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Загрузка настроек из localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('overlaySettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Ошибка парсинга настроек:', e);
      }
    }
  }, []);

  // Сохранение настроек в localStorage
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
  };

  // Обработка горячей клавиши S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setIsSettingsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Загрузка текущего трека
  useEffect(() => {
    const loadCurrentTrack = async () => {
      try {
        const response = await fetch('/api/queue/current');
        const data = await response.json();

        if (data.success) {
          setCurrentTrack(data.currentTrack);
          setDonorInfo(data.donorInfo);
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

  const getPositionClass = () => {
    switch (settings.position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 left-4';
    }
  };

  const getOpacityStyle = () => ({
    opacity: settings.opacity / 100,
  });

  const getTextStyle = () => ({
    fontSize: `${settings.fontSize}px`,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      {/* Основной дисплей трека */}
      <div
        className={`fixed ${getPositionClass()} transition-all duration-300`}
        style={getOpacityStyle()}
      >
        {currentTrack ? (
          <div className="bg-black/50 rounded-lg p-4 text-white">
            <div className="flex items-start gap-3">
              {/* Миниатюра трека */}
              <div className="w-24 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                <img
                  src={currentTrack.thumbnail_url || '/placeholder-track.png'}
                  alt={currentTrack.title || 'Трек'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Информация о треке */}
              <div className="flex-1 min-w-0" style={getTextStyle()}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎵</span>
                  <h2 className="font-bold truncate">
                    {currentTrack.title || 'Без названия'}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎤</span>
                  <p className="truncate">
                    {currentTrack.artist || 'Неизвестный артист'}
                  </p>
                </div>

                {/* Информация о донате (если есть) */}
                {donorInfo?.name && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl">💰</span>
                    <p className="text-green-400">
                      {donorInfo.amount} ₽ — {donorInfo.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black/50 rounded-lg p-4 text-white">
            <p className="text-gray-400">Сейчас ничего не играет</p>
          </div>
        )}
      </div>

      {/* Панель настроек (скрыта по умолчанию) */}
      {isSettingsOpen && (
        <div className="fixed top-4 right-4 bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-xl z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">Настройки Overlay</h3>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Настройка прозрачности */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Прозрачность: {settings.opacity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.opacity}
              onChange={(e) =>
                saveSettings({ ...settings, opacity: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Настройка размера шрифта */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Размер шрифта: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="14"
              max="48"
              value={settings.fontSize}
              onChange={(e) =>
                saveSettings({ ...settings, fontSize: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Настройка позиции */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Позиция:</label>
            <select
              value={settings.position}
              onChange={(e) =>
                saveSettings({
                  ...settings,
                  position: e.target.value as any,
                })
              }
              className="w-full bg-gray-800 text-white rounded p-2"
            >
              <option value="top-left">Сверху слева</option>
              <option value="top-right">Сверху справа</option>
              <option value="bottom-left">Снизу слева</option>
              <option value="bottom-right">Снизу справа</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Нажмите <kbd className="bg-gray-700 px-1 rounded">S</kbd> чтобы
            скрыть/показать панель
          </div>
        </div>
      )}

      {/* Индикатор горячей клавиши */}
      <div className="fixed bottom-4 right-4 text-gray-500 text-sm">
        Нажмите <kbd className="bg-gray-800 px-2 py-1 rounded">S</kbd> для
        настроек
      </div>
    </div>
  );
}
