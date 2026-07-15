// Initialize Supabase Client for Frontend (Browser)
// Supabase URL and Anon Key are public keys safe to expose to the client.
const supabaseUrl = "https://ylhbaiolxexzkuinsprj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaGJhaW9seGV4emt1aW5zcHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTEyNzgsImV4cCI6MjA5OTA2NzI3OH0.q1p9LXzFJahSv9n_Gdk5ZOm0TE2343uUgmzpYvSuuxQ";

if (typeof supabase === 'undefined') {
  console.error('Supabase SDK is not loaded. Please make sure the CDN script is included.');
} else {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully.');
}
