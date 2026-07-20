import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    return createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
      auth: {
        autoRefreshToken: browser,
        detectSessionInUrl: browser,
        persistSession: browser,
      },
    });
  },
});
