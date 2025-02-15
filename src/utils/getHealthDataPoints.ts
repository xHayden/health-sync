// thanks chatgpt, I know this can be dynamically generated but this is simpler.

import { DBHealthDataPoint } from "@/types/HealthData";
import { DBAdapter } from "./db";

export async function getHealthDataByCategory(
  userId: number,
  category: string,
  startTime?: Date,
  endTime?: Date
): Promise<DBHealthDataPoint[]> {
  const whereClause: any = {
    userId,
    category,
  };

  if (startTime || endTime) {
    whereClause.timestamp = {};
    if (startTime) whereClause.timestamp.gte = startTime;
    if (endTime) whereClause.timestamp.lte = endTime;
  }

  return DBAdapter.getPrismaClient().healthDataPoint.findMany({
    where: whereClause,
    orderBy: { timestamp: "asc" },
  });
}

// Fetch the latest health data point for a given category
export async function getLatestHealthDataPoint(
  userId: number,
  category: string
): Promise<DBHealthDataPoint | null> {
  return DBAdapter.getPrismaClient().healthDataPoint.findFirst({
    where: { userId, category },
    orderBy: { timestamp: "desc" },
  });
}

// Fetch the latest health data point on a specific day
export async function getLatestHealthDataPointOnDay(
  userId: number,
  category: string,
  date: Date
): Promise<DBHealthDataPoint | null> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);

  return DBAdapter.getPrismaClient().healthDataPoint.findFirst({
    where: {
      userId,
      category,
      timestamp: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    orderBy: { timestamp: "desc" },
  });
}

// Fetch all health data points for a given category
export async function getAllHealthDataPoints(
  userId: number,
  category: string,
  startTime?: Date,
  endTime?: Date
): Promise<DBHealthDataPoint[]> {
  return getHealthDataByCategory(userId, category, startTime, endTime);
}

// Specific functions for all categories
export async function getAllActiveEnergyBurned(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "active_energy_burned",
    startTime,
    endTime
  );
}
export async function getLatestActiveEnergyBurned(userId: number) {
  return getLatestHealthDataPoint(userId, "active_energy_burned");
}
export async function getLatestActiveEnergyBurnedOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "active_energy_burned", date);
}

export async function getAllAppleExerciseTime(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "apple_exercise_time",
    startTime,
    endTime
  );
}
export async function getLatestAppleExerciseTime(userId: number) {
  return getLatestHealthDataPoint(userId, "apple_exercise_time");
}
export async function getLatestAppleExerciseTimeOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "apple_exercise_time", date);
}

export async function getAllAppleStandTime(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "apple_stand_time", startTime, endTime);
}
export async function getLatestAppleStandTime(userId: number) {
  return getLatestHealthDataPoint(userId, "apple_stand_time");
}
export async function getLatestAppleStandTimeOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "apple_stand_time", date);
}

export async function getAllBasalEnergyBurned(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "basal_energy_burned",
    startTime,
    endTime
  );
}
export async function getLatestBasalEnergyBurned(userId: number) {
  return getLatestHealthDataPoint(userId, "basal_energy_burned");
}
export async function getLatestBasalEnergyBurnedOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "basal_energy_burned", date);
}

export async function getAllBodyFatPercentage(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "body_fat_percentage",
    startTime,
    endTime
  );
}
export async function getLatestBodyFatPercentage(userId: number) {
  return getLatestHealthDataPoint(userId, "body_fat_percentage");
}
export async function getLatestBodyFatPercentageOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "body_fat_percentage", date);
}

export async function getAllBodyMass(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "body_mass", startTime, endTime);
}
export async function getLatestBodyMass(userId: number) {
  return getLatestHealthDataPoint(userId, "body_mass");
}
export async function getLatestBodyMassOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "body_mass", date);
}

export async function getAllBodyMassIndex(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "body_mass_index", startTime, endTime);
}
export async function getLatestBodyMassIndex(userId: number) {
  return getLatestHealthDataPoint(userId, "body_mass_index");
}
export async function getLatestBodyMassIndexOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "body_mass_index", date);
}

export async function getAllDietaryCarbohydrates(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "dietary_carbohydrates",
    startTime,
    endTime
  );
}
export async function getLatestDietaryCarbohydrates(userId: number) {
  return getLatestHealthDataPoint(userId, "dietary_carbohydrates");
}
export async function getLatestDietaryCarbohydratesOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "dietary_carbohydrates", date);
}

export async function getAllDietaryEnergy(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "dietary_energy", startTime, endTime);
}
export async function getLatestDietaryEnergy(userId: number) {
  return getLatestHealthDataPoint(userId, "dietary_energy");
}
export async function getLatestDietaryEnergyOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "dietary_energy", date);
}

export async function getAllDietaryFatTotal(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "dietary_fat_total",
    startTime,
    endTime
  );
}
export async function getLatestDietaryFatTotal(userId: number) {
  return getLatestHealthDataPoint(userId, "dietary_fat_total");
}
export async function getLatestDietaryFatTotalOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(userId, "dietary_fat_total", date);
}

export async function getAllDietaryProtein(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "dietary_protein", startTime, endTime);
}
export async function getLatestDietaryProtein(userId: number) {
  return getLatestHealthDataPoint(userId, "dietary_protein");
}
export async function getLatestDietaryProteinOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "dietary_protein", date);
}

export async function getAllDietaryWater(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "dietary_water", startTime, endTime);
}
export async function getLatestDietaryWater(userId: number) {
  return getLatestHealthDataPoint(userId, "dietary_water");
}
export async function getLatestDietaryWaterOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "dietary_water", date);
}

export async function getAllDistanceWalkingRunning(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(
    userId,
    "distance_walking_running",
    startTime,
    endTime
  );
}
export async function getLatestDistanceWalkingRunning(userId: number) {
  return getLatestHealthDataPoint(userId, "distance_walking_running");
}
export async function getLatestDistanceWalkingRunningOnDay(
  userId: number,
  date: Date
) {
  return getLatestHealthDataPointOnDay(
    userId,
    "distance_walking_running",
    date
  );
}

export async function getAllFlightsClimbed(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "flights_climbed", startTime, endTime);
}
export async function getLatestFlightsClimbed(userId: number) {
  return getLatestHealthDataPoint(userId, "flights_climbed");
}
export async function getLatestFlightsClimbedOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "flights_climbed", date);
}

export async function getAllHeartRate(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "heart_rate", startTime, endTime);
}
export async function getLatestHeartRate(userId: number) {
  return getLatestHealthDataPoint(userId, "heart_rate");
}
export async function getLatestHeartRateOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "heart_rate", date);
}

export async function getAllSteps(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "step_counts", startTime, endTime);
}
export async function getLatestSteps(userId: number) {
  return getLatestHealthDataPoint(userId, "step_counts");
}
export async function getLatestStepsOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "step_counts", date);
}

export async function getAllHRVs(
  userId: number,
  startTime?: Date,
  endTime?: Date
) {
  return getAllHealthDataPoints(userId, "heart_rate_variability_sdnn", startTime, endTime);
}
export async function getLatestHRV(userId: number) {
  return getLatestHealthDataPoint(userId, "heart_rate_variability_sdnn");
}
export async function getLatestHRVOnDay(userId: number, date: Date) {
  return getLatestHealthDataPointOnDay(userId, "heart_rate_variability_sdnn", date);
}
