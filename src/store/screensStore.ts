import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CapturedScreen, ScreenVersion } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

interface ScreensState {
  screens: CapturedScreen[];
  selectedScreen: CapturedScreen | null;
  previewScreen: CapturedScreen | null;
  isPreviewOpen: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  selectedIds: string[]; // For batch operations
  isLoadingVersions: boolean;

  // Actions
  initializeScreens: () => Promise<void>;
  fetchFromSupabase: () => Promise<void>;
  fetchVersionsFromSupabase: (screenId: string) => Promise<ScreenVersion[]>;
  restoreVersionAsync: (screenId: string, versionId: string) => Promise<void>;
  setScreens: (screens: CapturedScreen[]) => void;
  addScreen: (screen: CapturedScreen) => void;
  uploadScreen: (file: File, name?: string, tags?: string[]) => Promise<CapturedScreen | null>;
  removeScreen: (id: string) => Promise<void>;
  removeScreens: (ids: string[]) => Promise<void>; // Batch delete
  duplicateScreen: (id: string) => Promise<void>;
  selectScreen: (screen: CapturedScreen | null) => void;
  openPreview: (screen: CapturedScreen) => void;
  closePreview: () => void;
  updateScreen: (id: string, updates: Partial<CapturedScreen>) => Promise<void>;

  // Selection for batch operations
  toggleSelectScreen: (id: string) => void;
  selectAllScreens: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

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
      selectedIds: [],
      isLoadingVersions: false,

      initializeScreens: async () => {
        const state = get();
        if (state.isInitialized) return;

        set({ isLoading: true });

        // Fetch from Supabase
        if (isSupabaseConfigured()) {
          try {
            await get().fetchFromSupabase();
          } catch (error) {
            console.error('Failed to fetch from Supabase:', error);
          }
        }

        set({ isInitialized: true, isLoading: false });
      },

