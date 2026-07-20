import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '../../config/env.js';

export function createUserSupabaseClient(
  config: Pick<AppConfig, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
  accessToken: string,
): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

