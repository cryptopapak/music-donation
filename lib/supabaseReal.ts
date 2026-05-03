// Реальный Supabase клиент для production
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL или Key не указаны');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'not set');
  throw new Error('Supabase configuration is missing');
}

console.log('🚀 Подключение к реальному Supabase');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = supabase;
