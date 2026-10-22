// Initialize Supabase Client for Frontend (Browser)
// Supabase URL and Anon Key are public keys safe to expose to the client.
const supabaseUrl = "https://qzbkalpmjjfzroenmoyi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YmthbHBtampmenJvZW5tb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTc5OTYsImV4cCI6MjEwMjEzMzk5Nn0.h5Tgq4b8To-AMjuEbJttH5rrP1E75x1GCi1SW2vAl28";

if (typeof supabase === 'undefined') {
  console.error('Supabase SDK is not loaded. Please make sure the CDN script is included.');
} else {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully.');
}

