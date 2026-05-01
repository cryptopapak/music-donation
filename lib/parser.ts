import { z } from 'zod';

// Схемы валидации URL
const YouTubeSchema = z.object({
  provider: z.literal('youtube'),
  id: z.string(),
  type: z.enum(['video', 'playlist']),
  url: z.string().url(),
});

const SpotifySchema = z.object({
  provider: z.literal('spotify'),
  id: z.string(),
  type: z.enum(['track', 'album', 'playlist']),
  url: z.string().url(),
});

const SoundCloudSchema = z.object({
  provider: z.literal('soundcloud'),
  id: z.string(),
  type: z.literal('track'),
  url: z.string().url(),
});

// Общая схема для трека
export const TrackSchema = z.object({
  provider: z.enum(['youtube', 'spotify', 'soundcloud']),
  id: z.string(),
  type: z.string(),
  url: z.string().url(),
  title: z.string().optional().nullable(),
  artist: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z.number().optional().nullable(),
});

export type Track = z.infer<typeof TrackSchema>;

// Парсер YouTube
export function parseYouTubeUrl(url: string): Track | null {
  try {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const match = url.match(regex);
    
    if (!match) return null;
    
    const videoId = match[1];
    
    return {
      provider: 'youtube',
      id: videoId,
      type: 'video',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: null,
      artist: null,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: null,
    };
  } catch (error) {
    console.error('YouTube parse error:', error);
    return null;
  }
}

// Парсер Spotify
export function parseSpotifyUrl(url: string): Track | null {
  try {
    const regex = /spotify\.com\/(?:track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    
    if (!match) return null;
    
    const id = match[1];
    const type = url.includes('/track/') ? 'track' : url.includes('/album/') ? 'album' : 'playlist';
    
    return {
      provider: 'spotify',
      id,
      type,
      url,
      title: null,
      artist: null,
      thumbnailUrl: null,
      duration: null,
    };
  } catch (error) {
    console.error('Spotify parse error:', error);
    return null;
  }
}

// Парсер SoundCloud
export function parseSoundCloudUrl(url: string): Track | null {
  try {
    const regex = /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    
    if (!match) return null;
    
    const user = match[1];
    const track = match[2];
    
    return {
      provider: 'soundcloud',
      id: `${user}-${track}`,
      type: 'track',
      url,
      title: null,
      artist: null,
      thumbnailUrl: null,
      duration: null,
    };
  } catch (error) {
    console.error('SoundCloud parse error:', error);
    return null;
  }
}

// Главная функция парсинга
export function parseTrackUrl(url: string): Track | null {
  const trimmedUrl = url.trim();
  
  // YouTube
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    return parseYouTubeUrl(trimmedUrl);
  }
  
  // Spotify
  if (trimmedUrl.includes('spotify.com')) {
    return parseSpotifyUrl(trimmedUrl);
  }
  
  // SoundCloud
  if (trimmedUrl.includes('soundcloud.com')) {
    return parseSoundCloudUrl(trimmedUrl);
  }
  
  return null;
}

// Функция нормализации трека
export function normalizeTrack(track: Track): Track {
  return {
    ...track,
    url: track.url.toLowerCase().trim(),
    title: track.title?.trim() || null,
    artist: track.artist?.trim() || null,
    thumbnailUrl: track.thumbnailUrl?.trim() || null,
  };
}

// Валидация URL
export function isValidTrackUrl(url: string): boolean {
  return parseTrackUrl(url) !== null;
}

// Валидация суммы доната
export function isValidDonationAmount(amount: number): boolean {
  return amount >= 10 && amount <= 100000;
}
