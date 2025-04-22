import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

  const updateCounter = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number } & Partial<Omit<Counter, "id">>) =>
      updateCounterApi(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counters", userId] });
    },
  });

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
