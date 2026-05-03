import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Моки для supabaseAdmin
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

describe('GET /api/queue/current', () => {
  let routeModule: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });
  });

  it('should return 200 with currentTrack: null when no track is playing', async () => {
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
    });

    const request = new NextRequest('http://localhost/api/queue/current', {
      headers: { 'user-agent': 'test-agent' },
    });

    const { GET } = await import('@/app/api/queue/current/route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.currentTrack).toBeNull();
  });

  it('should return 200 with active track from queue', async () => {
    const mockTrack = {
      id: 'track-123',
      url: 'https://youtube.com/watch?v=test',
      provider: 'youtube',
      title: 'Test Track',
      artist: 'Test Artist',
      thumbnail_url: 'https://example.com/thumb.jpg',
      duration: 180,
    };
    const mockQueueItem = {
      id: 'queue-1',
      status: 'playing',
      track_id: 'track-123',
      tracks: mockTrack,
    };

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: () => Promise.resolve({ data: mockQueueItem, error: null }),
    });

    const request = new NextRequest('http://localhost/api/queue/current', {
      headers: { 'user-agent': 'test-agent' },
    });

    const { GET } = await import('@/app/api/queue/current/route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.currentTrack).toEqual(mockTrack);
  });

  it('should return 500 on database error', async () => {
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: () => Promise.resolve({ data: null, error: { code: 'DB_ERROR' } }),
    });

    const request = new NextRequest('http://localhost/api/queue/current', {
      headers: { 'user-agent': 'test-agent' },
    });

    const { GET } = await import('@/app/api/queue/current/route');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch current track');
  });
});
