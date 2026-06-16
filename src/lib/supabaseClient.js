import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase-omgevingsvariabelen ontbreken. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in je .env bestand (lokaal) of in Vercel project settings (live)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
