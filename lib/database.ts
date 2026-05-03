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

// Добавление трека в очередь (используется для webhook)
export async function addTrackToQueue(donationId: string) {
  const { supabaseAdmin } = await import('@/lib/supabase');
  const { fetchMetadataFromUrl } = await import('@/lib/metadata-parser');
  
  // Получение доната
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .eq('status', 'completed')
    .single();

  if (donationError) {
    console.error('Donation select error:', donationError);
    throw new Error('Failed to find donation');
  }

  // Определение провайдера из URL
  const provider = donation.track_url.includes('youtube.com') || donation.track_url.includes('youtu.be')
    ? 'youtube'
    : 'soundcloud';

  // Создание/получение трека
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
    console.error('Track upsert error:', trackError);
    throw new Error('Failed to create track');
  }

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
  } catch (metadataError) {
    console.error('Failed to fetch metadata for track:', metadataError);
    // Не прерываем выполнение, если не удалось получить метаданные
  }

  // Добавление в очередь
  const { error: queueError } = await supabaseAdmin
    .from('queue')
    .insert({
      track_id: track.id,
      donation_id: donation.id,
      position: 1,
      status: 'pending',
    });

  if (queueError) {
    console.error('Queue insert error:', queueError);
    throw new Error('Failed to add to queue');
  }
}
