export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      donations: {
        Row: {
          id: string;
          user_id: string | null;
          amount: number;
          track_url: string;
          track_title: string | null;
          track_artist: string | null;
          provider: string;
          payment_id: string | null;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          amount: number;
          track_url: string;
          track_title?: string | null;
          track_artist?: string | null;
          provider?: string;
          payment_id?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          amount?: number;
          track_url?: string;
          track_title?: string | null;
          track_artist?: string | null;
          provider?: string;
          payment_id?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          url: string;
          provider: string;
          title: string | null;
          artist: string | null;
          thumbnail_url: string | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          provider: string;
          title?: string | null;
          artist?: string | null;
          thumbnail_url?: string | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          provider?: string;
          title?: string | null;
          artist?: string | null;
          thumbnail_url?: string | null;
          duration?: number | null;
          created_at?: string;
        };
      };
      queue: {
        Row: {
          id: string;
          track_id: string;
          donation_id: string;
          position: number;
          status: 'pending' | 'playing' | 'played' | 'skipped';
          priority_score: number;
          votes_count: number;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          donation_id: string;
          position: number;
          status?: 'pending' | 'playing' | 'played' | 'skipped';
          priority_score?: number;
          votes_count?: number;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          donation_id?: string;
          position?: number;
          status?: 'pending' | 'playing' | 'played' | 'skipped';
          priority_score?: number;
          votes_count?: number;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Константы для ограничений
export const MAX_TRACK_DURATION = 600; // 10 минут в секундах

/**
 * Определяет провайдера из URL трека
 */
function getProviderFromUrl(url: string): 'youtube' | 'soundcloud' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  return 'youtube'; // fallback по умолчанию
}

// Получение blacklist из .env (разделенные запятыми)
const ENV_BLACKLIST_ARTISTS = process.env.BLACKLIST_ARTISTS
  ? process.env.BLACKLIST_ARTISTS.split(',').map(s => s.trim())
  : [];
const ENV_BLACKLIST_KEYWORDS = process.env.BLACKLIST_KEYWORDS
  ? process.env.BLACKLIST_KEYWORDS.split(',').map(s => s.trim())
  : [];

// Используем env переменные, если они заданы, иначе дефолтные значения
export const DEFAULT_BLACKLIST_ARTISTS = ENV_BLACKLIST_ARTISTS.length > 0 ? ENV_BLACKLIST_ARTISTS : ['nsfw', 'explicit'];
export const DEFAULT_BLACKLIST_KEYWORDS = ENV_BLACKLIST_KEYWORDS.length > 0 ? ENV_BLACKLIST_KEYWORDS : ['nsfw', 'explicit'];

/**
 * Проверяет, есть ли трек в blacklist стримера
 */
export function isTrackInBlacklist(
  title: string | null,
  artist: string | null,
  blacklistArtists: string[] = DEFAULT_BLACKLIST_ARTISTS,
  blacklistKeywords: string[] = DEFAULT_BLACKLIST_KEYWORDS
): boolean {
  const titleLower = title?.toLowerCase() || '';
  const artistLower = artist?.toLowerCase() || '';
  const combined = `${titleLower} ${artistLower}`;

  // Проверка артистов в blacklist
  for (const blockedArtist of blacklistArtists) {
    if (artistLower.includes(blockedArtist.toLowerCase())) {
      return true;
    }
  }

  // Проверка ключевых слов в blacklist
  for (const keyword of blacklistKeywords) {
    if (combined.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Проверяет, превышает ли трек максимальную длительность
 */
export function isTrackTooLong(duration: number | null, maxDuration: number = MAX_TRACK_DURATION): boolean {
  if (duration === null || duration === undefined) {
    // Если длительность неизвестна, считаем, что не превышает (проверка при воспроизведении)
    return false;
  }
  return duration > maxDuration;
}

// Добавление трека в очередь (используется для webhook)
export async function addTrackToQueue(donationId: string) {
  console.log(`💰 [ADD TO QUEUE] Начало добавления трека в очередь для donation_id=${donationId}`);
  const { supabaseAdmin } = await import('@/lib/supabase');
  const { fetchMetadataFromUrl } = await import('@/lib/metadata-parser');
  
  // Получение доната
  console.log(`💰 [ADD TO QUEUE] Поиск доната с id=${donationId} и статусом=completed`);
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .eq('status', 'completed')
    .single();

  if (donationError) {
    console.error(`❌ [ADD TO QUEUE] Donation select error:`, donationError);
    console.error(`❌ [ADD TO QUEUE] Донат с id=${donationId} не найден или статус не 'completed'`);
    throw new Error('Failed to find donation');
  }
  console.log(`✅ [ADD TO QUEUE] Донат найден: id=${donation.id}, amount=${donation.amount}, track=${donation.track_url}`);

  // Определение провайдера из URL
  const provider = getProviderFromUrl(donation.track_url);

  // Создание/получение трека
  console.log(`💰 [ADD TO QUEUE] Создание/получение трека для URL: ${donation.track_url}`);
  const { data: track, error: trackError } = await supabaseAdmin
    .from('tracks')
    .upsert(
      {
        url: donation.track_url,
        provider: provider,
      },
      { onConflict: 'url' }
    )
    .select()
    .single();

  if (trackError) {
    console.error(`❌ [ADD TO QUEUE] Track upsert error:`, trackError);
    throw new Error('Failed to create track');
  }
  console.log(`✅ [ADD TO QUEUE] Трек создан/найден: id=${track.id}`);

  // Попытка получить метаданные
  try {
    const metadata = await fetchMetadataFromUrl(donation.track_url);
    
    // Обновление трека метаданными
    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update({
        title: metadata.title,
        artist: metadata.artist,
        thumbnail_url: metadata.thumbnail_url,
        duration: metadata.duration
      })
      .eq('id', track.id);

    if (updateError) {
      console.error('Track metadata update error:', updateError);
    }

    // Проверка blacklist
    if (isTrackInBlacklist(metadata.title, metadata.artist)) {
      console.warn(`❌ Трек "${metadata.title}" от "${metadata.artist}" в blacklist`);
      throw new Error('Трек находится в blacklist');
    }

    // Проверка длительности
    if (isTrackTooLong(metadata.duration)) {
      console.warn(`❌ Трек "${metadata.title}" слишком длинный: ${metadata.duration} сек`);
      throw new Error(`Максимальная длительность трека: ${MAX_TRACK_DURATION / 60} минут`);
    }
  } catch (metadataError) {
    console.error('Failed to fetch metadata for track:', metadataError);
    // Не прерываем выполнение, если не удалось получить метаданные
  }

  // Получаем сумму доната для расчета приоритета
  console.log(`💰 [ADD TO QUEUE] Расчет приоритета для доната id=${donationId}`);
  const { data: donationData, error: donationDataError } = await supabaseAdmin
    .from('donations')
    .select('amount')
    .eq('id', donationId)
    .single();

  const priorityScore = donationData ? Math.floor(donationData.amount / 100) : 0;
  console.log(`💰 [ADD TO QUEUE] priorityScore: ${priorityScore}`);

  // Добавление в очередь
  console.log(`💰 [ADD TO QUEUE] Добавление в очередь: track_id=${track.id}, donation_id=${donation.id}`);
  const { error: queueError } = await supabaseAdmin
    .from('queue')
    .insert({
      track_id: track.id,
      donation_id: donation.id,
      position: 1,
      status: 'pending',
      priority_score: priorityScore,
      votes_count: 0,
    });

  if (queueError) {
    console.error(`❌ [ADD TO QUEUE] Queue insert error:`, queueError);
    throw new Error('Failed to add to queue');
  }
  console.log(`✅ [ADD TO QUEUE] Трек успешно добавлен в очередь!`);
}

/**
 * Запускает трек, сначала останавливая все играющие треки
 * 1. Находит все треки со статусом 'playing'
 * 2. Обновляет их на 'played' с ended_at = NOW()
 * 3. Запускает новый трек со статусом 'playing'
 */
export async function startPlayingTrack(queueId: string) {
  const { supabaseAdmin } = await import('@/lib/supabase');

  try {
    // 1. Останавливаем всё, что сейчас играет
    const { error: stopError } = await supabaseAdmin
      .from('queue')
      .update({
        status: 'played',
        ended_at: new Date().toISOString()
      })
      .eq('status', 'playing');

    if (stopError) {
      console.error('Error stopping playing tracks:', stopError);
      throw new Error('Failed to stop playing tracks');
    }

    // 2. Запускаем новый трек
    const { error: startError } = await supabaseAdmin
      .from('queue')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (startError) {
      console.error('Error starting track:', startError);
      throw new Error('Failed to start track');
    }

    return true;
  } catch (error) {
    console.error('Error in startPlayingTrack:', error);
    throw error;
  }
}

/**
 * Получает текущий играющий трек
 */
export async function getCurrentPlayingTrack() {
  const { supabaseAdmin } = await import('@/lib/supabase');

  try {
    const { data: queueItem, error } = await supabaseAdmin
      .from('queue')
      .select(`
        id,
        status,
        position,
        priority_score,
        votes_count,
        started_at,
        ended_at,
        tracks (
          id,
          url,
          provider,
          title,
          artist,
          thumbnail_url,
          duration
        ),
        donation:donations (
          id,
          amount,
          donor_name,
          created_at
        )
      `)
      .eq('status', 'playing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Current track fetch error:', error);
      return null;
    }

    return queueItem;
  } catch (error) {
    console.error('Error getting current track:', error);
    return null;
  }
}
