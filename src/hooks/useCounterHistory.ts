import { useQuery } from "@tanstack/react-query";

export interface MonthlyCounterData {
  month: string; // "YYYY-MM" - kept for backward compatibility
  totalChanges: number;
  netChange: number;
  startValue: number;
  endValue: number;
  changeCount: number;
  averageValue: number;
}

export interface TimeAggregatedData {
  period: string; // "YYYY-MM", "YYYY-MM-DD", or "YYYY-MM-DDTHH"
  totalChanges: number;
  netChange: number;
  startValue: number;
  endValue: number;
  changeCount: number;
  averageValue: number;
}

export interface CounterHistoryEntry {
  id: number;
  counterId: number;
  userId: number;
  value: number;
  timestamp: string; // ISO string
}

async function fetchCounterHistory(
  userId: number,
  counterId: number,
  startDate?: Date,
  endDate?: Date
): Promise<CounterHistoryEntry[]> {
  const url = new URL("/api/v1/counters/history", window.location.origin);
  url.searchParams.set("userId", userId.toString());
  url.searchParams.set("counterId", counterId.toString());
  
  if (startDate) {
    url.searchParams.set("startDate", startDate.toISOString());
  }
  if (endDate) {
    url.searchParams.set("endDate", endDate.toISOString());
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Error fetching counter history");
  
  const json = await res.json();
  return json.data ?? [];
}

async function fetchCounterMonthlyData(
  userId: number,
  counterId: number,
  monthsBack: number = 12
): Promise<MonthlyCounterData[]> {
  const url = new URL("/api/v1/counters/monthly", window.location.origin);
  url.searchParams.set("userId", userId.toString());
  url.searchParams.set("counterId", counterId.toString());
  url.searchParams.set("monthsBack", monthsBack.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Error fetching monthly counter data");
  
  const json = await res.json();
  return json.data ?? [];
}

async function fetchCounterTimeAggregatedData(
  userId: number,
  counterId: number,
  groupBy: "month" | "day" | "hour",
  timeRange: number
): Promise<TimeAggregatedData[]> {
  const url = new URL("/api/v1/counters/aggregated", window.location.origin);
  url.searchParams.set("userId", userId.toString());
  url.searchParams.set("counterId", counterId.toString());
  url.searchParams.set("groupBy", groupBy);
  url.searchParams.set("timeRange", timeRange.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Error fetching ${groupBy} counter data`);
  
  const json = await res.json();
  return json.data ?? [];
}

export function useCounterHistory(
  userId: number,
  counterId: number,
  startDate?: Date,
  endDate?: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["counterHistory", userId, counterId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => fetchCounterHistory(userId, counterId, startDate, endDate),
    enabled: !!userId && !!counterId && enabled,
  });
}

export function useCounterMonthlyData(
  userId: number,
  counterId: number,
  monthsBack: number = 12,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["counterMonthly", userId, counterId, monthsBack],
    queryFn: () => fetchCounterMonthlyData(userId, counterId, monthsBack),
    enabled: !!userId && !!counterId && enabled,
  });
}

export function useCounterTimeAggregatedData(
  userId: number,
  counterId: number,
  groupBy: "month" | "day" | "hour",
  timeRange: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["counterTimeAggregated", userId, counterId, groupBy, timeRange],
    queryFn: () => fetchCounterTimeAggregatedData(userId, counterId, groupBy, timeRange),
    enabled: !!userId && !!counterId && enabled,
  });
}

export interface CounterHistoryHook {
  monthlyData: MonthlyCounterData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface CounterTimeAggregatedHook {
  timeData: TimeAggregatedData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Main hook that combines monthly data fetching with loading states (backward compatibility)
export function useCounterHistoryData(
  userId: number,
  counterId: number,
  monthsBack: number = 12,
  enabled: boolean = true
): CounterHistoryHook {
  const query = useCounterMonthlyData(userId, counterId, monthsBack, enabled);

  return {
    monthlyData: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// New main hook for flexible time aggregation
export function useCounterTimeAggregatedDataHook(
  userId: number,
  counterId: number,
  groupBy: "month" | "day" | "hour",
  timeRange: number,
  enabled: boolean = true
): CounterTimeAggregatedHook {
  const query = useCounterTimeAggregatedData(userId, counterId, groupBy, timeRange, enabled);

  return {
    timeData: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}