// Supabase клиент для API routes (использует service role ключ)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    url: supabaseUrl?.substring(0, 20) + '...',
  });
  // Используем заглушки для разработки
  console.warn('⚠️ Используются заглушки Supabase. Укажите NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);
