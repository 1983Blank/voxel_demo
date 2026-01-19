import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CapturedScreen, ScreenVersion } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

// Static list of captured screens from mock-captures folder (for demo/offline)
const MOCK_SCREENS: CapturedScreen[] = [
  {
    id: 'screen-1',
    name: 'GetVoxel.ai Demo App - Screen 1',
    fileName: 'GetVoxel.ai Demo App (1_19_2026 2：44：48 PM).html',
    filePath: '/src/mock-captures/screens/GetVoxel.ai Demo App (1_19_2026 2：44：48 PM).html',
    capturedAt: '2026-01-19T14:44:48Z',
    tags: ['demo', 'landing'],
  },
  {
    id: 'screen-2',
    name: 'GetVoxel.ai Demo App - Screen 2',
    fileName: 'GetVoxel.ai Demo App (1_19_2026 2：44：58 PM).html',
    filePath: '/src/mock-captures/screens/GetVoxel.ai Demo App (1_19_2026 2：44：58 PM).html',
    capturedAt: '2026-01-19T14:44:58Z',
    tags: ['demo', 'features'],
  },
  {
    id: 'screen-3',
    name: 'GetVoxel.ai Demo App - Screen 3',
    fileName: 'GetVoxel.ai Demo App (1_19_2026 2：45：04 PM).html',
    filePath: '/src/mock-captures/screens/GetVoxel.ai Demo App (1_19_2026 2：45：04 PM).html',
    capturedAt: '2026-01-19T14:45:04Z',
    tags: ['demo', 'pricing'],
  },
  {
    id: 'screen-4',
    name: 'GetVoxel.ai Demo App - Screen 4',
    fileName: 'GetVoxel.ai Demo App (1_19_2026 2：45：09 PM).html',
    filePath: '/src/mock-captures/screens/GetVoxel.ai Demo App (1_19_2026 2：45：09 PM).html',
    capturedAt: '2026-01-19T14:45:09Z',
    tags: ['demo', 'about'],
  },
  {
    id: 'screen-5',
    name: 'GetVoxel.ai Demo App - Screen 5',
    fileName: 'GetVoxel.ai Demo App (1_19_2026 2：45：17 PM).html',
    filePath: '/src/mock-captures/screens/GetVoxel.ai Demo App (1_19_2026 2：45：17 PM).html',
    capturedAt: '2026-01-19T14:45:17Z',
    tags: ['demo', 'contact'],
  },
];

interface ScreensState {
  screens: CapturedScreen[];
  selectedScreen: CapturedScreen | null;
  previewScreen: CapturedScreen | null;
  isPreviewOpen: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  isSyncing: boolean;

  // Actions
  initializeScreens: () => Promise<void>;
  fetchFromSupabase: () => Promise<void>;
  setScreens: (screens: CapturedScreen[]) => void;
  addScreen: (screen: CapturedScreen) => void;
  uploadScreen: (file: File, name?: string, tags?: string[]) => Promise<CapturedScreen | null>;
  removeScreen: (id: string) => Promise<void>;
  duplicateScreen: (id: string) => Promise<void>;
  selectScreen: (screen: CapturedScreen | null) => void;
  openPreview: (screen: CapturedScreen) => void;
  closePreview: () => void;
  updateScreen: (id: string, updates: Partial<CapturedScreen>) => Promise<void>;

  // Version management
  saveScreenVersion: (
    screenId: string,
    html: string,
    options?: { prompt?: string; description?: string }
  ) => Promise<ScreenVersion>;
  getScreenVersions: (screenId: string) => ScreenVersion[];
  restoreVersion: (screenId: string, versionId: string) => void;
  getScreenHtml: (screenId: string) => string | null;

  // Navigation helpers
  getNextScreen: (currentId: string) => CapturedScreen | null;
  getPreviousScreen: (currentId: string) => CapturedScreen | null;
  getScreenById: (id: string) => CapturedScreen | undefined;
}

