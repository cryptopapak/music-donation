// In-memory storage для быстрого запуска (без Supabase)
// Используется когда NEXT_PUBLIC_USE_MOCK=true

interface Track {
  id: string;
  url: string;
  provider: string;
  title?: string | null;
  artist?: string | null;
  thumbnailUrl?: string | null;
}

interface Donation {
  id: string;
  amount: number;
  trackUrl: string;
  trackTitle?: string | null;
  trackArtist?: string | null;
  provider: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

interface QueueItem {
  id: string;
  trackId: string;
  donationId: string;
  position: number;
  status: 'pending' | 'playing' | 'played' | 'skipped';
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

// Хранилище данных
let donations: Donation[] = [];
let tracks: Track[] = [];
let queue: QueueItem[] = [];
let currentTrack: Track | null = null;

// Генерация ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Донаты
export function createDonation(amount: number, trackUrl: string, trackTitle?: string, trackArtist?: string, provider: string = 'mock'): Donation {
  const donation: Donation = {
    id: generateId(),
    amount,
    trackUrl,
    trackTitle: trackTitle || null,
    trackArtist: trackArtist || null,
    provider,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  donations.push(donation);
  return donation;
}

export function getDonations() {
  return donations;
}

// Треки
export function getOrCreateTrack(url: string, provider: string, title?: string, artist?: string): Track {
  let track = tracks.find(t => t.url === url);
  if (!track) {
    track = {
      id: generateId(),
      url,
      provider,
      title: title || null,
      artist: artist || null,
      thumbnailUrl: null,
    };
    tracks.push(track);
  }
  return track;
}

export function getTracks() {
  return tracks;
}

// Очередь
export function addToQueue(trackId: string, donationId: string): QueueItem {
  const position = queue.filter(q => q.status === 'pending').length + 1;
  const queueItem: QueueItem = {
    id: generateId(),
    trackId,
    donationId,
    position,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  queue.push(queueItem);
  return queueItem;
}

export function getQueue() {
  return queue;
}

export function updateQueueStatus(queueId: string, status: 'playing' | 'played' | 'skipped'): QueueItem | null {
  // Если статус меняется на 'playing', сначала останавливаем всё, что сейчас играет
  if (status === 'playing') {
    queue.forEach((q) => {
      if (q.status === 'playing') {
        q.status = 'played';
        q.endedAt = new Date().toISOString();
      }
    });
  }
  
  const item = queue.find(q => q.id === queueId);
  if (!item) return null;
  
  item.status = status;
  item.startedAt = status === 'playing' ? new Date().toISOString() : null;
  item.endedAt = status === 'played' ? new Date().toISOString() : null;
  
  // Обновляем позиции
  if (status === 'played' || status === 'skipped') {
    queue.forEach((q, index) => {
      if (q.status === 'pending') {
        q.position = index + 1;
      }
    });
  }
  
  return item;
}

export function getCurrentTrack(): Track | null {
  return currentTrack;
}

export function setCurrentTrack(track: Track | null) {
  currentTrack = track;
}

// Очистка (для тестов)
export function clearStorage() {
  donations = [];
  tracks = [];
  queue = [];
  currentTrack = null;
}