      fetchFromSupabase: async () => {
        if (!isSupabaseConfigured()) {
          set({ screens: [] });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in, empty state
          set({ screens: [] });
          return;
        }

        // Fetch screens with their versions
        const { data, error } = await supabase
          .from('screens')
          .select(`*, screen_versions (id, html, prompt, description, created_at)`)
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
          versions: (row.screen_versions || []).map((v: { id: string; html: string; prompt?: string; description?: string; created_at: string }) => ({
            id: v.id,
            html: v.html,
            prompt: v.prompt,
            description: v.description,
            createdAt: v.created_at,
          })).sort((a: ScreenVersion, b: ScreenVersion) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        }));

        set({ screens });
      },

      fetchVersionsFromSupabase: async (screenId: string) => {
        if (!isSupabaseConfigured()) {
          return [];
        }

        set({ isLoadingVersions: true });

        try {
          const { data, error } = await supabase
            .from('screen_versions')
            .select('*')
            .eq('screen_id', screenId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching versions:', error);
            throw error;
          }

          const versions: ScreenVersion[] = (data || []).map((v) => ({
            id: v.id,
            html: v.html,
            prompt: v.prompt,
            description: v.description,
            createdAt: v.created_at,
          }));

          // Update the screen's versions in state
          set((state) => ({
            screens: state.screens.map((s) =>
              s.id === screenId ? { ...s, versions } : s
            ),
          }));

          return versions;
        } finally {
          set({ isLoadingVersions: false });
        }
      },

      restoreVersionAsync: async (screenId: string, versionId: string) => {
        const screen = get().screens.find((s) => s.id === screenId);
        if (!screen) {
          throw new Error('Screen not found');
        }

        const version = screen.versions?.find((v) => v.id === versionId);
        if (!version) {
          throw new Error('Version not found');
        }

        if (isSupabaseConfigured()) {
          // Update screen's HTML with version content
          const { error: updateError } = await supabase
            .from('screens')
            .update({ html: version.html })
            .eq('id', screenId);

          if (updateError) {
            console.error('Error restoring version:', updateError);
            throw new Error(`Failed to restore: ${updateError.message}`);
          }

          // Create a new version record tracking the restore action
          const { error: versionError } = await supabase
            .from('screen_versions')
            .insert({
              screen_id: screenId,
              html: version.html,
              description: `Restored from version ${versionId}`,
            });

          if (versionError) {
            console.warn('Could not create restore version record:', versionError);
          }

          // Refetch versions to update state
          await get().fetchVersionsFromSupabase(screenId);
        }

        // Update local state
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

      setScreens: (screens) => set({ screens }),

      addScreen: (screen) =>
        set((state) => ({
          screens: [screen, ...state.screens],
        })),

      uploadScreen: async (file: File, name?: string, tags?: string[]) => {
        const screenName = name || file.name.replace(/\.html?$/i, '');

        // Read file content
        const html = await file.text();

        let newScreen: CapturedScreen = {
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

        // Save to Supabase (required)
        if (isSupabaseConfigured()) {
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
              throw new Error(`Database error: ${error.message || error.code || 'Unknown'}`);
            }

            if (data) {
              newScreen = {
                ...newScreen,
                id: data.id,
                capturedAt: data.created_at,
              };

              // Create initial version in Supabase
              await supabase.from('screen_versions').insert({
                screen_id: data.id,
                html: html,
                description: 'Initial upload',
              });
            }
          } else {
            throw new Error('You must be logged in to upload screens');
          }
        } else {
          throw new Error('Database not configured');
        }

        // Add to local state
        set((state) => ({
          screens: [newScreen, ...state.screens],
        }));

        return newScreen;
      },

      removeScreen: async (id) => {
        // Remove from Supabase (required)
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('screens').delete().eq('id', id);
          if (error) {
            console.error('Error deleting from Supabase:', error);
            throw new Error('Failed to delete screen from database');
          }
        }

        set((state) => ({
          screens: state.screens.filter((s) => s.id !== id),
          selectedScreen: state.selectedScreen?.id === id ? null : state.selectedScreen,
          selectedIds: state.selectedIds.filter(sid => sid !== id),
        }));
      },

      removeScreens: async (ids) => {
        // Remove from Supabase (required)
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('screens').delete().in('id', ids);
          if (error) {
            console.error('Error batch deleting from Supabase:', error);
            throw new Error('Failed to delete screens from database');
          }
        }

        set((state) => ({
          screens: state.screens.filter((s) => !ids.includes(s.id)),
          selectedScreen: state.selectedScreen && ids.includes(state.selectedScreen.id)
            ? null
            : state.selectedScreen,
          selectedIds: [],
        }));
      },

      duplicateScreen: async (id) => {
        const state = get();
        const screen = state.screens.find((s) => s.id === id);
        if (!screen) return;

        let newScreen: CapturedScreen = {
          ...screen,
          id: `screen-${Date.now()}`,
          name: `${screen.name} (Copy)`,
          capturedAt: new Date().toISOString(),
          versions: [],
          currentVersionId: undefined,
        };

        // Save to Supabase (required)
        if (isSupabaseConfigured()) {
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

            if (error) {
              console.error('Error duplicating in Supabase:', error);
              throw new Error('Failed to duplicate screen');
            }

            if (data) {
              newScreen = {
                ...newScreen,
                id: data.id,
                capturedAt: data.created_at,
              };
            }
          }
        }

        set((state) => ({
          screens: [...state.screens, newScreen],
        }));
      },

      selectScreen: (screen) => set({ selectedScreen: screen }),

      openPreview: (screen) => set({ previewScreen: screen, isPreviewOpen: true }),

      closePreview: () => set({ previewScreen: null, isPreviewOpen: false }),

      updateScreen: async (id, updates) => {
        // Update in Supabase (required)
        if (isSupabaseConfigured()) {
          const supabaseUpdates: Record<string, unknown> = {};
          if (updates.name) supabaseUpdates.name = updates.name;
          if (updates.editedHtml) supabaseUpdates.html = updates.editedHtml;
          if (updates.tags) supabaseUpdates.tags = updates.tags;

          if (Object.keys(supabaseUpdates).length > 0) {
            const { error } = await supabase.from('screens').update(supabaseUpdates).eq('id', id);
            if (error) {
              console.error('Error updating in Supabase:', error);
              throw new Error('Failed to update screen');
            }
          }
        }

        set((state) => ({
          screens: state.screens.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      // Selection methods for batch operations
      toggleSelectScreen: (id) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(sid => sid !== id)
            : [...state.selectedIds, id],
        }));
      },

      selectAllScreens: () => {
        set((state) => ({
          selectedIds: state.screens.map(s => s.id),
        }));
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      },

      isSelected: (id) => {
        return get().selectedIds.includes(id);
      },

      saveScreenVersion: async (screenId, html, options = {}) => {
        const now = new Date().toISOString();
        let version: ScreenVersion = {
          id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          html,
          createdAt: now,
          prompt: options.prompt,
          description: options.description,
        };

        // Save to Supabase (required)
        if (isSupabaseConfigured()) {
          // First update the screen's html
          const { error: updateError } = await supabase
            .from('screens')
            .update({ html })
            .eq('id', screenId);

          if (updateError) {
            console.error('Error updating screen HTML:', updateError);
            throw new Error(`Failed to save: ${updateError.message}`);
          }

          // Then save version history (optional - may fail if table doesn't exist)
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
              version = { ...version, id: data.id };
            }
          } catch (versionError) {
            // Version history is optional, don't fail the save
            console.warn('Could not save version history:', versionError);
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
      partialize: () => ({
        // Don't persist anything - Supabase is the source of truth
        // Screens will be fetched fresh on each page load
      }),
    }
  )
);
