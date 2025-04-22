// ===============================
import { useCounters } from "@/hooks/useCounters";

/**
 * A single selectable item in a dropdown.
 * `id` MUST be unique per data source; it is used as the option value
 * (stringified), and persisted in widget settings.
 */
export interface DataSourceItem {
  id: number;
  label: string; // e.g. counter name – editable by user
  value: unknown; // arbitrary payload (number for counter, etc.)
}

export interface DataSourceHook {
  items: DataSourceItem[];
  create: (payload?: Partial<Omit<DataSourceItem, "id">>) => void;
  update: (id: number, payload: Partial<Omit<DataSourceItem, "id">>) => void;
  remove: (id: number) => void;
  isLoading: boolean;
}

export function useCounterDataSource(
  userId: number,
  enabled = true
): DataSourceHook {
  const {
    data: counters,
    createCounter,
    updateCounter,
    deleteCounter,
    isPending,
  } = useCounters(userId, enabled);

  return {
    items: (counters ?? []).map((c) => ({
      id: c.id!,
      label: c.name,
      value: c.value,
    })),
    create: (payload) =>
      createCounter.mutate({ name: payload?.label ?? "New Counter", value: 0 }),
    update: (id, payload) =>
      updateCounter.mutate({
        id,
        name: payload.label,
        value: payload.value as number,
      }),
    remove: (id) => deleteCounter.mutate(id),
    isLoading:
      isPending ||
      createCounter.isPending ||
      updateCounter.isPending ||
      deleteCounter.isPending,
  };
}

function useDummyDataSource(userId: number): DataSourceHook {
  return {
    items: [],
    create: (payload) => {},
    update: (id, payload) => {},
    remove: (id) => {},
    isLoading: false,
  };
}

export function useDataSource(source: string, userId: number): DataSourceHook {
  const countersDS = useCounterDataSource(userId, source === "counters");
  const dummyDS = useDummyDataSource(userId);
  switch (source) {
    case "counters":
        return countersDS;
    default:
        return dummyDS;
  }
}
