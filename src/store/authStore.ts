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
  login: (user: User, token?: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  loginWithProvider: (provider: 'google' | 'github') => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

// Convert Supabase user to app User type
function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    role: 'user',
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
          // Use mock user for development without Supabase
          set({
            user: {
              id: 'mock-user-1',
              email: 'demo@voxel.ai',
              name: 'Demo User',
              role: 'user',
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({
              supabaseUser: session.user,
              user: mapSupabaseUser(session.user),
              isAuthenticated: true,
              accessToken: session.access_token,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              set({
                supabaseUser: session.user,
                user: mapSupabaseUser(session.user),
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

      login: (user, token) => {
        if (token) {
          localStorage.setItem('accessToken', token);
        }
        set({
          user,
          isAuthenticated: true,
          accessToken: token || null,
        });
      },

      loginWithEmail: async (email, password) => {
        if (!isSupabaseConfigured()) {
          // Mock login for development
          get().login({
            id: 'mock-user-1',
            email,
            name: email.split('@')[0],
            role: 'user',
          });
          return {};
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        return {};
      },

      signUpWithEmail: async (email, password, name) => {
        if (!isSupabaseConfigured()) {
          // Mock signup for development
          get().login({
            id: 'mock-user-1',
            email,
            name,
            role: 'user',
          });
          return {};
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) {
          return { error: error.message };
        }

        return {};
      },

      loginWithProvider: async (provider) => {
        if (!isSupabaseConfigured()) {
          return { error: 'Supabase not configured' };
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          return { error: error.message };
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

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
