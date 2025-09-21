import { HistoricalHealthData } from "@/types/HealthData";
import { DBAdapter } from "../db";
import { HealthDataPoint, PermissionType, Prisma } from "@prisma/client";
import { insertWorkouts } from "./workout";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";
import { calculateAndStoreWorkoutSummaries } from "../fitnessCalc";
import { DBAdapter as DB } from "../db";

async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Database operation failed (${operationName}) - attempt ${attempt}/${maxRetries}:`, error);

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retrying ${operationName} in ${delay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Track ongoing processes to prevent concurrent execution
const ongoingProcesses = new Set<number>();

async function associateHeartRateWithWorkouts(userId: number): Promise<void> {
  console.log(`Starting heart rate association for user ${userId}`);

  // Get all workouts that don't have heart rate associations yet
  const workouts = await DB.getPrismaClient().workout.findMany({
    where: {
      userId,
      endTimestamp: { not: null },
    },
    select: {
      id: true,
      timestamp: true,
      endTimestamp: true,
    },
  });

  console.log(`Associating heart rate data for ${workouts.length} workouts`);

  for (const workout of workouts) {
    if (workout.endTimestamp) {
      await DB.getPrismaClient().healthDataPoint.updateMany({
        where: {
          userId,
          category: "heart_rate",
          timestamp: {
            gte: workout.timestamp,
            lte: workout.endTimestamp,
          },
          workoutId: null, // Only update points not already associated
        },
        data: {
          workoutId: workout.id,
        },
      });
    }
  }

  console.log(`Completed heart rate association for user ${userId}`);
}

async function processWorkoutDataInBackground(userId: number): Promise<void> {
  // Check if already processing for this user
  if (ongoingProcesses.has(userId)) {
    console.log(`Skipping background workout summary processing for user ${userId} - already in progress`);
    return;
  }

  // Use setTimeout to push this to the next tick of the event loop
  setTimeout(async () => {
    try {
      ongoingProcesses.add(userId);
      console.log(`Starting background workout processing for user ${userId}`);

      // First associate heart rate data with workouts
      await associateHeartRateWithWorkouts(userId);

      // Then calculate summaries
      await calculateAndStoreWorkoutSummaries(userId);

      console.log(`Completed background workout processing for user ${userId}`);
    } catch (e) {
      console.error(`Background workout processing failed for user ${userId}:`, e);
    } finally {
      ongoingProcesses.delete(userId);
    }
  }, 0);
}

function validateHealthDataPoint(
  point: HealthDataPoint | Prisma.HealthDataPointCreateInput
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
  dataPoints: Prisma.HealthDataPointCreateInput[] | undefined,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!dataPoints || dataPoints.length === 0) return;

  // unimplemented for these, not a widget meta
  // if (!authenticated) {
  //   const resourceArgs: CheckHasSharePermissionArgs = {
  //     ownerUserId: userId,
  //     resourceType: "counters",
  //     resourceId: null,
  //     permissionType: PermissionType.READ,
  //     shareToken,
  //     sessionUserId,
  //   };
  //   if (!(await checkHasSharePermission(resourceArgs)))
  //     throw new PermissionError(resourceArgs);
  // }

  // Validate and convert timestamps
  const validData = dataPoints.filter(validateHealthDataPoint).map((point) => ({
    userId,
    category,
    timestamp: new Date(point.timestamp),
    value: point.value,
  }));

  if (validData.length > 0) {
    // createMany with skipDuplicates relies on unique constraint (userId, timestamp, category)
    await retryDatabaseOperation(async () => {
      await DBAdapter.getPrismaClient().healthDataPoint.createMany({
        data: validData,
        skipDuplicates: true,
      });
    }, `createMany for category ${category}`);
  }
}

export async function insertHealthData(
  data: HistoricalHealthData,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  try {
    const userId = 1;
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
    await insertWorkouts(userId, data.workouts, authenticated, shareToken, sessionUserId, true, true);
    // await insertSleepSessions(userId, data.sleepData);
    console.log(`New health data documents inserted for user: ${userId}`);

    // Process heart rate association and workout summaries in background
    processWorkoutDataInBackground(userId);
  } catch (e) {
    console.error("insertHealthData error:", (e as Error).message);
    console.error("Full error:", e);
    throw e; // Re-throw the error so it can be handled by the calling function
  }
  // Example: assume we have a known user or we find it by email
}
