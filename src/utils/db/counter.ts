import { Counter, PermissionType } from "@prisma/client";
import { checkHasSharePermission, DBAdapter } from "../db";
import { PermissionError } from "@/lib/errors";
import { CheckHasSharePermissionArgs } from "./sharedLayout";
import { 
  getNowInEST, 
  getStartOfDayEST, 
  getEndOfDayEST, 
  getStartOfMonthEST, 
  getEndOfMonthEST, 
  getStartOfHourEST, 
  getEndOfHourEST,
  getPeriodKeyEST,
  addPeriodEST,
  toEST
} from "../timezone";

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

  const now = getNowInEST();
  let startDate: Date;
  let endDate: Date;

  // Calculate start and end dates based on groupBy and timeRange in EST
  // Always include the current period (day/month/hour) plus (timeRange-1) previous periods
  if (groupBy === "month") {
    // Start from the first day of the month that is (timeRange-1) months before current month
    startDate = getStartOfMonthEST(addPeriodEST(now, -(timeRange - 1), "month"));
    // End at the last moment of the current month to include the full current month
    endDate = getEndOfMonthEST(now);
  } else if (groupBy === "day") {
    // Start from 00:00:00 of the day that is (timeRange-1) days before today
    startDate = getStartOfDayEST(addPeriodEST(now, -(timeRange - 1), "day"));
    // End at 23:59:59 of today to include the full current day
    endDate = getEndOfDayEST(now);
  } else { // hour
    // Start from the beginning of the hour that is (timeRange-1) hours before current hour
    startDate = getStartOfHourEST(addPeriodEST(now, -(timeRange - 1), "hour"));
    // End at the end of the current hour to include the full current hour
    endDate = getEndOfHourEST(now);
  }


  // Get all history entries for the time period
  const history = await getCounterHistory(
    counterId, 
    userId, 
    startDate, 
    endDate, 
    authenticated, 
    shareToken, 
    sessionUserId
  );

  // Group by time period and collect raw changes
  const timeData = new Map<string, {
    period: string;
    changes: number[];
    startValue?: number;
    endValue?: number;
    changeCount: number;
  }>();

  // Sort history by timestamp to ensure proper chronological order
  const sortedHistory = history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group entries by period and collect all changes for each period
  sortedHistory.forEach((entry) => {
    const periodKey = getPeriodKeyEST(entry.timestamp, groupBy);
    
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
  });

  // Get current counter value 
  const counter = await DBAdapter.getPrismaClient().counter.findFirst({
    where: { id: counterId, userId }
  });
  const currentValue = counter?.value || 0;
  // Determine period keys across the whole requested range
  const allPeriodKeys = generatePeriodKeys(startDate, endDate, groupBy);

  // Establish baseline value before the range start
  const previousBeforeRange = await DBAdapter.getPrismaClient().counterHistory.findFirst({
    where: {
      counterId,
      userId,
      timestamp: { lt: startDate }
    },
    orderBy: { timestamp: 'desc' }
  });
  let runningValue = previousBeforeRange?.value || 0;

  // Compute start/end for every period chronologically
  const currentPeriodKey = getPeriodKeyEST(getNowInEST(), groupBy);
  const computed = allPeriodKeys.map((periodKey) => {
    const data = timeData.get(periodKey) ?? { period: periodKey, changes: [], changeCount: 0 };
    data.changeCount = data.changes.length;
    data.startValue = runningValue;
    if (data.changes.length > 0) {
      data.endValue = data.changes[data.changes.length - 1];
    } else if (periodKey === currentPeriodKey) {
      data.endValue = currentValue;
    } else {
      data.endValue = data.startValue;
    }
    runningValue = data.endValue as number;
    return data;
  });

  // Clamp to not exceed current EST period
  const clampedData = computed.filter(item => item.period <= currentPeriodKey);

  // Convert to array and calculate derived values
  const result = clampedData.map((data) => {
    const netChange = (data.endValue || 0) - (data.startValue || 0);
    
    return {
      period: data.period,
      totalChanges: data.changes.reduce((sum: number, val: number) => sum + Math.abs(val - (data.startValue || 0)), 0),
      netChange,
      startValue: data.startValue || 0,
      endValue: data.endValue || 0,
      changeCount: data.changeCount,
      averageValue: data.changes.length > 0 ? 
        data.changes.reduce((sum: number, val: number) => sum + val, 0) / data.changes.length : 0,
    };
  }).sort((a, b) => a.period.localeCompare(b.period));

  return result;
}

/**
 * Generate ordered period keys between startDate and endDate inclusive (in EST)
 */
function generatePeriodKeys(
  startDate: Date,
  endDate: Date,
  groupBy: "month" | "day" | "hour"
): string[] {
  const keys: string[] = [];
  const startKey = getPeriodKeyEST(startDate, groupBy);
  const endKey = getPeriodKeyEST(endDate, groupBy);
  const current = new Date(startDate);
  while (getPeriodKeyEST(current, groupBy) <= endKey) {
    keys.push(getPeriodKeyEST(current, groupBy));
    if (groupBy === "month") {
      current.setMonth(current.getMonth() + 1);
    } else if (groupBy === "day") {
      current.setDate(current.getDate() + 1);
    } else {
      current.setHours(current.getHours() + 1);
    }
    if (keys.length > 1000) {
      console.error('generatePeriodKeys infinite loop detected!');
      break;
    }
  }
  return keys;
}

// Deprecated: Use getCounterTimeAggregates with groupBy: "month" instead
export async function getCounterMonthlyAggregates(
  counterId: number,
  userId: number,
  monthsBack: number = 12,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
) {
  console.warn('getCounterMonthlyAggregates is deprecated. Use getCounterTimeAggregates with groupBy: "month" instead.');
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
