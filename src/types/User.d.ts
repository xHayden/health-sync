import { DBBase } from "@/types/Prisma";

export interface DBUser extends User, DBBase {
}

export interface User {
  createdAt: string;
  email: string;
  name?: string;
  healthDataPoints?: HealthDataPoint[];
  workouts?: DBWorkout[];
  dailyWorkoutSummaries?: DBDailyWorkoutSummary[];
  dailySleepSummaries?: DBDailySleepSummary[];
  sleepSessions?: DBSleepSession[];
}
