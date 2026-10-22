import { createClient } from '@supabase/supabase-js';

// Active Supabase Project Credentials (qzbkalpmjjfzroenmoyi)
const ACTIVE_PROJECT_URL = 'https://qzbkalpmjjfzroenmoyi.supabase.co';
const ACTIVE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YmthbHBtampmenJvZW5tb3lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU1Nzk5NiwiZXhwIjoyMTAyMTMzOTk2fQ.UfYEmbR3-gVHzoAK43XQqRkE63dd_vDG4JiAqCNykLQ';
const ACTIVE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YmthbHBtampmenJvZW5tb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTc5OTYsImV4cCI6MjEwMjEzMzk5Nn0.h5Tgq4b8To-AMjuEbJttH5rrP1E75x1GCi1SW2vAl28';

function getValidUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC2_SUPABASE_URL,
    process.env.NEXT_PUBLIC_NEXT_PUBLIC2_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ];
  for (const url of candidates) {
    if (url && !url.includes('ylhbaiolxexzkuinsprj')) {
      return url;
    }
  }
  return ACTIVE_PROJECT_URL;
}

function getValidKey() {
  const candidates = [
    process.env.NEXT_PUBLIC2_SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC2_SUPABASE_ANON_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY
  ];
  for (const key of candidates) {
    // Legacy key for ylhbaiolxexzkuinsprj contains its project ref in JWT payload
    if (key && !key.includes('ylhbaiolxexzkuinsprj')) {
      return key;
    }
  }
  return ACTIVE_SERVICE_ROLE_KEY || ACTIVE_ANON_KEY;
}

const supabaseUrl = getValidUrl();
const supabaseKey = getValidKey();

export const supabase = createClient(supabaseUrl, supabaseKey);


