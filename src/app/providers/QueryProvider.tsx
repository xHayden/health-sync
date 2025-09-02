"use client";

import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
  dehydratedState,
}: {
  children: React.ReactNode;
  dehydratedState: unknown;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Poll every 10 minutes
        refetchInterval: 10 * 60 * 1000,
        // Only refetch when window is in focus to be respectful of resources
        refetchIntervalInBackground: false,
        // Don't refetch on window focus since we're already polling
        refetchOnWindowFocus: false,
        // Force fresh data on each poll
        staleTime: 0,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
