/**
 * Timezone utilities for consistent EST handling using date-fns-tz
 */

import { toZonedTime, fromZonedTime, format } from "date-fns-tz";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfHour,
  endOfHour,
  addMonths,
  addDays,
  addHours,
} from "date-fns";

const EST_TIMEZONE = "America/New_York";

/**
 * Get current date/time in EST
 */
export function getNowInEST(): Date {
  return new Date();
}

/**
 * Convert a date to EST timezone
 */
export function toEST(date: Date): Date {
  return toZonedTime(date, EST_TIMEZONE);
}

/**
 * Get start of day in EST for a given date
 */
export function getStartOfDayEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const startOfDayZoned = startOfDay(zonedDate);
  return fromZonedTime(startOfDayZoned, EST_TIMEZONE);
}

/**
 * Get end of day in EST for a given date
 */
export function getEndOfDayEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const endOfDayZoned = endOfDay(zonedDate);
  return fromZonedTime(endOfDayZoned, EST_TIMEZONE);
}

/**
 * Get start of month in EST for a given date
 */
export function getStartOfMonthEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const startOfMonthZoned = startOfMonth(zonedDate);
  return fromZonedTime(startOfMonthZoned, EST_TIMEZONE);
}

/**
 * Get end of month in EST for a given date
 */
export function getEndOfMonthEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const endOfMonthZoned = endOfMonth(zonedDate);
  return fromZonedTime(endOfMonthZoned, EST_TIMEZONE);
}

/**
 * Get start of hour in EST for a given date
 */
export function getStartOfHourEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const startOfHourZoned = startOfHour(zonedDate);
  return fromZonedTime(startOfHourZoned, EST_TIMEZONE);
}

/**
 * Get end of hour in EST for a given date
 */
export function getEndOfHourEST(date: Date): Date {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);
  const endOfHourZoned = endOfHour(zonedDate);
  return fromZonedTime(endOfHourZoned, EST_TIMEZONE);
}

/**
 * Get period key for grouping in EST
 */
export function getPeriodKeyEST(
  date: Date,
  groupBy: "month" | "day" | "hour",
): string {
  const zonedDate = toZonedTime(date, EST_TIMEZONE);

  let periodKey: string;
  if (groupBy === "month") {
    // Format: YYYY-MM
    periodKey = format(zonedDate, "yyyy-MM", { timeZone: EST_TIMEZONE });
  } else if (groupBy === "day") {
    // Format: YYYY-MM-DD
    periodKey = format(zonedDate, "yyyy-MM-dd", { timeZone: EST_TIMEZONE });
  } else {
    // hour
    // Format: YYYY-MM-DDTHH
    periodKey = format(zonedDate, "yyyy-MM-dd'T'HH", {
      timeZone: EST_TIMEZONE,
    });
  }

  return periodKey;
}

/**
 * Add time period to date in EST
 */
export function addPeriodEST(
  date: Date,
  amount: number,
  unit: "month" | "day" | "hour",
): Date {
  // Convert to EST timezone
  const zonedDate = toZonedTime(date, EST_TIMEZONE);

  // Add the period in the zoned time
  let result: Date;
  if (unit === "month") {
    result = addMonths(zonedDate, amount);
  } else if (unit === "day") {
    result = addDays(zonedDate, amount);
  } else {
    // hour
    result = addHours(zonedDate, amount);
  }

  // Convert back to UTC Date
  return fromZonedTime(result, EST_TIMEZONE);
}
