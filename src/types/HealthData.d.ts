import { DBBase } from "./Prisma";
import { DBUser } from "./User";

export interface HistoricalHealthData {
  stepCount: HealthDataPoint[];
  activeEnergyBurned: HealthDataPoint[];
  basalEnergyBurned: HealthDataPoint[];
  flightsClimbed: HealthDataPoint[];
  distanceWalkingRunning: HealthDataPoint[];
  appleExerciseTime: HealthDataPoint[];
  appleStandTime: HealthDataPoint[];
  heartRate: HealthDataPoint[];
  restingHeartRate: HealthDataPoint[];
  heartRateVariabilitySDNN: HealthDataPoint[];
  bloodPressureSystolic: HealthDataPoint[];
  bloodPressureDiastolic: HealthDataPoint[];
  vo2Max: HealthDataPoint[];
  height: HealthDataPoint[];
  bodyMass: HealthDataPoint[];
  bodyMassIndex: HealthDataPoint[];
  bodyFatPercentage: HealthDataPoint[];
  leanBodyMass: HealthDataPoint[];
  waistCircumference: HealthDataPoint[];
  oxygenSaturation: HealthDataPoint[];
  respiratoryRate: HealthDataPoint[];
  sleepData: SleepSession[];
  dietaryEnergy: HealthDataPoint[];
  dietaryCarbohydrates: HealthDataPoint[];
  dietaryFatTotal: HealthDataPoint[];
  dietaryProtein: HealthDataPoint[];
  dietaryWater: HealthDataPoint[];
  mindfulSession: HealthDataPoint[];
  workouts: HealthKitWorkout[];
}

export interface HealthKitWorkout
  extends Omit<Workout, "timestamp" | "endTimestam"> {
  startDate: string;
  endDate?: string;
}

const workoutWithHeartRateSamplesInclude = {
  heartRateSamples: true,
} satisfies Prisma.WorkoutInclude;

export type WorkoutWithHeartRateSamples = Prisma.WorkoutGetPayload<{
  include: typeof workoutWithHeartRateSamplesInclude;
}>;