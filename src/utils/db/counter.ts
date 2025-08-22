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
 * Get monthly aggregated counter data for a specific counter.
 */
export async function getCounterMonthlyAggregates(
  counterId: number,
  userId: number,
  monthsBack: number = 12,
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

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

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

  // Group by month and calculate aggregates
  const monthlyData = new Map<string, {
    month: string;
    changes: number[];
    firstValue?: number;
    lastValue?: number;
    changeCount: number;
  }>();

  history.forEach((entry) => {
    const monthKey = entry.timestamp.toISOString().substring(0, 7); // "YYYY-MM"
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        changes: [],
        changeCount: 0,
      });
    }

    const monthData = monthlyData.get(monthKey)!;
    monthData.changes.push(entry.value);
    monthData.changeCount++;
    
    if (!monthData.firstValue) {
      monthData.firstValue = entry.value;
    }
    monthData.lastValue = entry.value;
  });

  // Convert to array and calculate derived values
  return Array.from(monthlyData.values()).map((data) => ({
    month: data.month,
    totalChanges: data.changes.reduce((sum, val) => sum + Math.abs(val - (data.firstValue || 0)), 0),
    netChange: (data.lastValue || 0) - (data.firstValue || 0),
    startValue: data.firstValue || 0,
    endValue: data.lastValue || 0,
    changeCount: data.changeCount,
    averageValue: data.changes.length > 0 ? 
      data.changes.reduce((sum, val) => sum + val, 0) / data.changes.length : 0,
  })).sort((a, b) => a.month.localeCompare(b.month));
}
