import {
  DailyWorkoutSummary,
  HealthDataPoint,
  PermissionType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { DBAdapter } from "../db";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

export async function insertWorkoutSummaries(
  userId: number,
  workoutSummaries: Prisma.DailyWorkoutSummaryCreateInput[],
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<DailyWorkoutSummary[]> {
  if (!workoutSummaries || workoutSummaries.length === 0) return [];

  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: ["workoutSummaries", "activityDaysLevels"],
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const prismaClient = DBAdapter.getPrismaClient();

  // Helper to build proper HealthDataPointWhereUniqueInput
  function toHDPWhereUnique(
    obj: Prisma.HealthDataPointWhereUniqueInput
  ): Prisma.HealthDataPointWhereUniqueInput {
    if ("id" in obj && obj.id !== undefined) {
      return { id: obj.id };
    }
    return {
      userId_timestamp_category: obj.userId_timestamp_category!,
    };
  }

  try {
    const createdSummaries = await Promise.all(
      workoutSummaries.map((summary) => {
        let toConnect = summary.healthDataPointMetrics?.connect;
        if (Array.isArray(toConnect)) {
          toConnect = toConnect.map(toHDPWhereUnique);
        } else {
          if (!toConnect)
            throw Error(
              "Invalid connection for workout summary healthDataPointMetrics"
            );
          toConnect = toHDPWhereUnique(toConnect);
        }
        const data: Prisma.DailyWorkoutSummaryCreateInput = {
          date: summary.date,
          totalWorkoutTime: summary.totalWorkoutTime,
          energyBurned: summary.energyBurned,
          totalDistance: summary.totalDistance,
          steps: summary.steps,
          tts: summary.tts,
          atl: summary.atl,
          ctl: summary.ctl,
          bodyweight: summary.bodyweight,
          exerciseTypes: summary.exerciseTypes,
          user: {
            connect: { id: userId },
          },
          workouts: summary.workouts,
          healthDataPointMetrics: {
            connect: toConnect,
            create: summary.healthDataPointMetrics?.create ?? [],
          },
        };
        if (!data.user?.connect?.id) {
          throw new Error("Invalid data: userId is required to connect user.");
        }

        return prismaClient.dailyWorkoutSummary.create({ data });
      })
    );

    console.log(
      `Inserted ${createdSummaries.length} workout summaries for user ${userId}`
    );

    return createdSummaries;
  } catch (error) {
    console.error(
      `Error inserting workout summaries: ${(error as Error).message}`
    );
    throw error;
  }
  return [];
}

/**
 * Inserts multiple DailyWorkoutSummary records in bulk and manages their relational fields.
 * @param userId - The ID of the user.
 * @param workoutSummaries - An array of DailyWorkoutSummary inputs, each potentially containing associated workouts and health data metrics.
 */
export async function insertWorkoutSummariesBulk(
  userId: number,
  workoutSummaries: Prisma.DailyWorkoutSummaryCreateInput[],
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!workoutSummaries || workoutSummaries.length === 0) {
    console.log("No workout summaries to insert or update.");
    return;
  }

  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: ["workoutSummaries", "activityDaysLevels"],
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const prisma: PrismaClient = DBAdapter.getPrismaClient();
  const updateBatchSize = 50;

  // STEP 1: Upsert Daily Workout Summaries in Batches
  // Break the large array into chunks
  for (let i = 0; i < workoutSummaries.length; i += updateBatchSize) {
    const batch = workoutSummaries.slice(i, i + updateBatchSize);
    await prisma.$transaction(
      async (tx: any) => {
        for (const summary of batch) {
          await tx.dailyWorkoutSummary.upsert({
            where: {
              userId_date: {
                userId,
                date: new Date(summary.date),
              },
            },
            create: {
              userId,
              date: summary.date,
              totalWorkoutTime: summary.totalWorkoutTime,
              energyBurned: summary.energyBurned,
              totalDistance: summary.totalDistance,
              steps: summary.steps,
              tts: summary.tts,
              atl: summary.atl,
              ctl: summary.ctl,
              bodyweight: summary.bodyweight,
              exerciseTypes: summary.exerciseTypes,
            },
            update: {
              totalWorkoutTime: summary.totalWorkoutTime,
              energyBurned: summary.energyBurned,
              totalDistance: summary.totalDistance,
              steps: summary.steps,
              tts: summary.tts,
              atl: summary.atl,
              ctl: summary.ctl,
              bodyweight: summary.bodyweight,
              exerciseTypes: summary.exerciseTypes,
            },
          });
        }
      },
      {
        maxWait: 20000, // Increase if needed
        timeout: 15000, // Increase if needed
      }
    );
    console.log(`Upserted batch ${i / updateBatchSize + 1} of summaries`);
  }

  console.log(
    `Upserted ${workoutSummaries.length} workout summaries for user ${userId}.`
  );

  // STEP 2: Fetch all inserted/updated summaries to get their IDs
  const insertedSummaries = await prisma.dailyWorkoutSummary.findMany({
    where: {
      userId,
      date: {
        in: workoutSummaries.map((s) => new Date(s.date)),
      },
    },
    select: {
      id: true,
      date: true,
    },
  });

  const summaryMap = new Map<string, number>();
  insertedSummaries.forEach((summary) => {
    const dateKey = summary.date.toISOString().split("T")[0];
    summaryMap.set(dateKey, summary.id);
  });

  // STEP 3: Connect Workouts to Summaries
  const workoutConnections: { workoutId: number; summaryId: number }[] = [];

  workoutSummaries.forEach((summary) => {
    let key;
    if (summary.date instanceof Date) {
      key = summary.date.toISOString().split("T")[0];
    } else {
      key = summary.date.split("T")[0];
    }
    const summaryId = summaryMap.get(key);
    const connects = Array.isArray(summary.workouts?.connect)
      ? summary.workouts.connect
      : summary.workouts?.connect
      ? [summary.workouts.connect]
      : [];

    connects.forEach((w) => {
      if ("id" in w && typeof w.id === "number") {
        if (summaryId) workoutConnections.push({ workoutId: w.id, summaryId });
      }
    });
  });

  for (let i = 0; i < workoutConnections.length; i += updateBatchSize) {
    const batch = workoutConnections.slice(i, i + updateBatchSize);
    await prisma.$transaction(
      async (tx: any) => {
        const updatePromises = batch.map((conn) =>
          tx.workout.update({
            where: { id: conn.workoutId },
            data: { dailyWorkoutSummaryId: conn.summaryId },
          })
        );
        await Promise.all(updatePromises);
      },
      {
        maxWait: 20000,
        timeout: 15000,
      }
    );
    console.log(
      `Connected batch ${
        Math.floor(i / updateBatchSize) + 1
      } of workouts to summaries.`
    );
  }

  console.log(
    `Successfully connected ${workoutConnections.length} workouts to their respective summaries.`
  );

  // STEP 4: Handle HealthDataPointMetrics (existing and new)
  const existingMetricsConnectByFields: Prisma.HealthDataPointWhereUniqueInput[] =
    [];
  const newMetricsCreate: Prisma.HealthDataPointCreateInput[] = [];

  workoutSummaries.forEach((summary) => {
    const dateKey = new Date(summary.date).toISOString().split("T")[0];
    const summaryId = summaryMap.get(dateKey);

    if (summaryId && summary.healthDataPointMetrics) {
      const connectInputs = summary.healthDataPointMetrics.connect ?? [];
      const createInputs = summary.healthDataPointMetrics.create ?? [];

      // Normalize and push connect inputs
      (Array.isArray(connectInputs) ? connectInputs : [connectInputs]).forEach(
        (metric) => {
          existingMetricsConnectByFields.push(metric);
        }
      );

      // Normalize and push create inputs
      (Array.isArray(createInputs) ? createInputs : [createInputs]).forEach(
        (metric) => {
          newMetricsCreate.push(metric);
        }
      );
    }
  });

  // Connect existing HealthDataPoints by fields in batches
  await prisma.$transaction(
    async (tx) => {
      const updatePromises = existingMetricsConnectByFields.map((metric) => {
        // 1) force timestamp into a JS Date
        const ts = new Date((metric as any).timestamp);
        // 2) build your YYYY-MM-DD key
        const dateKey = ts.toISOString().split("T")[0];
        // 3) fire off the update
        return tx.healthDataPoint.updateMany({
          where: {
            userId: metric.userId,
            category: metric.category,
            timestamp: ts,
          },
          data: {
            dailyWorkoutSummaryId: summaryMap.get(dateKey) ?? undefined,
          },
        });
      });

      await Promise.all(updatePromises);
    },
    { maxWait: 20000, timeout: 15000 }
  );

  console.log(
    `Successfully connected ${existingMetricsConnectByFields.length} existing health data metrics.`
  );

  // Create new HealthDataPointMetrics in batches
  if (newMetricsCreate.length > 0) {
    const metricsData = newMetricsCreate.map(
      (metric: Prisma.HealthDataPointCreateInput) => {
        const dateKey = new Date(metric.timestamp).toISOString().split("T")[0];
        const summaryId = summaryMap.get(dateKey);
        return {
          userId,
          dailyWorkoutSummaryId: summaryId,
          timestamp: metric.timestamp,
          value: metric.value,
          category: metric.category,
        };
      }
    );

    for (let i = 0; i < metricsData.length; i += updateBatchSize) {
      const batch = metricsData.slice(i, i + updateBatchSize);
      await prisma.$transaction(
        async (tx: any) => {
          await tx.healthDataPoint.createMany({
            data: batch,
            skipDuplicates: true,
          });
        },
        {
          maxWait: 20000,
          timeout: 15000,
        }
      );
      console.log(
        `Created batch ${
          Math.floor(i / updateBatchSize) + 1
        } of new health data metrics.`
      );
    }

    console.log(
      `Successfully created ${newMetricsCreate.length} new health data metrics.`
    );
  }

  console.log(
    `Bulk upsertion and linking of workout summaries completed successfully for user ${userId}.`
  );
}

export async function getWorkoutSummaries(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<DailyWorkoutSummary[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: ["workoutSummaries", "activityDaysLevels"],
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  const prisma = DBAdapter.getPrismaClient();
  return prisma.dailyWorkoutSummary.findMany({
    where: {
      userId,
    },
    orderBy: {
      date: "asc",
    },
    include: {
      workouts: false,
      healthDataPointMetrics: false,
    },
  });
}

export async function calculateMaxHeartRate(
  userId: number,
  interval: number
): Promise<number | null> {
  const now = new Date();
  const intervalStart = new Date(
    now.getTime() - interval * 24 * 60 * 60 * 1000
  );

  // Query to find the largest heartRate value in the last 'interval' days
  const maxHeartRateData =
    await DBAdapter.getPrismaClient().healthDataPoint.findFirst({
      where: {
        userId,
        category: "heart_rate",
        timestamp: {
          gte: intervalStart,
          lte: now,
        },
      },
      orderBy: { value: "desc" }, // Order by value descending to get the largest value
    });

  return maxHeartRateData ? maxHeartRateData.value : null;
}

export async function getMaxHeartRate(
  userId: number,
  interval: number = 30,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<number | null> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: ["workoutSummaries", "activityDaysLevels"],
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  const result = await DBAdapter.getPrismaClient().healthDataPoint.findFirst({
    where: {
      userId,
      category: "max_heart_rate",
    },
    orderBy: { timestamp: "desc" },
  });

  if (!result) {
    const calculatedMaxHeartRate = await calculateMaxHeartRate(
      userId,
      interval
    );
    if (calculatedMaxHeartRate !== null) {
      await DBAdapter.getPrismaClient().healthDataPoint.create({
        data: {
          userId,
          category: "max_heart_rate",
          value: calculatedMaxHeartRate,
          timestamp: new Date(),
        },
      });
    }
    return calculatedMaxHeartRate;
  }

  return result.value;
}

export async function getRestingHeartRates(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<HealthDataPoint[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: ["workoutSummaries", "activityDaysLevels"],
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  return await DBAdapter.getPrismaClient().healthDataPoint.findMany({
    where: {
      userId,
      category: "resting_heart_rate",
    },
    orderBy: { timestamp: "desc" },
  });
}
