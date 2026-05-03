import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Моки для Supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockIn = jest.fn();

// Хранилище для mock данных
let mockQueueData: any[] = [];
let mockDonationsData: any[] = [];
let mockTracksData: any[] = [];

// Мок для supabase
const mockSupabase = {
  from: (table: string) => {
    mockFrom(table);
    return {
      select: (columns: string, options?: any) => {
        mockSelect(columns, options);
        return {
          in: (column: string, values: any[]) => {
            mockIn(column, values);
            return {
              order: (column: string, options?: { ascending?: boolean }) => {
                mockOrder(column, options);
                return {
                  range: (from: number, to: number) => {
                    mockRange(from, to);
                    // Фильтруем данные по таблице
                    let data = [];
                    if (table === 'queue') {
                      // Если есть фильтрация по track_id, фильтруем
                      if (column === 'track_id' && values) {
                        data = mockQueueData.filter((q: any) => values.includes(q.track_id));
                      } else {
                        data = mockQueueData.slice(from, to + 1);
                      }
                      // Сортируем по created_at если указано
                      if (column === 'created_at' && options?.ascending !== undefined) {
                        data = [...data].sort((a: any, b: any) =>
                          options.ascending
                            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );
                      }
                    } else if (table === 'donations') {
                      data = mockDonationsData.filter((d: any) => values.includes(d.id));
                    } else if (table === 'tracks') {
                      // Сортируем по created_at перед возвратом
                      const sortedData = [...mockTracksData].sort((a: any, b: any) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      );
                      data = sortedData.slice(from, to + 1);
                    }
                    return {
                      data: data,
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
  },
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase,
}));

describe('GET /api/queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Сброс mock данных
    mockQueueData = [];
    mockDonationsData = [];
    mockTracksData = [];
  });

  it('should return 200 with empty queue', async () => {
    const request = new NextRequest('http://localhost/api/queue', {
      method: 'GET',
    });

    const { GET } = await import('./route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tracks).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  }, 10000);

  it('should return 200 with tracks sorted by created_at (ascending)', async () => {
    // Добавляем треки с разными датами создания
    mockQueueData = [
      { id: 'queue-1', track_id: 'track-1', donation_id: 'donation-1', position: 1, status: 'pending', created_at: '2024-01-01T02:00:00Z' },
      { id: 'queue-2', track_id: 'track-2', donation_id: 'donation-2', position: 2, status: 'pending', created_at: '2024-01-01T01:00:00Z' },
      { id: 'queue-3', track_id: 'track-3', donation_id: 'donation-3', position: 3, status: 'pending', created_at: '2024-01-01T00:00:00Z' },
    ];
    mockDonationsData = [
      { id: 'donation-1', amount: 50, created_at: '2024-01-01T02:00:00Z' },
      { id: 'donation-2', amount: 100, created_at: '2024-01-01T01:00:00Z' },
      { id: 'donation-3', amount: 25, created_at: '2024-01-01T00:00:00Z' },
    ];
    mockTracksData = [
      { id: 'track-1', url: 'https://youtube.com/watch?v=test1', provider: 'youtube', title: 'Track 1', artist: 'Artist 1', thumbnail_url: null, duration: null, created_at: '2024-01-01T02:00:00Z' },
      { id: 'track-2', url: 'https://youtube.com/watch?v=test2', provider: 'youtube', title: 'Track 2', artist: 'Artist 2', thumbnail_url: null, duration: null, created_at: '2024-01-01T01:00:00Z' },
      { id: 'track-3', url: 'https://youtube.com/watch?v=test3', provider: 'youtube', title: 'Track 3', artist: 'Artist 3', thumbnail_url: null, duration: null, created_at: '2024-01-01T00:00:00Z' },
    ];

    const request = new NextRequest('http://localhost/api/queue', {
      method: 'GET',
    });

    const { GET } = await import('./route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tracks.length).toBe(3);
    // Проверяем, что треки отсортированы по created_at (возрастание)
    expect(data.tracks[0].created_at).toBe('2024-01-01T00:00:00Z');
    expect(data.tracks[1].created_at).toBe('2024-01-01T01:00:00Z');
    expect(data.tracks[2].created_at).toBe('2024-01-01T02:00:00Z');
  }, 10000);

  it('should return 200 with pagination (limit/offset)', async () => {
    mockQueueData = [
      { id: 'queue-1', track_id: 'track-1', donation_id: 'donation-1', position: 1, status: 'pending', created_at: '2024-01-01T02:00:00Z' },
      { id: 'queue-2', track_id: 'track-2', donation_id: 'donation-2', position: 2, status: 'pending', created_at: '2024-01-01T01:00:00Z' },
      { id: 'queue-3', track_id: 'track-3', donation_id: 'donation-3', position: 3, status: 'pending', created_at: '2024-01-01T00:00:00Z' },
    ];
    mockDonationsData = [
      { id: 'donation-1', amount: 100, created_at: '2024-01-01T02:00:00Z' },
      { id: 'donation-2', amount: 100, created_at: '2024-01-01T01:00:00Z' },
      { id: 'donation-3', amount: 100, created_at: '2024-01-01T00:00:00Z' },
    ];
    mockTracksData = [
      { id: 'track-1', url: 'https://youtube.com/watch?v=test1', provider: 'youtube', title: 'Track 1', artist: 'Artist 1', thumbnail_url: null, duration: null, created_at: '2024-01-01T02:00:00Z' },
      { id: 'track-2', url: 'https://youtube.com/watch?v=test2', provider: 'youtube', title: 'Track 2', artist: 'Artist 2', thumbnail_url: null, duration: null, created_at: '2024-01-01T01:00:00Z' },
      { id: 'track-3', url: 'https://youtube.com/watch?v=test3', provider: 'youtube', title: 'Track 3', artist: 'Artist 3', thumbnail_url: null, duration: null, created_at: '2024-01-01T00:00:00Z' },
    ];

    const request = new NextRequest('http://localhost/api/queue?limit=2&offset=1', {
      method: 'GET',
    });

    const { GET } = await import('./route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tracks.length).toBe(2);
    expect(data.total).toBe(3);
    expect(data.hasMore).toBe(true);
    // Проверяем, что треки отсортированы по created_at (возрастание)
    expect(data.tracks[0].created_at).toBe('2024-01-01T00:00:00Z');
    expect(data.tracks[1].created_at).toBe('2024-01-01T01:00:00Z');
  }, 10000);

  it('should return 400 for invalid limit (> 100)', async () => {
    const request = new NextRequest('http://localhost/api/queue?limit=150', {
      method: 'GET',
    });

    const { GET } = await import('./route');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid limit. Must be between 0 and 100');
  });

  it('should return 400 for negative offset', async () => {
    const request = new NextRequest('http://localhost/api/queue?offset=-5', {
      method: 'GET',
    });

    const { GET } = await import('./route');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid offset. Must be non-negative');
  });
});
