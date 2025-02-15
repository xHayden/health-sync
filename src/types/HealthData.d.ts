export interface HealthDataPoint {
    timestamp: string;
    value: number;
    category: string;
  }
  
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
  
  export interface User {
    createdAt: string;
    email: string;
    name?: string;
  }
  
  export interface SleepSession {
    startDate: string;
    endDate: string;
    categoryValue: number;
    duration: number;
  }
  
  export interface DBBase {
    id: number;
  }
  
  export interface Workout {
    timestamp: string;
    endTimestamp?: string;
    duration: number;
    energyBurned?: number;
    distance?: number;
    workoutType: string;
    heartRateSamples?: HealthDataPoint[];
  }
  
  export interface DailyWorkoutSummary {
    date: string;
    totalWorkoutTime: number;
    energyBurned?: number;
    totalDistance?: number;
    steps?: number;
    exerciseTypes: string[];
    bodyweight?: number;
    tts?: number;
    atl?: number;
    ctl?: number;
  }
  
  export interface DailySleepSummary {
    date: string;
    totalSleepSeconds: number;
    sleepSessions: SleepSession[];
    healthDataPointMetrics: HealthDataPoint[];
  }
  
  // Full DB types including references
  export interface DBUser extends User, DBBase {
    healthDataPoints?: HealthDataPoint[];
    workouts?: DBWorkout[];
    dailyWorkoutSummaries?: DBDailyWorkoutSummary[];
    dailySleepSummaries?: DBDailySleepSummary[];
    sleepSessions?: DBSleepSession[];
  }
  
  export interface DBSleepSession extends Omit<SleepSession, 'timestamp'>, DBBase {
    dailySleepSummaryId?: number;
    dailySleepSummary?: DBDailySleepSummary;
    userId: number;
    user: DBUser;
  }
  
  export interface DBWorkout extends Omit<Workout, 'timestamp' | 'endTimestamp' | 'heartRateSamples'>, DBBase {
    dailyWorkoutSummaryId?: number;
    dailyWorkoutSummary?: DBDailyWorkoutSummary;
    userId: number;
    user: DBUser;
    timestamp: Date;
    endTimestamp: Date;
    heartRateSamples: DBHealthDataPoint[]
  }

  export interface HealthKitWorkout extends Omit<Workout, 'timestamp' | 'endTimestam'> {
    startDate: string;
    endDate?: string;
  }
  
  export interface DBDailyWorkoutSummary extends Omit<DailyWorkoutSummary, 'date'>, DBBase {
    workouts?: DBWorkout[];
    userId: number;
    user: DBUser;
    date: Date;
  }
  
  export interface DBDailySleepSummary extends Omit<DailySleepSummary, 'timestamp'>, DBBase {
    sleepSessions?: DBSleepSession[];
    userId: number;
    user: DBUser;
  }
  
  export interface DBHealthDataPoint extends Omit<HealthDataPoint, 'timestamp'>, DBBase {
      userId?: number;
      workoutId?: number;
      workout?: Workout;
      dailyWorkoutSummaryId?: number;
      dailySleepSummaryId?: number;
      timestamp: Date;
  }  
  
  type connectIdArray = { connect: { id: number }[] };
  type connectId = { connect: { id: number } };
  
  // Input types for Prisma operations
  export interface PrismaUserInput extends User {
    healthDataPoints?: connectIdArray
    workouts?: connectIdArray
    dailyWorkoutSummaries?: connectIdArray
    dailySleepSummaries?: connectIdArray
    sleepSessions?: connectIdArray
  }
  
  export interface PrismaHealthDataPointInput extends HealthDataPoint {
      user?: connectId;
      workout?: connectId;
      dailyWorkoutSummary?: connectId;
      dailySleepSummary?: connectId;
  }  
  
  export interface PrismaSleepSessionInput extends SleepSession {
    dailySleepSummary?: connectId
    user?: connectId
  }
  
  export interface PrismaWorkoutInput extends Workout {
    dailyWorkoutSummary?: connectId
    user?: connectId
  }
  
  export interface PrismaDailyWorkoutSummaryInput extends DailyWorkoutSummary {
    workouts?: connectIdArray
    user?: connectId
    healthDataPointMetrics: {
        create: HealthDataPoint[];
        connect: { id: number }[] | {
            timestamp: Date;
            category: string;
            userId: number;
        }[];
    }
  }
  
  export interface PrismaDailySleepSummaryInput extends DailySleepSummary {
    sleepSessions?: connectIdArray
    user?: connectId
  }