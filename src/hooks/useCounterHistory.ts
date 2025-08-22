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

// Deprecated: Use fetchCounterTimeAggregatedData instead
async function fetchCounterMonthlyData(
  userId: number,
  counterId: number,
  monthsBack: number = 12
): Promise<MonthlyCounterData[]> {
  console.warn('fetchCounterMonthlyData is deprecated. Use fetchCounterTimeAggregatedData instead.');
  
  // Use the new aggregated API instead
  const result = await fetchCounterTimeAggregatedData(userId, counterId, "month", monthsBack);
  
  // Convert to old format for backward compatibility
  return result.map(data => ({
    month: data.period,
    totalChanges: data.totalChanges,
    netChange: data.netChange,
    startValue: data.startValue,
    endValue: data.endValue,
    changeCount: data.changeCount,
    averageValue: data.averageValue,
  }));
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

  console.log("Fetching counter data from:", url.toString());
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error ${res.status}:`, errorText);
    throw new Error(`Error fetching ${groupBy} counter data: ${res.status} ${errorText}`);
  }
  
  const json = await res.json();
  console.log("API Response:", json);
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

// Deprecated: Use useCounterTimeAggregatedData instead
export function useCounterMonthlyData(
  userId: number,
  counterId: number,
  monthsBack: number = 12,
  enabled: boolean = true
) {
  console.warn('useCounterMonthlyData is deprecated. Use useCounterTimeAggregatedData instead.');
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

// Deprecated: Use useCounterTimeAggregatedDataHook instead
export function useCounterHistoryData(
  userId: number,
  counterId: number,
  monthsBack: number = 12,
  enabled: boolean = true
): CounterHistoryHook {
  console.warn('useCounterHistoryData is deprecated. Use useCounterTimeAggregatedDataHook instead.');
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