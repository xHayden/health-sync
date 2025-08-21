import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface Counter {
  id?: number;
  name: string;
  value: number;
}

async function fetchCounters(userId: number): Promise<Counter[]> {
  const res = await fetch(`/api/v1/counters?userId=${userId}`);
  if (!res.ok) throw new Error("Error fetching counters");
  const json = await res.json();
  return json.data ?? [];
}

async function createCounterApi(
  userId: number,
  payload: Omit<Counter, "id">
): Promise<Counter> {
  const res = await fetch("/api/v1/counters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...payload }),
  });
  if (!res.ok) throw new Error("Error creating counter");
  return await res.json();
}

async function updateCounterApi(
  userId: number,
  id: number,
  payload: Partial<Omit<Counter, "id">>
): Promise<Counter> {
  const res = await fetch("/api/v1/counters", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, id, ...payload }),
  });
  if (!res.ok) throw new Error("Error updating counter");
  return await res.json();
}

async function deleteCounterApi(userId: number, id: number): Promise<void> {
  const url = new URL("/api/v1/counters", window.location.origin);
  url.searchParams.set("userId", userId.toString());
  url.searchParams.set("id", id.toString());
  const res = await fetch(url.toString(), { method: "DELETE" });
  if (!res.ok) throw new Error("Error deleting counter");
}

export function useCounters(userId: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["counters", userId],
    queryFn: () => fetchCounters(userId),
    enabled: !!userId && enabled,
  });

  const createCounter = useMutation({
    mutationFn: (data: Omit<Counter, "id">) =>
      createCounterApi(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counters", userId] });
    },
  });

  // Low-level mutation for actually calling the API
  const updateCounterMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number } & Partial<Omit<Counter, "id">>) =>
      updateCounterApi(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counters", userId] });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to update counter";
      toast.error("Counter update failed", { description: message });
    },
  });

  // --- Optimistic, ordered, debounced queue ---
  type UpdateArgs = { id: number } & Partial<Omit<Counter, "id">>;
  const queuesRef = useRef<Map<number, UpdateArgs[]>>(new Map());
  const flushingRef = useRef<Set<number>>(new Set());
  const debouncersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [pendingOps, setPendingOps] = useState(0);

  const getQueue = (id: number) => {
    let q = queuesRef.current.get(id);
    if (!q) {
      q = [];
      queuesRef.current.set(id, q);
    }
    return q;
  };

  const optimisticallyUpdateCache = (id: number, data: Partial<Omit<Counter, "id">>) => {
    queryClient.setQueryData<Counter[] | undefined>(["counters", userId], (old) => {
      if (!old) return old as any;
      return old.map((c) => (c.id === id ? { ...c, ...data } : c));
    });
  };

  const flushQueue = async (id: number) => {
    if (flushingRef.current.has(id)) return;
    flushingRef.current.add(id);
    try {
      const q = getQueue(id);
      while (q.length > 0) {
        const next = q.shift()!;
        try {
          await updateCounterMutation.mutateAsync(next);
        } catch (e) {
          // On error, refetch to reconcile and stop further sends for this id.
          queryClient.invalidateQueries({ queryKey: ["counters", userId] });
          const remaining = q.length;
          q.length = 0;
          setPendingOps((p) => Math.max(0, p - 1 - remaining));
          break;
        } finally {
          setPendingOps((p) => Math.max(0, p - 1));
        }
      }
    } finally {
      flushingRef.current.delete(id);
    }
  };

  const scheduleFlush = (id: number, delayMs: number) => {
    const existing = debouncersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(() => {
      debouncersRef.current.delete(id);
      void flushQueue(id);
    }, delayMs);
    debouncersRef.current.set(id, handle);
  };

  const enqueueUpdate = (args: UpdateArgs) => {
    const { id, ...data } = args;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.warning("Offline: update queued", {
        description: "We'll send your counter update when you're back online.",
      });
    }
    // Optimistic cache update immediately
    optimisticallyUpdateCache(id, data);
    // Enqueue request preserving order
    getQueue(id).push(args);
    setPendingOps((p) => p + 1);
    // Debounce flush to coalesce rapid clicks, but maintain ordering in the queue
    scheduleFlush(id, 150);
  };

  // Prevent page unload/navigation while there are pending queued updates
  useEffect(() => {
    const OFFLINE_TOAST_ID = "offline-status";
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingOps > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingOps]);

  // Show connectivity toasts
  useEffect(() => {
    const OFFLINE_TOAST_ID = "offline-status";
    const onOffline = () =>
      toast.error("You are offline", {
        description: "Updates will queue and send when back online.",
        id: OFFLINE_TOAST_ID,
        duration: Infinity,
      });
    const onOnline = () => {
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success("Back online", {
        description: "Queued updates will now be sent.",
      });
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Public API: keep the same shape as a react-query mutation result for ease of use
  const updateCounter = {
    mutate: (args: UpdateArgs) => enqueueUpdate(args),
    isPending: pendingOps > 0 || updateCounterMutation.isPending,
  } as const;

  const deleteCounter = useMutation({
    mutationFn: (id: number) => deleteCounterApi(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counters", userId] });
    },
  });

  return {
    ...query,
    createCounter,
    updateCounter,
    deleteCounter,
  };
}
