import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Helpers
  isAdmin: () => boolean;
}

// Fetch user profile from database
async function fetchUserProfile(userId: string): Promise<Partial<User> | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return {
    name: data.name,
    role: data.role as 'admin' | 'user' | 'viewer',
  };
}

// Convert Supabase user to app User type
async function mapSupabaseUser(supabaseUser: SupabaseUser): Promise<User> {
  const profile = await fetchUserProfile(supabaseUser.id);

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    role: profile?.role || 'user',
    avatar: supabaseUser.user_metadata?.avatar_url,
    createdAt: supabaseUser.created_at,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      supabaseUser: null,
      isAuthenticated: false,
      isLoading: true,
      accessToken: null,

      initialize: async () => {
        if (!isSupabaseConfigured()) {
          // Use mock admin user for development without Supabase
          set({
            user: {
              id: 'mock-user-1',
              email: 'admin@voxel.ai',
              name: 'Admin User',
              role: 'admin',
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const user = await mapSupabaseUser(session.user);
            set({
              supabaseUser: session.user,
              user,
              isAuthenticated: true,
              accessToken: session.access_token,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const user = await mapSupabaseUser(session.user);
              set({
                supabaseUser: session.user,
                user,
                isAuthenticated: true,
                accessToken: session.access_token,
              });
            } else if (event === 'SIGNED_OUT') {
              set({
                supabaseUser: null,
                user: null,
                isAuthenticated: false,
                accessToken: null,
              });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      loginWithEmail: async (email, password) => {
        if (!isSupabaseConfigured()) {
          // Mock login for development
          set({
            user: {
              id: 'mock-user-1',
              email,
              name: email.split('@')[0],
              role: 'admin',
            },
            isAuthenticated: true,
          });
          return {};
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        // Set auth state immediately on successful login (don't wait for listener)
        if (data.session?.user) {
          const user = await mapSupabaseUser(data.session.user);
          set({
            supabaseUser: data.session.user,
            user,
            isAuthenticated: true,
            accessToken: data.session.access_token,
          });
        }

        return {};
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          supabaseUser: null,
          isAuthenticated: false,
          accessToken: null,
        });
      },

      refreshProfile: async () => {
        const { supabaseUser } = get();
        if (!supabaseUser) return;

        const user = await mapSupabaseUser(supabaseUser);
        set({ user });
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
      partialize: () => ({
        // Don't persist - always fetch fresh from Supabase
      }),
    }
  )
);
