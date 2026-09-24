import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance for ZapTab mobile.
 * Configured with caching and retry rules optimized for mobile networks.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // Data fresh for 2 minutes
      gcTime: 1000 * 60 * 15, // Cache held in memory for 15 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
