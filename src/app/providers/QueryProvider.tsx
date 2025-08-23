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
        // Poll every 5 minutes for data updates
        refetchInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
        // Only refetch when window is in focus to be respectful of resources
        refetchIntervalInBackground: false,
        // Don't refetch on window focus since we're already polling
        refetchOnWindowFocus: false,
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
