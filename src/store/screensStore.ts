import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CapturedScreen, ScreenVersion } from '@/types';

// Static list of captured screens from mock-captures folder
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

  // Actions
  initializeScreens: () => void;
  setScreens: (screens: CapturedScreen[]) => void;
  addScreen: (screen: CapturedScreen) => void;
  removeScreen: (id: string) => void;
  duplicateScreen: (id: string) => void;
  selectScreen: (screen: CapturedScreen | null) => void;
  openPreview: (screen: CapturedScreen) => void;
  closePreview: () => void;
  updateScreen: (id: string, updates: Partial<CapturedScreen>) => void;

  // Version management
  saveScreenVersion: (
    screenId: string,
    html: string,
    options?: { prompt?: string; description?: string }
  ) => ScreenVersion;
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

      initializeScreens: () => {
        const state = get();
        if (!state.isInitialized || state.screens.length === 0) {
          // Merge mock screens with any persisted edits
          const existingScreens = state.screens;
          const mergedScreens = MOCK_SCREENS.map((mockScreen) => {
            const existing = existingScreens.find((s) => s.id === mockScreen.id);
            if (existing) {
              // Preserve edited content and versions
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

          // Add any custom screens that aren't in mock
          const customScreens = existingScreens.filter(
            (s) => !MOCK_SCREENS.find((m) => m.id === s.id)
          );

          set({
            screens: [...mergedScreens, ...customScreens],
            isInitialized: true,
          });
        }
      },

      setScreens: (screens) => set({ screens }),

      addScreen: (screen) =>
        set((state) => ({ screens: [...state.screens, screen] })),

      removeScreen: (id) =>
        set((state) => ({
          screens: state.screens.filter((s) => s.id !== id),
          selectedScreen: state.selectedScreen?.id === id ? null : state.selectedScreen,
        })),

      duplicateScreen: (id) => {
        const state = get();
        const screen = state.screens.find((s) => s.id === id);
        if (screen) {
          const newScreen: CapturedScreen = {
            ...screen,
            id: `screen-${Date.now()}`,
            name: `${screen.name} (Copy)`,
            capturedAt: new Date().toISOString(),
            versions: [], // Start fresh version history
            currentVersionId: undefined,
          };
          set({ screens: [...state.screens, newScreen] });
        }
      },

      selectScreen: (screen) => set({ selectedScreen: screen }),

      openPreview: (screen) => set({ previewScreen: screen, isPreviewOpen: true }),

      closePreview: () => set({ previewScreen: null, isPreviewOpen: false }),

      updateScreen: (id, updates) =>
        set((state) => ({
          screens: state.screens.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        })),

      saveScreenVersion: (screenId, html, options = {}) => {
        const now = new Date().toISOString();
        const version: ScreenVersion = {
          id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          html,
          createdAt: now,
          prompt: options.prompt,
          description: options.description,
        };

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
        // Return edited HTML if available, otherwise null (will use filePath)
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
          // Only persist edited content, not the full mock data
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
