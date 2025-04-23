import { SleepSession, DailySleepSummary } from "@/types/HealthData";
import { getSleepSessions, insertSleepSummaries } from "./db";

function calculateSleepMetrics(
  sleepSessions: SleepSession[],
  startDate: Date,
  endDate: Date
): DailySleepSummary[] {
  const dailySleepSummaries: { [date: string]: DailySleepSummary } = {};
  return [];

  // Initialize daily summaries for the given date range
  // for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  //   const dateString = d.toISOString().split("T")[0];
  //   dailySleepSummaries[dateString] = {
  //     day: dateString,
  //     totalSleepSeconds: 0,
  //     sleepSessions: [],
  //     hrv: [],
  //     hrvCoV: [],
  //     rhr: [],
  //     recovery: undefined,
  //     oxygenSaturation: [],
  //     vo2Max: [],
  //   };
  // }

  // // Aggregate sleep data into daily summaries
  // for (const session of sleepSessions) {
  //   const sessionDate = new Date(session.startDate).toISOString().split("T")[0];
  //   const dailySummary = dailySleepSummaries[sessionDate];

  //   if (dailySummary) {
  //     dailySummary.totalSleepSeconds += session.duration;
  //     dailySummary.sleepSessions?.push(session);
  //   }
  // }

  // return Object.values(dailySleepSummaries);
}

async function calculateAndStoreSleepMetrics(userId: number): Promise<void> {
  const sleepSessions = await getSleepSessions(userId);

  if (!sleepSessions || sleepSessions.length === 0) {
    throw new Error("No sleep sessions available for the user.");
  }

  const startDate = new Date(
    Math.min(...sleepSessions.map((s: SleepSession) => new Date(s.startDate).getTime()))
  );
  const endDate = new Date(
    Math.max(...sleepSessions.map((s: SleepSession) =>
      s.endDate ? new Date(s.endDate).getTime() : -Infinity
    ))
  );

  // const sleepMetrics = calculateSleepMetrics(sleepSessions, startDate, endDate);
  // await insertSleepSummaries(userId, sleepMetrics);
}

export { calculateSleepMetrics, calculateAndStoreSleepMetrics };
