import { WorkoutWithHeartRateSamples } from "@/types/HealthData";
import {
  getWorkouts,
  getMaxHeartRate,
  getRestingHeartRates,
  insertWorkoutSummariesBulk,
  DBAdapter,
} from "./db";
import {
  getAllBodyMass,
  getAllHeartRate,
  getAllHRVs as getAllHRV,
  getAllSteps,
} from "./getHealthDataPoints";
import { HealthDataPoint, Prisma, Workout } from "@prisma/client";
const { performance } = require("perf_hooks");

/**
 * Calculates TRIMP^exp using time intervals between consecutive heart rate samples.
 *
 * TRIMP^{exp} = sum( Δt * HRr * 0.64 * e^(1.92 * HRr) )
 * where HRr = (averageHR - restingHR) / (maxHR - restingHR)
 *
 * This function first sorts the datapoints by timestamp then calculates the
 * TRIMP for each interval.
 */
function calculateTRIMPexp(
  datapoints: HealthDataPoint[] | undefined,
  maxHeartRate: number,
  restingHeartRate: number
): number {
  if (!datapoints || datapoints.length < 2) {
    return 0;
  }

  // Ensure datapoints are sorted by timestamp
  const sortedDataPoints = [...datapoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let totalTRIMPexp = 0;

  // Loop over each interval between consecutive samples
  for (let i = 1; i < sortedDataPoints.length; i++) {
    const prev = sortedDataPoints[i - 1];
    const curr = sortedDataPoints[i];
    // Calculate the interval in minutes
    const deltaMinutes =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60);
    // Use the average HR for the interval for a more accurate representation
    const avgHR = (prev.value + curr.value) / 2;
    const HRr = Math.max(
      0,
      (avgHR - restingHeartRate) / (maxHeartRate - restingHeartRate)
    );
    const y = 1.92 * HRr;
    totalTRIMPexp += deltaMinutes * HRr * 0.64 * Math.exp(y);
  }
  return totalTRIMPexp;
}

function calculateDailyTRIMP(
  workouts: WorkoutWithHeartRateSamples[],
  maxHeartRate: number,
  groupedRestingHeartRates: Map<string, HealthDataPoint[]>,
  startDate: Date,
  endDate: Date
): { [date: string]: number } {
  const dailyTrimps: { [date: string]: number } = {};

  for (
    let d = new Date(startDate.getTime());
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    dailyTrimps[dateString] = 0;
  }

  for (const workout of workouts) {
    const workoutDate = workout.timestamp;
    const workoutDateString = workoutDate.toISOString().split("T")[0];

    // Find the most recent resting heart rate up to this date
    let restingHeartRate: number;
    const today = groupedRestingHeartRates.get(workoutDateString);
    if (today && today.length > 0) {
      // Use the last reading of the day
      restingHeartRate = today[today.length - 1].value;
    } else {
      // Look for the most recent previous day with data
      const previousDates = Array.from(groupedRestingHeartRates.keys())
        .filter((date) => date < workoutDateString)
        .sort()
        .reverse();

      const mostRecentDate = previousDates[0];
      const mostRecentReadings = mostRecentDate
        ? groupedRestingHeartRates.get(mostRecentDate)
        : undefined;

      restingHeartRate = mostRecentReadings
        ? mostRecentReadings[mostRecentReadings.length - 1].value
        : 60; // fallback value, consider throwing an error instead
    }

    const trimps = calculateTRIMPexp(
      workout.heartRateSamples,
      maxHeartRate,
      restingHeartRate
    );

    dailyTrimps[workoutDateString] += trimps;
  }
  return dailyTrimps;
}

