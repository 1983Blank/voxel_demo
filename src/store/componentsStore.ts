import { create } from 'zustand';

export interface ExtractedComponent {
  id: string;
  name: string;
  category: string;
  sourceScreen: string;
  extractedAt: string;
  tags: string[];
  html: string;
  css: string;
}

interface ComponentsState {
  components: ExtractedComponent[];
  selectedComponent: ExtractedComponent | null;
  searchQuery: string;
  selectedCategory: string | null;
  selectedTags: string[];

  // Computed
  categories: string[];
  allTags: string[];
  filteredComponents: ExtractedComponent[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  selectComponent: (component: ExtractedComponent | null) => void;
}

const getUniqueCategories = (components: ExtractedComponent[]): string[] => {
  return [...new Set(components.map((c) => c.category))].sort();
};

const getUniqueTags = (components: ExtractedComponent[]): string[] => {
  const tags = components.flatMap((c) => c.tags);
  return [...new Set(tags)].sort();
};

const filterComponents = (
  components: ExtractedComponent[],
  searchQuery: string,
  selectedCategory: string | null,
  selectedTags: string[]
): ExtractedComponent[] => {
  return components.filter((comp) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = comp.name.toLowerCase().includes(query);
      const matchesTags = comp.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      const matchesCategory = comp.category.toLowerCase().includes(query);
      if (!matchesName && !matchesTags && !matchesCategory) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory && comp.category !== selectedCategory) {
      return false;
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const hasAllTags = selectedTags.every((tag) => comp.tags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }

    return true;
  });
};

export const useComponentsStore = create<ComponentsState>((set, get) => ({
  components: [], // Components will be fetched from Supabase
  selectedComponent: null,
  searchQuery: '',
  selectedCategory: null,
  selectedTags: [],

  get categories() {
    return getUniqueCategories(get().components);
  },

  get allTags() {
    return getUniqueTags(get().components);
  },

  get filteredComponents() {
    const state = get();
    return filterComponents(
      state.components,
      state.searchQuery,
      state.selectedCategory,
      state.selectedTags
    );
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  toggleTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    })),

  clearFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: null,
      selectedTags: [],
    }),

  selectComponent: (component) => set({ selectedComponent: component }),
}));
