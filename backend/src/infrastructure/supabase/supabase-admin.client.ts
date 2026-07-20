import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '../../config/env.js';

export function createAdminSupabaseClient(
  config: Pick<AppConfig, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>,
): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

