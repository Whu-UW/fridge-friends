/**
 * Supabase Client Configuration
 *
 * When you are ready to connect to your live Supabase project:
 * 1. Install supabase-js: `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage`
 * 2. Add your credentials to .env:
 *    EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 3. Uncomment the live client initialization below.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) &&
    process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://mock.supabase.co'
  );
};

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};
