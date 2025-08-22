import { PrismaClient } from "@prisma/client";
import { HistoricalHealthData } from "@/types/HealthData";
import prisma from "../lib/prisma";
import {
  checkUserExists,
  getAllDataForUser,
  getAllUsersBasic,
  getDataForUserByDate,
  getDataForUserByMetric,
  searchUsersBasic,
} from "./db/user";
import { insertHealthData } from "./db/healthData";
import { getSleepSessions, insertSleepSessions } from "./db/sleepSession";
import { insertSleepSummaries } from "./db/sleepSummary";
import {
  getMaxHeartRate,
  getRestingHeartRates,
  getWorkoutSummaries,
  insertWorkoutSummaries,
  insertWorkoutSummariesBulk,
} from "./db/workoutSummary";
import { getWorkouts } from "./db/workout";
import {
  createLayout,
  deleteLayout,
  getLayouts,
  updateLayout,
} from "./db/layout";
import {
  createCounter,
  deleteCounter,
  getCounterById,
  getCounters,
  updateCounter,
  getCounterHistory,
  getCounterMonthlyAggregates,
} from "./db/counter";
import {
  getSharedLayoutsForMember,
  getLayoutByShareToken,
  getSharedLayoutsByOwner,
  updateSharedLayout,
  shareLayout,
  revokeSharedLayout,
  checkHasSharePermission
} from "./db/sharedLayout";

export class DBAdapter {
  private constructor() {}

  static getPrismaClient(): PrismaClient {
    return prisma;
  }

  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

function parseHealthData(jsonString: string): HistoricalHealthData {
  const data = JSON.parse(jsonString);
  return data as HistoricalHealthData;
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
  getCounterById,
  getCounters,
  deleteCounter,
  updateCounter,
  createCounter,
  getCounterHistory,
  getCounterMonthlyAggregates,
  getSharedLayoutsForMember,
  getSharedLayoutsByOwner,
  updateSharedLayout,
  getLayoutByShareToken,
  shareLayout,
  revokeSharedLayout,
  searchUsersBasic,
  getAllUsersBasic,
  checkUserExists,
  checkHasSharePermission
};
