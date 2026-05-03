// Модуль для парсинга метаданных треков из различных источников

interface YouTubeMetadata {
  title: string;
  artist: string;
  thumbnail_url: string;
  duration: number | null;
}

interface SoundCloudMetadata {
  title: string;
  artist: string;
  thumbnail_url: string | null;
  duration: number | null;
}

/**
 * Извлекает video ID из YouTube URL
 */
export function parseYouTubeUrl(url: string): string | null {
  try {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('YouTube URL parse error:', error);
    return null;
  }
}

/**
 * Получает метаданные из YouTube через oEmbed (без API ключа)
 * oEmbed не возвращает duration, поэтому он будет null
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      title: data.title,
      artist: data.author_name,
      thumbnail_url: data.thumbnail_url,
      duration: null // oEmbed не возвращает duration
    };
  } catch (error) {
    console.error('YouTube metadata fetch error:', error);
    throw error;
  }
}

/**
 * Извлекает track URL из SoundCloud URL
 */
export function parseSoundCloudUrl(url: string): string | null {
  try {
    // SoundCloud oEmbed требует полный URL трека
    const regex = /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    
    if (match) {
      return `https://soundcloud.com/${match[1]}/${match[2]}`;
    }
    
    // Проверяем прямой oEmbed URL
    const oembedRegex = /soundcloud\.com\/oembed/;
    if (oembedRegex.test(url)) {
      return url;
    }
    
    return null;
  } catch (error) {
    console.error('SoundCloud URL parse error:', error);
    return null;
  }
}

/**
 * Получает метаданные из SoundCloud через oEmbed
 */
export async function fetchSoundCloudMetadata(url: string): Promise<SoundCloudMetadata> {
  try {
    const response = await fetch(
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    
    if (!response.ok) {
      throw new Error(`SoundCloud oEmbed request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      title: data.title,
      artist: data.author_name,
      thumbnail_url: data.thumbnail_url,
      duration: data.duration ? data.duration / 1000 : null
    };
  } catch (error) {
    console.error('SoundCloud metadata fetch error:', error);
    throw error;
  }
}

/**
 * Определяет провайдер по URL и вызывает соответствующую функцию парсинга
 */
export async function fetchMetadataFromUrl(url: string) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = parseYouTubeUrl(url);
    if (!videoId) throw new Error('Не удалось извлечь video ID из YouTube URL');
    return await fetchYouTubeMetadata(videoId);
  }
  
  if (url.includes('soundcloud.com')) {
    const soundCloudUrl = parseSoundCloudUrl(url);
    if (!soundCloudUrl) throw new Error('Не удалось извлечь URL из SoundCloud URL');
    return await fetchSoundCloudMetadata(soundCloudUrl);
  }
  
  throw new Error(`Неизвестный провайдер для URL: ${url}`);
}
