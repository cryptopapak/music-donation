// Mock для Next.js API
import { NextRequest } from 'next/server';

// Глобальные моки
(globalThis as any).Request = Request as any;
(globalThis as any).Response = Response as any;

// Мок для fetch
(globalThis as any).fetch = () => {};

// Мок для console
(globalThis as any).console = {
  ...console,
  log: () => {},
  error: () => {},
  warn: () => {},
};