function calculateATLandCTL(
  dailyTrimps: { [date: string]: number },
  startDate: Date,
  endDate: Date
): { [date: string]: { ATL: number; CTL: number } } {
  const atlDays = 7;
  const ctlDays = 42;

  const results: { [date: string]: { ATL: number; CTL: number } } = {};

  let atlSum = 0;
  let ctlSum = 0;
  const atlQueue: number[] = [];
  const ctlQueue: number[] = [];

  for (
    let d = new Date(startDate.getTime());
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    const todayTrimp = dailyTrimps[dateString] || 0;

    // Update ATL
    atlQueue.push(todayTrimp);
    atlSum += todayTrimp;
    if (atlQueue.length > atlDays) {
      atlSum -= atlQueue.shift() || 0;
    }

    // Update CTL
    ctlQueue.push(todayTrimp);
    ctlSum += todayTrimp;
    if (ctlQueue.length > ctlDays) {
      ctlSum -= ctlQueue.shift() || 0;
    }

    const atl = atlSum / Math.min(atlDays, atlQueue.length);
    const ctl = ctlSum / Math.min(ctlDays, ctlQueue.length);

    results[dateString] = { ATL: atl, CTL: ctl };
  }
  return results;
}

function groupDataByDate<T extends { timestamp: string | Date }>(
  data: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const point of data) {
    // Normalize the date to a consistent format (e.g., YYYY-MM-DD)
    const date =
      point.timestamp instanceof Date
        ? point.timestamp.toISOString().split("T")[0]
        : new Date(point.timestamp).toISOString().split("T")[0];

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(point);
  }

  return grouped;
}

function getLatestBodyweightByDate(
  bodyweights: HealthDataPoint[]
): Map<string, number> {
  const latestBodyweight = new Map<string, number>();
  for (const bw of bodyweights) {
    const date = bw.timestamp.toISOString().split("T")[0];
    const existing = latestBodyweight.get(date);
    if (!existing || bw.timestamp > new Date(`${date}T00:00:00Z`)) {
      latestBodyweight.set(date, bw.value);
    }
  }
  return latestBodyweight;
}

