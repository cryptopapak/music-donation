// Supabase клиент для API routes (использует service role ключ)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Supabase credentials missing. Укажите NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
