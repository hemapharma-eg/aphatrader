import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mbcroknwvhsffxtfxtbd.supabase.co';
const supabaseKey = 'sb_publishable_vmhCjoPoH2BKAD-scFzQNg_Z4cNeY7g';

export const supabase = createClient(supabaseUrl, supabaseKey);
