import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Моки для Supabase
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        insert: (data: any) => {
          mockInsert(data);
          return {
            select: () => ({
              single: () => ({
                data: { ...data, id: 'donation-123' },
                error: null,
              }),
            }),
          };
        },
        upsert: (data: any, options?: any) => {
          mockUpsert(data, options);
          return {
            select: () => ({
              single: () => ({
                data: { ...data, id: 'track-456' },
                error: null,
              }),
            }),
          };
        },
      };
    },
  },
}));

describe('POST /api/queue/add', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 201 with valid data', async () => {
    const request = new NextRequest('http://localhost/api/queue/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track_link: 'https://youtube.com/watch?v=test123',
        donor_name: 'Test User',
        message: 'Keep up the good work!',
        amount: 100,
      }),
    });

    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.donation).toBeDefined();
    expect(data.track).toBeDefined();
    expect(data.queueItem).toBeDefined();
  });

  it('should return 400 for invalid amount (less than 10)', async () => {
    const request = new NextRequest('http://localhost/api/queue/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track_link: 'https://youtube.com/watch?v=test123',
        donor_name: 'Test User',
        amount: 5,
      }),
    });

    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details).toContainEqual(
      expect.objectContaining({
        field: 'amount',
        message: 'Минимальный донат: 10 рублей',
      })
    );
  });

  it('should return 400 for missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/queue/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track_link: 'https://youtube.com/watch?v=test123',
        // donor_name missing
        amount: 100,
      }),
    });

    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  it('should return 400 for invalid URL', async () => {
    const request = new NextRequest('http://localhost/api/queue/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track_link: 'not-a-valid-url',
        donor_name: 'Test User',
        amount: 100,
      }),
    });

    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });
});