function calculateWorkoutSummaries(
  workouts: Workout[],
  maxHeartRate: number,
  heartRates: HealthDataPoint[],
  restingHeartRates: HealthDataPoint[],
  startDate: Date,
  endDate: Date,
  bodyweights: HealthDataPoint[],
  steps: HealthDataPoint[],
  hrvSamples: HealthDataPoint[],
  hrvCoVSamples: Prisma.HealthDataPointCreateInput[],
  userId: number
): Prisma.DailyWorkoutSummaryCreateInput[] {
  // Pre-group data by date
  const groupedSteps = groupDataByDate(steps);
  const groupedHrv = groupDataByDate(hrvSamples);
  const groupedHrvCov = groupDataByDate(hrvCoVSamples);
  const groupedRestingHR = groupDataByDate(restingHeartRates);
  const groupedHeartRates = groupDataByDate(heartRates);
  const latestBodyweights = getLatestBodyweightByDate(bodyweights);

  const dailyTrimps = calculateDailyTRIMP(
    workouts,
    maxHeartRate,
    groupedRestingHR,
    startDate,
    endDate
  );

  const atlAndCTLValues = calculateATLandCTL(
    dailyTrimps,
    new Date(startDate.getTime()),
    new Date(endDate.getTime())
  );

  const summaries: Prisma.DailyWorkoutSummaryCreateInput[] = [];
  for (
    let d = new Date(startDate.getTime());
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    const dailyLoad = dailyTrimps[dateString] || 0;

    // Retrieve pre-grouped data
    const hrvForDate = groupedHrv.get(dateString) || [];
    const hrvCovForDate = groupedHrvCov.get(dateString) || []; // HRV CoV are new points
    const restingHRForDate = groupedRestingHR.get(dateString) || [];
    const heartRatesForDate = groupedHeartRates.get(dateString) || [];
    const stepsForDate = groupedSteps.get(dateString) || [];

    const dailyMetrics = [
      ...hrvForDate.map((metric) => ({
        ...metric,
        category: metric.category || "hrv",
      })),
      ...restingHRForDate.map((metric) => ({
        ...metric,
        category: metric.category || "resting_heart_rate",
      })),
      ...heartRatesForDate.map((metric) => ({
        ...metric,
        category: metric.category || "heart_rate",
      })),
      ...stepsForDate.map((metric) => ({
        ...metric,
        category: metric.category || "step_counts",
      })),
      // Include hrvCovForDate last, as these are new points to create
      ...hrvCovForDate.map((metric) => ({
        ...metric,
        category: metric.category || "hrv_cov",
      })),
    ];

    const bodyweight = latestBodyweights.get(dateString);
    const dailySteps = stepsForDate.reduce((sum, step) => sum + step.value, 0);

    // Separate newly created HRV CoV metrics from existing metrics
    const newMetrics = dailyMetrics.filter(isHealthDataPoint);
    const existingMetrics = dailyMetrics.filter(isDBHealthDataPoint);

    // Convert existing metrics into connect arrays
    // We rely on the unique constraint (userId, timestamp, category) in HealthDataPoint
    const existingConnect = existingMetrics.map((m) => ({
      userId_timestamp_category: {
        userId,
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
        category: m.category,
      },
    }));    

    // Prepare new HRV CoV metrics for creation
    const newCreate = newMetrics.map((m) => ({
      userId,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
      value: m.value,
      category: m.category,
    }));    

    // Create summary
    summaries.push({
      date: `${dateString}T00:00:00Z`,
      totalWorkoutTime: workouts
        .filter(
          (workout) =>
            workout.timestamp.toISOString().split("T")[0] === dateString &&
            workout.endTimestamp != undefined
        )
        .reduce((sum, workout) => {
          if (workout.endTimestamp) {
            return (
              sum +
              (workout.endTimestamp.getTime() - workout.timestamp.getTime()) /
                60000
            );
          }
          return sum;
        }, 0),
      tts: dailyLoad,
      atl: atlAndCTLValues[dateString]?.ATL || 0,
      ctl: atlAndCTLValues[dateString]?.CTL || 0,
      energyBurned: workouts
        .filter(
          (workout) =>
            workout.timestamp.toISOString().split("T")[0] === dateString
        )
        .reduce((sum, workout) => sum + (workout.energyBurned || 0), 0),
      totalDistance: workouts
        .filter(
          (workout) =>
            workout.timestamp.toISOString().split("T")[0] === dateString
        )
        .reduce((sum, workout) => sum + (workout.distance || 0), 0),
      steps: dailySteps,
      workouts: {
        connect: workouts
          .filter((workout: Workout) => {
            return workout.timestamp.toISOString().split("T")[0] === dateString;
          })
          .map((workout: Workout) => ({ id: workout.id })),
      },
      exerciseTypes: Array.from(
        new Set(
          workouts
            .filter(
              (workout) =>
                workout.timestamp.toISOString().split("T")[0] === dateString
            )
            .map((workout) => workout.workoutType)
            .filter(
              (workoutType) => workoutType !== undefined && workoutType !== null
            )
        )
      ),
      bodyweight: bodyweight,
      user: {
        connect: {
          id: userId
        }
      },
      // Connect existing metrics and create new HRV CoV metrics
      healthDataPointMetrics: {
        connect: existingConnect,
        create: newCreate,
      },
    });
  }

  return summaries;
}

