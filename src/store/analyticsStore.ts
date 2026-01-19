import { create } from 'zustand';

export interface EngagementEvent {
  id: string;
  type: 'view' | 'click' | 'scroll' | 'hover' | 'conversion';
  variantId: string;
  screenId: string;
  timestamp: string;
  duration?: number; // Time spent in ms
  elementPath?: string; // Which element was interacted with
  metadata?: Record<string, unknown>;
}

export interface VariantMetrics {
  variantId: string;
  variantLabel: string;
  screenId: string;
  views: number;
  uniqueViews: number;
  clicks: number;
  avgTimeSpent: number; // seconds
  bounceRate: number; // percentage
  scrollDepth: number; // percentage
  conversionRate: number; // percentage
  heatmapData?: { x: number; y: number; value: number }[];
}

export interface ScreenAnalytics {
  screenId: string;
  screenName: string;
  totalViews: number;
  totalClicks: number;
  avgEngagement: number;
  variantMetrics: VariantMetrics[];
  topPerformer?: string; // variantId
  lastUpdated: string;
}

export interface TimeSeriesData {
  date: string;
  views: number;
  clicks: number;
  conversions: number;
}

interface AnalyticsState {
  events: EngagementEvent[];
  screenAnalytics: ScreenAnalytics[];
  dateRange: 'today' | '7d' | '30d' | '90d';
  selectedScreenId: string | null;

  // Actions
  trackEvent: (event: Omit<EngagementEvent, 'id' | 'timestamp'>) => void;
  getScreenAnalytics: (screenId: string) => ScreenAnalytics | undefined;
  getVariantMetrics: (variantId: string) => VariantMetrics | undefined;
  getTimeSeriesData: (screenId?: string) => TimeSeriesData[];
  getTopVariants: (limit?: number) => VariantMetrics[];

  setDateRange: (range: 'today' | '7d' | '30d' | '90d') => void;
  setSelectedScreen: (screenId: string | null) => void;

  // Generate mock data
  generateMockData: () => void;
}

// Generate random number within range
const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Generate mock time series data
const generateTimeSeriesData = (days: number): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add some realistic variation
    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;

    data.push({
      date: date.toISOString().split('T')[0],
      views: Math.floor(randomInRange(100, 500) * weekendMultiplier),
      clicks: Math.floor(randomInRange(20, 100) * weekendMultiplier),
      conversions: Math.floor(randomInRange(5, 30) * weekendMultiplier),
    });
  }

  return data;
};

// Generate mock variant metrics
const generateVariantMetrics = (
  variantId: string,
  variantLabel: string,
  screenId: string,
  isTopPerformer: boolean
): VariantMetrics => {
  const baseViews = randomInRange(500, 2000);
  const performanceMultiplier = isTopPerformer ? 1.3 : 1;

  return {
    variantId,
    variantLabel,
    screenId,
    views: baseViews,
    uniqueViews: Math.floor(baseViews * 0.7),
    clicks: Math.floor(baseViews * randomInRange(15, 35) / 100 * performanceMultiplier),
    avgTimeSpent: randomInRange(30, 180),
    bounceRate: randomInRange(20, 60) / (isTopPerformer ? 1.2 : 1),
    scrollDepth: randomInRange(40, 90) * (isTopPerformer ? 1.1 : 1),
    conversionRate: randomInRange(2, 15) * performanceMultiplier,
    heatmapData: Array.from({ length: 20 }, () => ({
      x: randomInRange(0, 100),
      y: randomInRange(0, 100),
      value: randomInRange(1, 100),
    })),
  };
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  events: [],
  screenAnalytics: [],
  dateRange: '7d',
  selectedScreenId: null,

  trackEvent: (eventData) => {
    const event: EngagementEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      events: [...state.events, event],
    }));
  },

  getScreenAnalytics: (screenId) => {
    return get().screenAnalytics.find((sa) => sa.screenId === screenId);
  },

  getVariantMetrics: (variantId) => {
    for (const screen of get().screenAnalytics) {
      const variant = screen.variantMetrics.find((v) => v.variantId === variantId);
      if (variant) return variant;
    }
    return undefined;
  },

  getTimeSeriesData: (_screenId) => {
    const { dateRange } = get();
    const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return generateTimeSeriesData(days);
  },

  getTopVariants: (limit = 5) => {
    const allVariants: VariantMetrics[] = [];
    for (const screen of get().screenAnalytics) {
      allVariants.push(...screen.variantMetrics);
    }
    return allVariants
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, limit);
  },

  setDateRange: (range) => set({ dateRange: range }),
  setSelectedScreen: (screenId) => set({ selectedScreenId: screenId }),

  generateMockData: () => {
    // Generate mock screen analytics
    const mockScreens = [
      { id: 'screen-1', name: 'Landing Page' },
      { id: 'screen-2', name: 'Pricing Page' },
      { id: 'screen-3', name: 'Product Page' },
      { id: 'screen-4', name: 'Checkout Flow' },
    ];

    const variantLabels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

    const screenAnalytics: ScreenAnalytics[] = mockScreens.map((screen) => {
      const numVariants = randomInRange(2, 4);
      const topPerformerIndex = randomInRange(0, numVariants - 1);

      const variantMetrics = variantLabels.slice(0, numVariants).map((label, index) =>
        generateVariantMetrics(
          `variant-${screen.id}-${label}`,
          `Variant ${label}`,
          screen.id,
          index === topPerformerIndex
        )
      );

      const totalViews = variantMetrics.reduce((sum, v) => sum + v.views, 0);
      const totalClicks = variantMetrics.reduce((sum, v) => sum + v.clicks, 0);
      const avgEngagement = variantMetrics.reduce((sum, v) => sum + v.avgTimeSpent, 0) / variantMetrics.length;

      return {
        screenId: screen.id,
        screenName: screen.name,
        totalViews,
        totalClicks,
        avgEngagement,
        variantMetrics,
        topPerformer: variantMetrics[topPerformerIndex].variantId,
        lastUpdated: new Date().toISOString(),
      };
    });

    set({ screenAnalytics });
  },
}));

// Helper function to format numbers
export const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Helper function to format percentage
export const formatPercent = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

// Helper function to format time
export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

// Helper to get trend indicator
export const getTrend = (current: number, previous: number): { direction: 'up' | 'down' | 'neutral'; percent: number } => {
  if (previous === 0) return { direction: 'neutral', percent: 0 };
  const percent = ((current - previous) / previous) * 100;
  return {
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
    percent: Math.abs(percent),
  };
};
