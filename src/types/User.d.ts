import { DBBase } from "@/types/Prisma";
import { DailySleepSummary, DailyWorkoutSummary, HealthDataPoint, SleepSession, Workout } from "@prisma/client";

export interface DBUser extends User, DBBase {
}

export interface User {
  createdAt: string;
  email: string;
  name?: string;
  healthDataPoints?: HealthDataPoint[];
  workouts?: Workout[];
  dailyWorkoutSummaries?: DailyWorkoutSummary[];
  dailySleepSummaries?: DailySleepSummary[];
  sleepSessions?: SleepSession[];
}
