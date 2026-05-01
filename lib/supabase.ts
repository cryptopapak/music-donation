// Mock режим (без Supabase)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

if (USE_MOCK) {
  console.log('🚀 Запуск в MOCK режиме (без Supabase)');
}

// Mock storage для данных
const mockStorage: Record<string, any[]> = {
  streamers: [],
  donations: [],
  queue: [],
  tracks: [],
};

// Экспортируем пустые объекты для mock режима
export const supabase = {
  from: (table: string) => {
    let query: any = {
      select: (columns: string = '*') => {
        query.columns = columns;
        return query;
      },
      eq: (column: string, value: any) => {
        query.eq = { column, value };
        return query;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        query.order = { column, ascending: options?.ascending ?? true };
        return query;
      },
      range: (from: number, to: number) => {
        query.range = { from, to };
        return query;
      },
      maybeSingle: () => {
        const results = mockStorage[table]?.filter((item: any) => {
          if (query.eq) return item[query.eq.column] === query.eq.value;
          return true;
        }) || [];
        return Promise.resolve({
          data: results.length > 0 ? results[0] : null,
          error: null,
        });
      },
      single: () => {
        const results = mockStorage[table]?.filter((item: any) => {
          if (query.eq) return item[query.eq.column] === query.eq.value;
          return true;
        }) || [];
        return Promise.resolve({
          data: results.length > 0 ? results[0] : null,
          error: null,
        });
      },
      insert: (data: any) => {
        const id = `id-${Date.now()}`;
        const record = { ...data, id, created_at: new Date().toISOString() };
        if (!mockStorage[table]) mockStorage[table] = [];
        mockStorage[table].push(record);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: record, error: null }),
          }),
        };
      },
      upsert: (data: any, options?: any) => {
        const id = `id-${Date.now()}`;
        const record = { ...data, id, created_at: new Date().toISOString() };
        if (!mockStorage[table]) mockStorage[table] = [];
        if (options?.onConflict) {
          const existingIndex = mockStorage[table].findIndex(
            (item: any) => item[options.onConflict] === data[options.onConflict]
          );
          if (existingIndex >= 0) {
            mockStorage[table][existingIndex] = {
              ...mockStorage[table][existingIndex],
              ...data,
              updated_at: new Date().toISOString(),
            };
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: mockStorage[table][existingIndex],
                    error: null,
                  }),
              }),
            };
          }
        }
        mockStorage[table].push(record);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: record, error: null }),
          }),
        };
      },
      update: (data: any) => ({
        eq: (column2: string, value2: any) => {
          if (!mockStorage[table])
            return Promise.resolve({ data: null, error: null });
          const index = mockStorage[table].findIndex(
            (item: any) =>
              item[query.eq?.column] === query.eq?.value &&
              item[column2] === value2
          );
          if (index >= 0) {
            mockStorage[table][index] = {
              ...mockStorage[table][index],
              ...data,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({
              data: mockStorage[table][index],
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          if (!mockStorage[table])
            return Promise.resolve({ data: null, error: null });
          const index = mockStorage[table].findIndex(
            (item: any) => item[column] === value
          );
          if (index >= 0) {
            mockStorage[table].splice(index, 1);
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };

    if (table === 'queue') {
      // Для queue добавляем поддержку count
      query.select = (columns: string = '*', options?: { count?: string; head?: boolean }) => {
        if (options?.count === 'exact' && options.head) {
          query.count = true;
        }
        return query;
      };
    }

    return query;
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    removeChannel: () => {},
  }),
};

export const supabaseAdmin = supabase;

// Экспортируем функции для работы с mock storage
export function getMockStorage() {
  return mockStorage;
}

export function clearMockStorage() {
  Object.keys(mockStorage).forEach((key) => {
    mockStorage[key] = [];
  });
}
