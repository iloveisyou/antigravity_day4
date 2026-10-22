import { createClient } from '@supabase/supabase-js';

// Prioritize active Supabase project (qzbkalpmjjfzroenmoyi) and bypass legacy dead project (ylhbaiolxexzkuinsprj)
const candidateUrl = process.env.NEXT_PUBLIC2_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = (candidateUrl && !candidateUrl.includes('ylhbaiolxexzkuinsprj'))
  ? candidateUrl
  : (process.env.NEXT_PUBLIC2_SUPABASE_URL || 'https://qzbkalpmjjfzroenmoyi.supabase.co');

const candidateKey = process.env.NEXT_PUBLIC2_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC2_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseKey = (candidateUrl && candidateUrl.includes('ylhbaiolxexzkuinsprj'))
  ? (process.env.NEXT_PUBLIC2_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC2_SUPABASE_ANON_KEY)
  : candidateKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configurations are missing. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

