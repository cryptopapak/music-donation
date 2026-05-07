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
          donor_name: string | null;
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
          donor_name?: string | null;
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
          donor_name?: string | null;
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

export const MAX_TRACK_DURATION = 600; // 10 минут в секундах

function getProviderFromUrl(url: string): 'youtube' | 'soundcloud' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'youtube';
}

const ENV_BLACKLIST_ARTISTS = process.env.BLACKLIST_ARTISTS
  ? process.env.BLACKLIST_ARTISTS.split(',').map(s => s.trim())
  : [];
const ENV_BLACKLIST_KEYWORDS = process.env.BLACKLIST_KEYWORDS
  ? process.env.BLACKLIST_KEYWORDS.split(',').map(s => s.trim())
  : [];

export const DEFAULT_BLACKLIST_ARTISTS = ENV_BLACKLIST_ARTISTS.length > 0 ? ENV_BLACKLIST_ARTISTS : ['nsfw', 'explicit'];
export const DEFAULT_BLACKLIST_KEYWORDS = ENV_BLACKLIST_KEYWORDS.length > 0 ? ENV_BLACKLIST_KEYWORDS : ['nsfw', 'explicit'];

export function isTrackInBlacklist(
  title: string | null,
  artist: string | null,
  blacklistArtists: string[] = DEFAULT_BLACKLIST_ARTISTS,
  blacklistKeywords: string[] = DEFAULT_BLACKLIST_KEYWORDS
): boolean {
  const titleLower = title?.toLowerCase() || '';
  const artistLower = artist?.toLowerCase() || '';
  const combined = `${titleLower} ${artistLower}`;

  for (const blockedArtist of blacklistArtists) {
    if (artistLower.includes(blockedArtist.toLowerCase())) return true;
  }
  for (const keyword of blacklistKeywords) {
    if (combined.includes(keyword.toLowerCase())) return true;
  }
  return false;
}

export function isTrackTooLong(duration: number | null, maxDuration: number = MAX_TRACK_DURATION): boolean {
  if (duration === null || duration === undefined) return false;
  return duration > maxDuration;
}

export async function addTrackToQueue(donationId: string) {
  console.log(`💰 [ADD TO QUEUE] Начало для donation_id=${donationId}`);

  const { supabaseAdmin } = await import('@/lib/supabase');
  const { fetchMetadataFromUrl } = await import('@/lib/metadata-parser');

  // Получение доната
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .eq('status', 'completed')
    .single();

  if (donationError || !donation) {
    console.error(`❌ [ADD TO QUEUE] Донат не найден или не completed:`, donationError);
    throw new Error('Failed to find donation');
  }
  console.log(`✅ [ADD TO QUEUE] Донат найден: amount=${donation.amount}, url=${donation.track_url}`);

  const provider = getProviderFromUrl(donation.track_url);

  // Создание/получение трека
  const { data: track, error: trackError } = await supabaseAdmin
    .from('tracks')
    .upsert({ url: donation.track_url, provider }, { onConflict: 'url' })
    .select()
    .single();

  if (trackError || !track) {
    console.error(`❌ [ADD TO QUEUE] Track upsert error:`, trackError);
    throw new Error('Failed to create track');
  }
  console.log(`✅ [ADD TO QUEUE] Трек создан/найден: id=${track.id}`);

  // ✅ Получаем метаданные отдельно от blacklist-проверки
  let metadata: { title: string | null; artist: string | null; thumbnail_url: string | null; duration: number | null } | null = null;
  try {
    metadata = await fetchMetadataFromUrl(donation.track_url);
    console.log(`💰 [ADD TO QUEUE] Метаданные:`, metadata);

    await supabaseAdmin
      .from('tracks')
      .update({
        title: metadata.title,
        artist: metadata.artist,
        thumbnail_url: metadata.thumbnail_url,
        duration: metadata.duration,
      })
      .eq('id', track.id);
  } catch (metadataError) {
    // Метаданные не критичны — продолжаем без них
    console.error('❌ [ADD TO QUEUE] Не удалось получить метаданные:', metadataError);
  }

  // ✅ Blacklist и длительность проверяем ПОСЛЕ try/catch — теперь реально блокирует
  if (metadata) {
    if (isTrackInBlacklist(metadata.title, metadata.artist)) {
      console.warn(`❌ [ADD TO QUEUE] Трек в blacklist: "${metadata.title}" - "${metadata.artist}"`);
      throw new Error('Трек находится в blacklist');
    }
    if (isTrackTooLong(metadata.duration)) {
      console.warn(`❌ [ADD TO QUEUE] Трек слишком длинный: ${metadata.duration}с`);
      throw new Error(`Максимальная длительность трека: ${MAX_TRACK_DURATION / 60} минут`);
    }
  }

  // ✅ Приоритет считаем из donation.amount — убираем дублирующий запрос к БД
  const priorityScore = Math.floor(donation.amount / 100);
  console.log(`💰 [ADD TO QUEUE] priorityScore: ${priorityScore}`);

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

export async function startPlayingTrack(queueId: string) {
  console.log('🔄 [START PLAYING] queueId:', queueId);

  const { supabaseAdmin } = await import('@/lib/supabase');

  // Завершаем все текущие playing треки
  const { error: stopError } = await supabaseAdmin
    .from('queue')
    .update({ status: 'played', ended_at: new Date().toISOString() })
    .eq('status', 'playing');

  if (stopError) {
    console.error('❌ [START PLAYING] Остановка треков:', stopError);
  }

  // Запускаем новый трек
  const { data, error } = await supabaseAdmin
    .from('queue')
    .update({ status: 'playing', started_at: new Date().toISOString() })
    .eq('id', queueId)
    .eq('status', 'pending') // Только если ещё pending
    .select()
    .single();

  if (error) {
    console.error('❌ [START PLAYING] Ошибка:', error);
    throw error;
  }

  console.log('🔄 [START PLAYING] Результат:', JSON.stringify(data));
  return data;
}

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
