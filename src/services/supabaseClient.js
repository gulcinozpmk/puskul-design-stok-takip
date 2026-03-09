import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEBUG
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'MEVCUT' : 'EKSİK');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);