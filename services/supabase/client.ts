/**
 * Supabase Client Configuration with AsyncStorage Session Persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(rawUrl) &&
    Boolean(rawKey) &&
    rawUrl !== 'https://placeholder.supabase.co' &&
    rawUrl !== 'https://mock.supabase.co' &&
    rawKey !== 'mock-anon-key'
  );
};

const SUPABASE_URL = isSupabaseConfigured() ? rawUrl! : 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = isSupabaseConfigured() ? rawKey! : 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};
