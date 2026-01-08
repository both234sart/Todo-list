import { createClient } from '@supabase/supabase-js';

// Using the credentials provided. 
// In a production Vite app, these would typically be import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://twnnapamdbrjbztpigpb.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_WiitISlsIc-pkorrOOzK-A_LG3NCS9y';

export const supabase = createClient(supabaseUrl, supabaseKey);