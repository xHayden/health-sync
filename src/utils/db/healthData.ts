import { HistoricalHealthData } from "@/types/HealthData";
import { DBAdapter } from "../db";
import { HealthDataPoint, PermissionType, Prisma } from "@prisma/client";
import { insertWorkouts } from "./workout";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

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
    await DBAdapter.getPrismaClient().healthDataPoint.createMany({
      data: validData,
      skipDuplicates: true,
    });
  }
}

export async function insertHealthData(
  data: HistoricalHealthData,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  try {
    const userId = 6;
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
    // await insertSleepSessions(userId, data.sleepData);
    console.log(`New health data documents inserted for user: ${userId}`);
  } catch (e) {
    console.error((e as Error).message);
  }
  // Example: assume we have a known user or we find it by email
}
