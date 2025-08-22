import { Counter, PermissionType } from "@prisma/client";
import { checkHasSharePermission, DBAdapter } from "../db";
import { PermissionError } from "@/lib/errors";
import { CheckHasSharePermissionArgs } from "./sharedLayout";

/**
 * Fetch all counters for a given user.
 */
export async function getCounters(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<Counter[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  return await DBAdapter.getPrismaClient().counter.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

/**
 * Fetch a single counter by its ID (and ensure it belongs to the user).
 */
export async function getCounterById(
  userId: number,
  counterId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<Counter | null> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: counterId,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  return await DBAdapter.getPrismaClient().counter.findFirst({
    where: { id: counterId, userId },
  });
}

/**
 * Create a new counter for the user.
 */
export async function createCounter(
  userId: number,
  data: Counter,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<Counter> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  return await DBAdapter.getPrismaClient().counter.create({
    data: { userId, name: data.name, value: data.value },
  });
}

/**
 * Update an existing counter’s name and/or value.
 * Throws if the counter doesn’t exist or isn’t owned by the user.
 */
export async function updateCounter(
  userId: number,
  counterId: number,
  data: Counter,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<Counter> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: counterId,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const existing = await DBAdapter.getPrismaClient().counter.findFirst({
    where: { id: counterId, userId },
  });
  if (!existing) {
    throw new Error("Counter not found or unauthorized");
  }

  // Use transaction to ensure both counter update and history entry are created
  const updatedCounter = await DBAdapter.getPrismaClient().$transaction(async (prisma) => {
    // Update the counter
    const updated = await prisma.counter.update({
      where: { id: counterId },
      data,
    });

    // Create history entry if value changed
    if (data.value !== undefined && data.value !== existing.value) {
      await prisma.counterHistory.create({
        data: {
          counterId,
          userId,
          value: data.value,
        },
      });
    }

    return updated;
  });

  return updatedCounter;
}

/**
 * Delete a counter.
 * Throws if the counter doesn’t exist or isn’t owned by the user.
 */
export async function deleteCounter(
  userId: number,
  counterId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: counterId,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const existing = await DBAdapter.getPrismaClient().counter.findFirst({
    where: { id: counterId, userId },
  });
  if (!existing) {
    throw new Error("Counter not found or unauthorized");
  }

  await DBAdapter.getPrismaClient().counter.delete({
    where: { id: counterId },
  });
}

/**
 * Fetch counter history for a specific counter within a date range.
 */
export async function getCounterHistory(
  counterId: number,
  userId: number,
  startDate?: Date,
  endDate?: Date,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
) {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: counterId,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const whereClause: any = {
    counterId,
    userId,
  };

  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp.gte = startDate;
    if (endDate) whereClause.timestamp.lte = endDate;
  }

  return await DBAdapter.getPrismaClient().counterHistory.findMany({
    where: whereClause,
    orderBy: { timestamp: "asc" },
  });
}

/**
 * Get time-grouped aggregated counter data for a specific counter.
 */
export async function getCounterTimeAggregates(
  counterId: number,
  userId: number,
  groupBy: "month" | "day" | "hour",
  timeRange: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
) {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "counters",
      resourceId: counterId,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const now = new Date();
  let startDate: Date;

  // Calculate start date based on groupBy and timeRange
  if (groupBy === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - timeRange + 1, 1);
  } else if (groupBy === "day") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - timeRange + 1);
    startDate.setHours(0, 0, 0, 0);
  } else { // hour
    startDate = new Date(now);
    startDate.setHours(startDate.getHours() - timeRange + 1, 0, 0, 0);
  }

  // Get all history entries for the time period
  const history = await getCounterHistory(
    counterId, 
    userId, 
    startDate, 
    undefined, 
    authenticated, 
    shareToken, 
    sessionUserId
  );

  // Group by time period and calculate aggregates
  const timeData = new Map<string, {
    period: string;
    changes: number[];
    firstValue?: number;
    lastValue?: number;
    changeCount: number;
  }>();

  history.forEach((entry) => {
    let periodKey: string;
    
    if (groupBy === "month") {
      periodKey = entry.timestamp.toISOString().substring(0, 7); // "YYYY-MM"
    } else if (groupBy === "day") {
      periodKey = entry.timestamp.toISOString().substring(0, 10); // "YYYY-MM-DD"
    } else { // hour
      periodKey = entry.timestamp.toISOString().substring(0, 13); // "YYYY-MM-DDTHH"
    }
    
    if (!timeData.has(periodKey)) {
      timeData.set(periodKey, {
        period: periodKey,
        changes: [],
        changeCount: 0,
      });
    }

    const data = timeData.get(periodKey)!;
    data.changes.push(entry.value);
    data.changeCount++;
    
    if (!data.firstValue) {
      data.firstValue = entry.value;
    }
    data.lastValue = entry.value;
  });

  // Fill in missing periods with zero data
  const filledData = fillMissingPeriods(timeData, startDate, now, groupBy);

  // Convert to array and calculate derived values
  return filledData.map((data) => ({
    period: data.period,
    totalChanges: data.changes.reduce((sum: number, val: number) => sum + Math.abs(val - (data.firstValue || 0)), 0),
    netChange: (data.lastValue || 0) - (data.firstValue || 0),
    startValue: data.firstValue || 0,
    endValue: data.lastValue || 0,
    changeCount: data.changeCount,
    averageValue: data.changes.length > 0 ? 
      data.changes.reduce((sum: number, val: number) => sum + val, 0) / data.changes.length : 0,
  })).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Fill in missing time periods with zero data for consistent charting
 */
function fillMissingPeriods(
  timeData: Map<string, any>,
  startDate: Date,
  endDate: Date,
  groupBy: "month" | "day" | "hour"
): any[] {
  const result: any[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    let periodKey: string;
    
    if (groupBy === "month") {
      periodKey = current.toISOString().substring(0, 7);
      current.setMonth(current.getMonth() + 1);
    } else if (groupBy === "day") {
      periodKey = current.toISOString().substring(0, 10);
      current.setDate(current.getDate() + 1);
    } else { // hour
      periodKey = current.toISOString().substring(0, 13);
      current.setHours(current.getHours() + 1);
    }

    const existingData = timeData.get(periodKey);
    if (existingData) {
      result.push(existingData);
    } else {
      result.push({
        period: periodKey,
        changes: [],
        firstValue: 0,
        lastValue: 0,
        changeCount: 0,
      });
    }
  }

  return result;
}

// Keep the old function for backward compatibility
export async function getCounterMonthlyAggregates(
  counterId: number,
  userId: number,
  monthsBack: number = 12,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
) {
  const result = await getCounterTimeAggregates(
    counterId, 
    userId, 
    "month", 
    monthsBack, 
    authenticated, 
    shareToken, 
    sessionUserId
  );
  
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
