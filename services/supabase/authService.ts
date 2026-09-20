/**
 * Supabase Authentication & Profile Storage Service
 */

import { supabase, isSupabaseConfigured } from './client';
import { Session, User } from '@supabase/supabase-js';

export interface AuthUserMetadata {
  display_name?: string;
  username?: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: string;
}

export const authService = {
  /**
   * Check if Supabase keys are configured in environment
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Get active session from AsyncStorage
   */
  async getSession(): Promise<Session | null> {
    if (!this.isConfigured()) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Supabase getSession notice:', error.message);
        return null;
      }
      return data.session;
    } catch (err) {
      console.warn('Supabase getSession exception:', err);
      return null;
    }
  },

  /**
   * Sign up a new user with email, password, and profile metadata
   */
  async signUp(
    email: string,
    password: string,
    displayName: string,
    username: string,
    avatarUri?: string
  ): Promise<AuthResponse> {
    if (!this.isConfigured()) {
      return {
        user: null,
        session: null,
        error: 'Supabase credentials not configured in .env.local',
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase().replace('@', '');
      const cleanName = displayName.trim() || cleanUsername;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
            username: cleanUsername,
            avatar_url: avatarUri || '',
          },
        },
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      let finalAvatarUrl = avatarUri;
      if (data.user && avatarUri && (avatarUri.startsWith('file:') || avatarUri.startsWith('data:'))) {
        try {
          const uploadedUrl = await this.uploadAvatar(data.user.id, avatarUri);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
            await supabase.auth.updateUser({
              data: { avatar_url: uploadedUrl },
            });
          }
        } catch (uploadErr) {
          console.warn('Avatar upload note:', uploadErr);
        }
      }

      // Also upsert record into Supabase public.profiles table
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            username: cleanUsername,
            display_name: cleanName,
            avatar_url: finalAvatarUrl || '',
            created_at: new Date().toISOString(),
          });
        } catch (tableErr) {
          console.log('Supabase profiles table upsert note:', tableErr);
        }
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        error: err.message || 'Signup failed',
      };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!this.isConfigured()) {
      return {
        user: null,
        session: null,
        error: 'Supabase credentials not configured in .env.local',
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        error: err.message || 'Sign in failed',
      };
    }
  },

  /**
   * Sign out active user
   */
  async signOut(): Promise<{ error?: string }> {
    if (!this.isConfigured()) return {};
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  },

  /**
   * Update profile metadata
   */
  async updateProfile(updates: AuthUserMetadata): Promise<{ error?: string }> {
    if (!this.isConfigured()) return {};
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });
      if (error) return { error: error.message };

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: updates.display_name,
            username: updates.username,
            avatar_url: updates.avatar_url,
          });
        } catch (tableErr) {
          console.log('Supabase profiles update note:', tableErr);
        }
      }

      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  },

  /**
   * Upload avatar image from camera or gallery to Supabase Storage (avatars bucket)
   */
  async uploadAvatar(userId: string, imageUri: string): Promise<string> {
    if (!this.isConfigured()) return imageUri;
    try {
      const fileName = `${userId}/avatar_${Date.now()}.jpg`;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.warn('Supabase storage upload error:', error.message);
        return imageUri; // Fallback to local URI
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicData?.publicUrl || imageUri;
    } catch (err) {
      console.warn('Could not upload avatar to Supabase storage:', err);
      return imageUri;
    }
  },
};
