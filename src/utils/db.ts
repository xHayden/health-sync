import { Prisma, PrismaClient } from "@prisma/client";
import {
  DailyWorkoutSummary,
  DBDailyWorkoutSummary,
  DBHealthDataPoint,
  DBSleepSession,
  DBWorkout,
  HealthDataPoint,
  HealthKitWorkout,
  HistoricalHealthData,
  PrismaDailyWorkoutSummaryInput,
  PrismaHealthDataPointInput,
  SleepSession,
  Workout,
} from "@/types/HealthData";
import { calculateAndStoreWorkoutSummaries } from "./fitnessCalc";
import { Layout, DBLayout } from "@/types/WidgetData";
import prisma from "./prisma";

export class DBAdapter {
  private constructor() {}

  static getPrismaClient(): PrismaClient {
    return prisma;
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Example: If you need to get a userId from an email or something similar:
async function getUserIdOrCreate(email: string): Promise<number> {
  let user = await DBAdapter.getPrismaClient().user.findUnique({
    where: { email },
  });
  if (!user) {
    user = await DBAdapter.getPrismaClient().user.create({
      data: { email },
    });
  }
  return user.id;
}

function validateHealthDataPoint(
  point: HealthDataPoint | DBHealthDataPoint | PrismaHealthDataPointInput
): boolean {
  return (
    typeof point.timestamp === "string" &&
    !isNaN(Date.parse(point.timestamp)) &&
    typeof point.value === "number"
  );
}

async function insertUniqueHealthDataPoints(
  userId: number,
  category: string,
  dataPoints: PrismaHealthDataPointInput[] | undefined
): Promise<void> {
  if (!dataPoints || dataPoints.length === 0) return;

  // Validate and convert timestamps
  const validData = dataPoints.filter(validateHealthDataPoint).map((point) => ({
    userId,
    category,
    timestamp: new Date(point.timestamp),
    value: point.value,
  }));

  if (validData.length > 0) {
    // createMany with skipDuplicates relies on unique constraint (userId, timestamp, category)
    await DBAdapter.getPrismaClient().healthDataPoint.createMany({
      data: validData,
      skipDuplicates: true,
    });
  }
}

async function insertWorkouts(
  userId: number,
  workouts: HealthKitWorkout[] | undefined
): Promise<void> {
  if (!workouts || workouts.length === 0) return;
  console.log(workouts);
  // Filter valid workouts and map them to the necessary data
  const documents = workouts
    .filter(
      (workout) => workout.startDate && workout.workoutType && workout.duration
    )
    .map((workout) => ({
      userId,
      timestamp: workout.startDate,
      endTimestamp: workout.endDate ? new Date(workout.endDate) : null,
      duration: workout.duration,
      energyBurned: workout.energyBurned || null,
      distance: workout.distance || null,
      // Remove heartRateSamples from the creation step
      // We'll attach them later via updateMany
      type: workout.workoutType,
    }));

  if (documents.length > 0) {
    // Create the workouts without heartRateSamples
    await DBAdapter.getPrismaClient().workout.createMany({
      data: documents,
      skipDuplicates: true,
    });

    // Fetch all newly inserted workouts by their timestamps (unique constraint ensures no duplicates)
    const insertedTimestamps = documents.map((doc) => doc.timestamp);
    const insertedWorkouts = await DBAdapter.getPrismaClient().workout.findMany(
      {
        where: {
          userId,
          timestamp: { in: insertedTimestamps },
        },
      }
    );

    // For each inserted workout, find matching heart rate data points and associate them
    for (const workout of insertedWorkouts) {
      // Only process if we have a valid endTimestamp
      if (workout.endTimestamp) {
        await DBAdapter.getPrismaClient().healthDataPoint.updateMany({
          where: {
            userId,
            category: "heart_rate",
            timestamp: {
              gte: workout.timestamp,
              lte: workout.endTimestamp,
            },
          },
          data: {
            workoutId: workout.id,
          },
        });
      }
    }

    try {
      await calculateAndStoreWorkoutSummaries(userId);
    } catch (e) {
      console.error(
        `Error calculating workout summaries: ${(e as Error).message}`
      );
    }

    // try {
    //   await calculateAndStoreWorkoutSummaries(userId);
    // } catch (e) {
    //   console.error(
    //     `Error calculating fitness metrics: ${(e as Error).message}`
    //   );
    // }
  }
}

async function insertSleepSessions(
  userId: number,
  sleepSessions: SleepSession[] | undefined
): Promise<void> {
  if (!sleepSessions || sleepSessions.length === 0) return;
  return;
}

async function insertWorkoutSummaries(
  userId: number,
  workoutSummaries: PrismaDailyWorkoutSummaryInput[]
): Promise<DailyWorkoutSummary[]> {
  if (!workoutSummaries || workoutSummaries.length === 0) return [];

  try {
    const summariesWithUser = workoutSummaries.map((summary) => ({
      ...summary,
      user: { connect: { id: userId } },
    }));

    const prismaClient = DBAdapter.getPrismaClient();
    const createdSummaries = await Promise.all(
      summariesWithUser.map((summary) =>
        prismaClient.dailyWorkoutSummary.create({
          data: summary,
        })
      )
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
}

/**
 * Type guard to check if a HealthDataPointMetric is of type { id: number }
 */
function isConnectById(
  item: { id: number } | { timestamp: string; category: string; userId: number }
): item is { id: number } {
  return "id" in item;
}

/**
 * Type guard to check if a HealthDataPointMetric is of type { timestamp: string; category: string; userId: number }
 */
function isConnectByFields(
  item: { id: number } | { timestamp: Date; category: string; userId: number }
): item is { timestamp: Date; category: string; userId: number } {
  return "timestamp" in item && "category" in item && "userId" in item;
}

/**
 * Inserts multiple DailyWorkoutSummary records in bulk and manages their relational fields.
 * @param userId - The ID of the user.
 * @param workoutSummaries - An array of DailyWorkoutSummary inputs, each potentially containing associated workouts and health data metrics.
 */
async function insertWorkoutSummariesBulk(
  userId: number,
  workoutSummaries: PrismaDailyWorkoutSummaryInput[]
): Promise<void> {
  if (!workoutSummaries || workoutSummaries.length === 0) {
    console.log("No workout summaries to insert or update.");
    return;
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
  insertedSummaries.forEach((summary: DBDailyWorkoutSummary) => {
    const dateKey = summary.date.toISOString().split("T")[0];
    summaryMap.set(dateKey, summary.id);
  });

  // STEP 3: Connect Workouts to Summaries
  const workoutConnections: { workoutId: number; summaryId: number }[] = [];
  workoutSummaries.forEach((summary: PrismaDailyWorkoutSummaryInput) => {
    const dateKey = summary.date.split("T")[0];
    const summaryId = summaryMap.get(dateKey);
    if (summaryId && summary.workouts && summary.workouts.connect) {
      summary.workouts.connect.forEach((workout) => {
        workoutConnections.push({
          workoutId: workout.id,
          summaryId,
        });
      });
    }
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
  const existingMetricsConnectByFields: {
    timestamp: Date;
    category: string;
    userId: number;
  }[] = [];
  const newMetricsCreate: HealthDataPoint[] = [];

  workoutSummaries.forEach((summary: PrismaDailyWorkoutSummaryInput) => {
    const dateKey = summary.date.split("T")[0];
    const summaryId = summaryMap.get(dateKey);

    if (summaryId && summary.healthDataPointMetrics) {
      if (Array.isArray(summary.healthDataPointMetrics.connect)) {
        summary.healthDataPointMetrics.connect.forEach((metric) => {
          if (isConnectByFields(metric)) {
            existingMetricsConnectByFields.push({
              timestamp: metric.timestamp,
              category: metric.category,
              userId: metric.userId,
            });
          } else {
            console.warn(
              `Skipped connecting HealthDataPoint with an unsupported method.`
            );
          }
        });
      }

      if (Array.isArray(summary.healthDataPointMetrics.create)) {
        summary.healthDataPointMetrics.create.forEach((metric) => {
          newMetricsCreate.push(metric);
        });
      }
    }
  });

  // Connect existing HealthDataPoints by fields in batches
  for (
    let i = 0;
    i < existingMetricsConnectByFields.length;
    i += updateBatchSize
  ) {
    const batch = existingMetricsConnectByFields.slice(i, i + updateBatchSize);
    await prisma.$transaction(
      async (tx: any) => {
        const updatePromises = batch.map((metric) =>
          tx.healthDataPoint.updateMany({
            where: {
              userId: metric.userId,
              timestamp: metric.timestamp,
              category: metric.category,
            },
            data: {
              dailyWorkoutSummaryId: summaryMap.get(
                metric.timestamp.toISOString().split("T")[0]
              ),
            },
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
      } of existing health data metrics by fields.`
    );
  }

  console.log(
    `Successfully connected ${existingMetricsConnectByFields.length} existing health data metrics.`
  );

  // Create new HealthDataPointMetrics in batches
  if (newMetricsCreate.length > 0) {
    const metricsData = newMetricsCreate.map((metric: HealthDataPoint) => {
      const dateKey = metric.timestamp.split("T")[0];
      const summaryId = summaryMap.get(dateKey);
      return {
        userId,
        dailyWorkoutSummaryId: summaryId,
        timestamp: metric.timestamp,
        value: metric.value,
        category: metric.category,
      };
    });

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

async function insertSleepSummaries(userId: number): Promise<SleepSession[]> {
  return [];
}

async function insertHealthData(data: HistoricalHealthData): Promise<void> {
  try {
    const userId = await getUserIdOrCreate("example@example.com");
    // Insert each type of health data with a category field
    await insertUniqueHealthDataPoints(userId, "step_counts", data.stepCount);
    await insertUniqueHealthDataPoints(
      userId,
      "active_energy_burned",
      data.activeEnergyBurned
    );
    await insertUniqueHealthDataPoints(
      userId,
      "basal_energy_burned",
      data.basalEnergyBurned
    );
    await insertUniqueHealthDataPoints(
      userId,
      "flights_climbed",
      data.flightsClimbed
    );
    await insertUniqueHealthDataPoints(
      userId,
      "distance_walking_running",
      data.distanceWalkingRunning
    );
    await insertUniqueHealthDataPoints(
      userId,
      "apple_exercise_time",
      data.appleExerciseTime
    );
    await insertUniqueHealthDataPoints(
      userId,
      "apple_stand_time",
      data.appleStandTime
    );
    await insertUniqueHealthDataPoints(userId, "heart_rate", data.heartRate);
    await insertUniqueHealthDataPoints(
      userId,
      "resting_heart_rate",
      data.restingHeartRate
    );
    await insertUniqueHealthDataPoints(
      userId,
      "heart_rate_variability_sdnn",
      data.heartRateVariabilitySDNN
    );
    await insertUniqueHealthDataPoints(
      userId,
      "blood_pressure_systolic",
      data.bloodPressureSystolic
    );
    await insertUniqueHealthDataPoints(
      userId,
      "blood_pressure_diastolic",
      data.bloodPressureDiastolic
    );
    await insertUniqueHealthDataPoints(userId, "vo2_max", data.vo2Max);
    await insertUniqueHealthDataPoints(userId, "height", data.height);
    await insertUniqueHealthDataPoints(userId, "body_mass", data.bodyMass);
    await insertUniqueHealthDataPoints(
      userId,
      "body_mass_index",
      data.bodyMassIndex
    );
    await insertUniqueHealthDataPoints(
      userId,
      "body_fat_percentage",
      data.bodyFatPercentage
    );
    await insertUniqueHealthDataPoints(
      userId,
      "lean_body_mass",
      data.leanBodyMass
    );
    await insertUniqueHealthDataPoints(
      userId,
      "waist_circumference",
      data.waistCircumference
    );
    await insertUniqueHealthDataPoints(
      userId,
      "oxygen_saturation",
      data.oxygenSaturation
    );
    await insertUniqueHealthDataPoints(
      userId,
      "respiratory_rate",
      data.respiratoryRate
    );
    await insertUniqueHealthDataPoints(
      userId,
      "dietary_energy",
      data.dietaryEnergy
    );
    await insertUniqueHealthDataPoints(
      userId,
      "dietary_carbohydrates",
      data.dietaryCarbohydrates
    );
    await insertUniqueHealthDataPoints(
      userId,
      "dietary_fat_total",
      data.dietaryFatTotal
    );
    await insertUniqueHealthDataPoints(
      userId,
      "dietary_protein",
      data.dietaryProtein
    );
    await insertUniqueHealthDataPoints(
      userId,
      "dietary_water",
      data.dietaryWater
    );
    await insertUniqueHealthDataPoints(
      userId,
      "mindful_session",
      data.mindfulSession
    );
    await insertWorkouts(userId, data.workouts);
    await insertSleepSessions(userId, data.sleepData);
    console.log(`New health data documents inserted for user: ${userId}`);
  } catch (e) {
    console.error((e as Error).message);
  }
  // Example: assume we have a known user or we find it by email
}

async function getAllDataForUser(userId: number): Promise<any> {
  const dataPoints = await DBAdapter.getPrismaClient().healthDataPoint.findMany(
    {
      where: { userId },
      orderBy: { timestamp: "asc" },
    }
  );

  // Group by category
  const results: { [key: string]: any[] } = {};
  for (const dp of dataPoints) {
    if (!results[dp.category]) {
      results[dp.category] = [];
    }
    results[dp.category].push(dp);
  }
  return results;
}

async function getDataForUserByMetric(
  userId: number,
  metric: string
): Promise<any[]> {
  return DBAdapter.getPrismaClient().healthDataPoint.findMany({
    where: {
      userId,
      category: metric,
    },
    orderBy: { timestamp: "asc" },
  });
}

async function getDataForUserByDate(
  userId: number,
  date: string
): Promise<any> {
  const start = new Date(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const dataPoints: DBHealthDataPoint[] =
    await DBAdapter.getPrismaClient().healthDataPoint.findMany({
      where: {
        userId,
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: "asc" },
    });

  const results: { [key: string]: any[] } = {};
  for (const dp of dataPoints) {
    if (!results[dp.category]) {
      results[dp.category] = [];
    }
    results[dp.category].push(dp);
  }
  return results;
}

/**
 * Fetches workouts along with their associated heart rate samples.
 * @param userId - The ID of the user.
 * @returns An array of workouts with heart rate samples.
 */
async function getWorkouts(userId: number): Promise<DBWorkout[]> {
  const workouts = await DBAdapter.getPrismaClient().workout.findMany({
    where: { userId },
    include: {
      heartRateSamples: {
        where: { category: "heart_rate" }, // Ensure only heart rate samples are included
        orderBy: { timestamp: "asc" },
      },
    },
    orderBy: { timestamp: "asc" },
  });

  return workouts.map((workout: DBWorkout) => ({
    id: workout.id,
    timestamp: workout.timestamp,
    endTimestamp: workout.endTimestamp,
    workoutType: workout.workoutType,
    duration: workout.duration,
    energyBurned: workout.energyBurned,
    distance: workout.distance,
    heartRateSamples: workout.heartRateSamples.map(
      (sample: DBHealthDataPoint) => ({
        timestamp: sample.timestamp,
        value: sample.value,
      })
    ),
  }));
}

async function getWorkoutSummaries(userId: number): Promise<DBDailyWorkoutSummary[]> {
  const prisma = DBAdapter.getPrismaClient();
  return prisma.dailyWorkoutSummary.findMany({
    where: {
      userId,
    },
    orderBy: {
      date: 'asc'
    },
    include: {
      workouts: false,
      healthDataPointMetrics: false
    }
  });
}

async function getSleepSessions(userId: number): Promise<DBSleepSession[]> {
  return [];
}

async function calculateMaxHeartRate(
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

async function getMaxHeartRate(
  userId: number,
  interval: number = 30
): Promise<number | null> {
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

async function getRestingHeartRates(
  userId: number
): Promise<DBHealthDataPoint[]> {
  const results = await DBAdapter.getPrismaClient().healthDataPoint.findMany({
    where: {
      userId,
      category: "resting_heart_rate",
    },
    orderBy: { timestamp: "desc" },
  });

  return results.map((r: HealthDataPoint) => ({
    timestamp: r.timestamp,
    value: r.value,
  }));
}

function parseHealthData(jsonString: string): HistoricalHealthData {
  const data = JSON.parse(jsonString);
  return data as HistoricalHealthData;
}

/**
 * Fetches all layouts for a given user.
 */
async function getLayouts(userId: number): Promise<DBLayout[]> {
  const layouts = await DBAdapter.getPrismaClient().layout.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });
  // Assume that the layout column stores the complete Layout object as JSON
  return layouts;
}

/**
 * Creates a new layout for the user.
 */
async function createLayout(
  userId: number,
  layout: Layout
): Promise<DBLayout> {
  const newRecord = await DBAdapter.getPrismaClient().layout.create({
    data: {
      userId,
      layout, // stored as JSON
    },
  });
  return newRecord.layout as DBLayout;
}

/**
 * Updates an existing layout for the user.
 * Throws an error if the layout is not found or does not belong to the user.
 */
async function updateLayout(
  userId: number,
  layoutId: string,
  layout: Layout
): Promise<DBLayout> {
  // First, check that the layout exists and belongs to the user.
  const existing = await DBAdapter.getPrismaClient().layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) {
    throw new Error("Layout not found or unauthorized");
  }

  const updatedRecord = await DBAdapter.getPrismaClient().layout.update({
    where: { id: layoutId },
    data: { layout },
  });

  return updatedRecord as DBLayout;
}

/**
 * Deletes a layout for the user.
 * Throws an error if the layout is not found or does not belong to the user.
 */
async function deleteLayout(
  userId: number,
  layoutId: string
): Promise<void> {
  const existing = await DBAdapter.getPrismaClient().layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) {
    throw new Error("Layout not found or unauthorized");
  }
  await DBAdapter.getPrismaClient().layout.delete({
    where: { id: layoutId },
  });
}

export {
  insertHealthData,
  getAllDataForUser,
  getDataForUserByMetric,
  getDataForUserByDate,
  insertSleepSummaries,
  getWorkouts,
  getMaxHeartRate,
  getRestingHeartRates,
  parseHealthData,
  getSleepSessions,
  insertSleepSessions,
  insertWorkoutSummaries,
  insertWorkoutSummariesBulk,
  getWorkoutSummaries,
  getLayouts,
  createLayout,
  updateLayout,
  deleteLayout,
};
