import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Моки для lib/storage
const mockGetCurrentTrack = jest.fn();
const mockGetQueue = jest.fn();
const mockGetTracks = jest.fn();

jest.mock('@/lib/storage', () => ({
  getCurrentTrack: () => mockGetCurrentTrack(),
  getQueue: () => mockGetQueue(),
  getTracks: () => mockGetTracks(),
  updateQueueStatus: jest.fn(),
}));

// Мок для NextResponse
const mockJson = jest.fn();
const mockStatus = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    headers: { get: (key: string) => string | null };
    method: string;
    constructor(url: string, init?: { headers?: Record<string, string>; method?: string }) {
      this.url = url;
      this.headers = {
        get: (key: string) => init?.headers?.[key] || null,
      };
      this.method = init?.method || 'GET';
    }
  },
  NextResponse: {
    json: (data: any, init?: { status?: number }) => {
      mockJson(data);
      mockStatus(init?.status);
      return { json: () => data, status: init?.status };
    },
  },
}));

describe('GET /api/queue/current', () => {
  let routeModule: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentTrack.mockReset();
    mockGetQueue.mockReset();
    mockGetTracks.mockReset();
  });

  it('should return 200 with currentTrack: null when no track is playing', async () => {
    mockGetCurrentTrack.mockReturnValue(null);
    mockGetQueue.mockReturnValue([]);

    const request = new NextRequest('http://localhost/api/queue/current', {
      headers: { 'user-agent': 'test-agent' },
    });

    const { GET } = await import('@/app/api/queue/current/route');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.currentTrack).toBeNull();
    expect(data.message).toBe('No track currently playing');
  });

  it('should return 200 with active track from getCurrentTrack', async () => {
    const mockTrack = {
      id: 'track-123',
      url: 'https://youtube.com/watch?v=test',
      provider: 'youtube',
      title: 'Test Track',
      artist: 'Test Artist',
    };
    mockGetCurrentTrack.mockReturnValue(mockTrack);

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

  it('should return 200 with track found from queue when getCurrentTrack returns null', async () => {
    const mockTrack = {
      id: 'track-456',
      url: 'https://youtube.com/watch?v=test2',
      provider: 'youtube',
      title: 'Another Track',
      artist: 'Another Artist',
    };
    mockGetCurrentTrack.mockReturnValue(null);
    mockGetQueue.mockReturnValue([
      {
        id: 'queue-1',
        trackId: 'track-456',
        donationId: 'donation-1',
        position: 1,
        status: 'playing',
        createdAt: new Date().toISOString(),
      },
    ]);
    mockGetTracks.mockReturnValue([mockTrack]);

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

  it('should return 405 for POST requests', async () => {
    const request = new NextRequest('http://localhost/api/queue/current', {
      method: 'POST',
      headers: { 'user-agent': 'test-agent' },
    });

    const { POST } = await import('@/app/api/queue/current/route');
    const response = await POST(request);

    expect(response.status).toBe(405);
  });

  it('should return 405 for PUT requests', async () => {
    const request = new NextRequest('http://localhost/api/queue/current', {
      method: 'PUT',
      headers: { 'user-agent': 'test-agent' },
    });

    const { PUT } = await import('@/app/api/queue/current/route');
    const response = await PUT(request);

    expect(response.status).toBe(405);
  });

  it('should return 405 for DELETE requests', async () => {
    const request = new NextRequest('http://localhost/api/queue/current', {
      method: 'DELETE',
      headers: { 'user-agent': 'test-agent' },
    });

    const { DELETE } = await import('@/app/api/queue/current/route');
    const response = await DELETE(request);

    expect(response.status).toBe(405);
  });

  it('should return 405 for PATCH requests', async () => {
    const request = new NextRequest('http://localhost/api/queue/current', {
      method: 'PATCH',
      headers: { 'user-agent': 'test-agent' },
    });

    const { PATCH } = await import('@/app/api/queue/current/route');
    const response = await PATCH(request);

    expect(response.status).toBe(405);
  });
});