function calculateHrvCoV(
  hrvSamples: HealthDataPoint[],
  userId: number
): Prisma.HealthDataPointCreateInput[] {
  if (!hrvSamples || hrvSamples.length === 0) {
    return [];
  }

  const groupedByDate: Record<string, number[]> = {};

  for (const sample of hrvSamples) {
    const date = new Date(sample.timestamp).toISOString().split("T")[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(sample.value);
  }

  const hrvCoVSamples: Prisma.HealthDataPointCreateInput[] = [];

  for (const [date, values] of Object.entries(groupedByDate)) {
    if (values.length > 1) {
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance =
        values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
        (values.length - 1);
      const stdDev = Math.sqrt(variance);
      const cov = (stdDev / mean) * 100;

      hrvCoVSamples.push({
        timestamp: new Date(`${date}T00:00:00Z`),
        value: cov,
        category: "hrv_cov",
        user: {
          connect: { id: userId }
        },
      });
    }
  }

  return hrvCoVSamples;
}

async function calculateAndStoreWorkoutSummaries(
  userId: number
): Promise<void> {
  const workouts = await getWorkouts(userId);
  if (workouts.length === 0) {
    console.log("No workouts found for user, skipping summary calculation");
    return;
  }

  const timestamps = workouts
    .map((workout) => {
      const timestamp = workout.timestamp instanceof Date
        ? workout.timestamp.getTime()
        : new Date(workout.timestamp).getTime();
      if (isNaN(timestamp)) {
        console.error("Invalid workout timestamp:", workout.timestamp);
        return null;
      }
      return timestamp;
    })
    .filter((ts): ts is number => ts !== null);

  if (timestamps.length === 0) {
    console.log("No valid workout timestamps found");
    return;
  }

  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const startDate = new Date(minTimestamp);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(maxTimestamp);
  endDate.setUTCHours(23, 59, 59, 999);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error(`Invalid date range: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
  }

  // Get the most recent workout date (last workout day)
  const lastWorkoutDate = new Date(maxTimestamp);
  lastWorkoutDate.setUTCHours(0, 0, 0, 0);

  // Check which summaries already exist (excluding the last workout day)
  const existingSummaries = await DBAdapter.getPrismaClient().dailyWorkoutSummary.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: lastWorkoutDate, // Exclude the last workout day
      },
    },
    select: {
      date: true,
    },
  });

  const existingDates = new Set(
    existingSummaries.map(summary => summary.date.toISOString().split('T')[0])
  );

  // Generate all dates that need processing
  const datesToProcess: Date[] = [];
  for (let d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    const isLastWorkoutDay = d.getTime() === lastWorkoutDate.getTime();

    // Include date if it's the last workout day OR if it doesn't already have a summary
    if (isLastWorkoutDay || !existingDates.has(dateString)) {
      datesToProcess.push(new Date(d.getTime()));
    }
  }

  if (datesToProcess.length === 0) {
    console.log("All workout summaries already exist, skipping calculation");
    return;
  }

  const totalDates = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  console.log(`Processing ${datesToProcess.length} dates out of ${totalDates} total dates`);
  console.log(`Found ${existingDates.size} existing summaries`);
  console.log(`Last workout date: ${lastWorkoutDate.toISOString()}`);
  console.log(`Dates to process: ${datesToProcess.map(d => d.toISOString().split('T')[0]).join(', ')}`);

  const bodyweights = await getAllBodyMass(userId);
  const hrvSamples = await getAllHRV(userId);
  const hrvCoVSamples = calculateHrvCoV(hrvSamples, userId);
  const steps = await getAllSteps(userId);
  const maxHeartRate = await getMaxHeartRate(userId, 30);
  const restingHeartRates = await getRestingHeartRates(userId);
  const heartRates = await getAllHeartRate(userId);

  if (!maxHeartRate || !restingHeartRates || restingHeartRates.length === 0) {
    throw new Error(
      "Max heart rate or resting heart rates not available for user"
    );
  }

  console.log("Start, end", startDate.toISOString(), endDate.toISOString());

  const workoutSummaries: Prisma.DailyWorkoutSummaryCreateInput[] =
    calculateWorkoutSummaries(
      workouts,
      maxHeartRate,
      heartRates,
      restingHeartRates,
      startDate,
      endDate,
      bodyweights,
      steps,
      hrvSamples,
      hrvCoVSamples,
      userId
    );

  // Filter summaries to only include dates that need processing
  const summariesToInsert = workoutSummaries.filter(summary => {
    const summaryDate = summary.date instanceof Date
      ? summary.date.toISOString().split('T')[0]
      : summary.date.split('T')[0];

    return datesToProcess.some(date =>
      date.toISOString().split('T')[0] === summaryDate
    );
  });

  console.log(`Filtered summaries: ${summariesToInsert.length} out of ${workoutSummaries.length} total summaries`);

  if (summariesToInsert.length > 0) {
    await insertWorkoutSummariesBulk(userId, summariesToInsert);
  } else {
    console.log("No new summaries to insert after filtering");
  }
}

function isDBHealthDataPoint(
  point: any
): point is HealthDataPoint & { id: number } {
  return 'id' in point && 'userId' in point;
}

function isHealthDataPoint(
  point: any
): point is Prisma.HealthDataPointCreateInput {
  return !('id' in point);
}

export {
  calculateWorkoutSummaries,
  calculateTRIMPexp,
  calculateATLandCTL,
  calculateAndStoreWorkoutSummaries,
};
