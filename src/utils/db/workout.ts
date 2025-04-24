import { HealthKitWorkout } from "@/types/HealthData";
import { calculateAndStoreWorkoutSummaries } from "../fitnessCalc";
import { DBAdapter } from "../db";
import { PermissionType, Workout } from "@prisma/client";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

export async function insertWorkouts(
  userId: number,
  workouts: HealthKitWorkout[] | undefined,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!workouts || workouts.length === 0) return;
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "workouts",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  
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

    try {
      await calculateAndStoreWorkoutSummaries(userId);
    } catch (e) {
      console.error(
        `Error calculating fitness metrics: ${(e as Error).message}`
      );
    }
  }
}

/**
 * Fetches workouts along with their associated heart rate samples.
 * @param userId - The ID of the user.
 * @returns An array of workouts with heart rate samples.
 */
export async function getWorkouts(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<Workout[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "workouts",
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

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
  return workouts;
}
