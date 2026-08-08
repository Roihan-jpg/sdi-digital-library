import { loadEnvironment } from '../config/env.js';
import { createAdminSupabaseClient } from '../infrastructure/supabase/supabase-admin.client.js';
import { CirculationService } from '../modules/circulation/circulation.service.js';

const config = loadEnvironment();
const circulation = await new CirculationService(config).scheduledMaintenance();
const { data: purgedSystemEvents, error } = await createAdminSupabaseClient(config)
  .rpc('purge_expired_system_events');
if (error) throw new Error('Gagal membersihkan event sistem kedaluwarsa.');
process.stdout.write(`${JSON.stringify({ circulation, purgedSystemEvents })}\n`);