export const useScreensStore = create<ScreensState>()(
  persist(
    (set, get) => ({
      screens: [],
      selectedScreen: null,
      previewScreen: null,
      isPreviewOpen: false,
      isInitialized: false,
      isLoading: false,
      isSyncing: false,

      initializeScreens: async () => {
        const state = get();
        if (state.isInitialized) return;

        set({ isLoading: true });

        // Try to fetch from Supabase first
        if (isSupabaseConfigured()) {
          try {
            await get().fetchFromSupabase();
            set({ isInitialized: true, isLoading: false });
            return;
          } catch (error) {
            console.error('Failed to fetch from Supabase, using local data:', error);
          }
        }

        // Fallback to mock screens + local storage
        const existingScreens = state.screens;
        const mergedScreens = MOCK_SCREENS.map((mockScreen) => {
          const existing = existingScreens.find((s) => s.id === mockScreen.id);
          if (existing) {
            return {
              ...mockScreen,
              editedHtml: existing.editedHtml,
              versions: existing.versions,
              currentVersionId: existing.currentVersionId,
              updatedAt: existing.updatedAt,
            };
          }
          return mockScreen;
        });

        const customScreens = existingScreens.filter(
          (s) => !MOCK_SCREENS.find((m) => m.id === s.id)
        );

        set({
          screens: [...mergedScreens, ...customScreens],
          isInitialized: true,
          isLoading: false,
        });
      },

      fetchFromSupabase: async () => {
        if (!isSupabaseConfigured()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in, use mock screens
          set({ screens: MOCK_SCREENS });
          return;
        }

        const { data, error } = await supabase
          .from('screens')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching screens:', error);
          throw error;
        }

        // Map Supabase data to CapturedScreen format
        const screens: CapturedScreen[] = (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          fileName: row.file_name,
          filePath: row.file_path || '',
          capturedAt: row.created_at,
          thumbnail: row.thumbnail || undefined,
          tags: row.tags || [],
          editedHtml: row.html || undefined,
          updatedAt: row.updated_at,
        }));

        // If no screens in DB, show mock screens
        if (screens.length === 0) {
          set({ screens: MOCK_SCREENS });
        } else {
          set({ screens });
        }
      },

      setScreens: (screens) => set({ screens }),

      addScreen: (screen) =>
        set((state) => ({ screens: [screen, ...state.screens] })),

      uploadScreen: async (file: File, name?: string, tags?: string[]) => {
        const screenName = name || file.name.replace(/\.html?$/i, '');

        // Read file content
        const html = await file.text();

        const newScreen: CapturedScreen = {
          id: `screen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: screenName,
          fileName: file.name,
          filePath: '',
          capturedAt: new Date().toISOString(),
          tags: tags || [],
          editedHtml: html,
          versions: [{
            id: `version-${Date.now()}`,
            html,
            createdAt: new Date().toISOString(),
            description: 'Initial upload',
          }],
        };

        // Save to Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data, error } = await supabase
                .from('screens')
                .insert({
                  user_id: user.id,
                  name: screenName,
                  file_name: file.name,
                  html: html,
                  tags: tags || [],
                })
                .select()
                .single();

              if (error) {
                console.error('Error saving to Supabase:', error);
              } else if (data) {
                // Update newScreen with Supabase ID
                newScreen.id = data.id;
                newScreen.capturedAt = data.created_at;

                // Also create initial version in Supabase
                await supabase.from('screen_versions').insert({
                  screen_id: data.id,
                  html: html,
                  description: 'Initial upload',
                });
              }
            }
          } catch (error) {
            console.error('Supabase upload error:', error);
          }
        }

        // Add to local state
        set((state) => ({ screens: [newScreen, ...state.screens] }));

        return newScreen;
      },

      removeScreen: async (id) => {
        // Remove from Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('screens').delete().eq('id', id);
          } catch (error) {
            console.error('Error deleting from Supabase:', error);
          }
        }

        set((state) => ({
          screens: state.screens.filter((s) => s.id !== id),
          selectedScreen: state.selectedScreen?.id === id ? null : state.selectedScreen,
        }));
      },

      duplicateScreen: async (id) => {
        const state = get();
        const screen = state.screens.find((s) => s.id === id);
        if (!screen) return;

        const newScreen: CapturedScreen = {
          ...screen,
          id: `screen-${Date.now()}`,
          name: `${screen.name} (Copy)`,
          capturedAt: new Date().toISOString(),
          versions: [],
          currentVersionId: undefined,
        };

        // Save to Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data, error } = await supabase
                .from('screens')
                .insert({
                  user_id: user.id,
                  name: newScreen.name,
                  file_name: screen.fileName,
                  html: screen.editedHtml || null,
                  tags: screen.tags || [],
                })
                .select()
                .single();

              if (!error && data) {
                newScreen.id = data.id;
                newScreen.capturedAt = data.created_at;
              }
            }
          } catch (error) {
            console.error('Error duplicating in Supabase:', error);
          }
        }

        set({ screens: [...state.screens, newScreen] });
      },

      selectScreen: (screen) => set({ selectedScreen: screen }),

      openPreview: (screen) => set({ previewScreen: screen, isPreviewOpen: true }),

      closePreview: () => set({ previewScreen: null, isPreviewOpen: false }),

      updateScreen: async (id, updates) => {
        // Update in Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const supabaseUpdates: Record<string, unknown> = {};
            if (updates.name) supabaseUpdates.name = updates.name;
            if (updates.editedHtml) supabaseUpdates.html = updates.editedHtml;
            if (updates.tags) supabaseUpdates.tags = updates.tags;

            if (Object.keys(supabaseUpdates).length > 0) {
              await supabase.from('screens').update(supabaseUpdates).eq('id', id);
            }
          } catch (error) {
            console.error('Error updating in Supabase:', error);
          }
        }

        set((state) => ({
          screens: state.screens.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      saveScreenVersion: async (screenId, html, options = {}) => {
        const now = new Date().toISOString();
        const version: ScreenVersion = {
          id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          html,
          createdAt: now,
          prompt: options.prompt,
          description: options.description,
        };

        // Save to Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('screen_versions')
              .insert({
                screen_id: screenId,
                html,
                prompt: options.prompt || null,
                description: options.description || null,
              })
              .select()
              .single();

            if (!error && data) {
              version.id = data.id;
            }

            // Also update the screen's html
            await supabase
              .from('screens')
              .update({ html })
              .eq('id', screenId);
          } catch (error) {
            console.error('Error saving version to Supabase:', error);
          }
        }

        set((state) => ({
          screens: state.screens.map((s) => {
            if (s.id === screenId) {
              const versions = s.versions || [];
              return {
                ...s,
                editedHtml: html,
                versions: [...versions, version],
                currentVersionId: version.id,
                updatedAt: now,
              };
            }
            return s;
          }),
        }));

        return version;
      },

      getScreenVersions: (screenId) => {
        const screen = get().screens.find((s) => s.id === screenId);
        return screen?.versions || [];
      },

      restoreVersion: (screenId, versionId) => {
        const screen = get().screens.find((s) => s.id === screenId);
        if (!screen) return;

        const version = screen.versions?.find((v) => v.id === versionId);
        if (!version) return;

        set((state) => ({
          screens: state.screens.map((s) =>
            s.id === screenId
              ? {
                  ...s,
                  editedHtml: version.html,
                  currentVersionId: versionId,
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      getScreenHtml: (screenId) => {
        const screen = get().screens.find((s) => s.id === screenId);
        if (!screen) return null;
        return screen.editedHtml || null;
      },

      getNextScreen: (currentId) => {
        const state = get();
        const currentIndex = state.screens.findIndex((s) => s.id === currentId);
        if (currentIndex === -1 || currentIndex === state.screens.length - 1) {
          return null;
        }
        return state.screens[currentIndex + 1];
      },

      getPreviousScreen: (currentId) => {
        const state = get();
        const currentIndex = state.screens.findIndex((s) => s.id === currentId);
        if (currentIndex <= 0) {
          return null;
        }
        return state.screens[currentIndex - 1];
      },

      getScreenById: (id) => {
        return get().screens.find((s) => s.id === id);
      },
    }),
    {
      name: 'voxel-screens-storage',
      partialize: (state) => ({
        screens: state.screens.map((s) => ({
          ...s,
          ...(s.editedHtml ? { editedHtml: s.editedHtml } : {}),
          ...(s.versions ? { versions: s.versions } : {}),
          ...(s.currentVersionId ? { currentVersionId: s.currentVersionId } : {}),
          ...(s.updatedAt ? { updatedAt: s.updatedAt } : {}),
        })),
        isInitialized: state.isInitialized,
      }),
    }
  )
);
