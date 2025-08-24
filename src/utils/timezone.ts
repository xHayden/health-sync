/**
 * Timezone utilities for consistent EST handling
 */

const EST_TIMEZONE = 'America/New_York';

/**
 * Get current date/time in EST
 */
export function getNowInEST(): Date {
  // Return the current instant. Use timeZone-aware formatters when you need EST components.
  // Calling code that needs an EST period/key should rely on getPeriodKeyEST.
  return new Date();
}

/**
 * Convert a date to EST string representation, then back to Date
 * This ensures we're working with EST-interpreted dates consistently
 */
export function toEST(date: Date): Date {
  const { year, month, day, hour, minute, second } = getESTDateParts(date);
  return makeESTDate(year, month, day, hour, minute, second, 0);
}

/**
 * Get start of day in EST for a given date
 */
export function getStartOfDayEST(date: Date): Date {
  const { year, month, day } = getESTDateParts(date);
  return makeESTDate(year, month, day, 0, 0, 0, 0);
}

/**
 * Get end of day in EST for a given date
 */
export function getEndOfDayEST(date: Date): Date {
  const { year, month, day } = getESTDateParts(date);
  return makeESTDate(year, month, day, 23, 59, 59, 999);
}

/**
 * Get start of month in EST for a given date
 */
export function getStartOfMonthEST(date: Date): Date {
  const { year, month } = getESTDateParts(date);
  return makeESTDate(year, month, 1, 0, 0, 0, 0);
}

/**
 * Get end of month in EST for a given date
 */
export function getEndOfMonthEST(date: Date): Date {
  const { year, month } = getESTDateParts(date);
  // Day 0 of next month = last day of current month
  const dt = makeESTDate(year, month + 1, 0, 23, 59, 59, 999);
  return dt;
}

/**
 * Get start of hour in EST for a given date
 */
export function getStartOfHourEST(date: Date): Date {
  const { year, month, day, hour } = getESTDateParts(date);
  return makeESTDate(year, month, day, hour, 0, 0, 0);
}

/**
 * Get end of hour in EST for a given date
 */
export function getEndOfHourEST(date: Date): Date {
  const { year, month, day, hour } = getESTDateParts(date);
  return makeESTDate(year, month, day, hour, 59, 59, 999);
}

/**
 * Get period key for grouping in EST
 */
export function getPeriodKeyEST(date: Date, groupBy: "month" | "day" | "hour"): string {
  // Use Intl.DateTimeFormat to get the date components in EST directly
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hour = parts.find(p => p.type === 'hour')!.value;
  
  let periodKey: string;
  if (groupBy === "month") {
    periodKey = `${year}-${month}`;
  } else if (groupBy === "day") {
    periodKey = `${year}-${month}-${day}`;
  } else { // hour
    periodKey = `${year}-${month}-${day}T${hour}`;
  }
  
  // console.log('getPeriodKeyEST debug:', {
  //   inputDate: date.toISOString(),
  //   groupBy,
  //   year, month, day, hour,
  //   periodKey
  // });
  
  return periodKey;
}

/**
 * Add time period to date in EST
 */
export function addPeriodEST(date: Date, amount: number, unit: "month" | "day" | "hour"): Date {
  const { year, month, day, hour } = getESTDateParts(date);
  let y = year, m = month, d = day, h = hour;
  if (unit === "month") {
    m += amount;
    // JS Date.UTC will roll months automatically
    return makeESTDate(y, m, d, h, 0, 0, 0);
  } else if (unit === "day") {
    return makeESTDate(y, m, d + amount, h, 0, 0, 0);
  } else {
    return makeESTDate(y, m, d, h + amount, 0, 0, 0);
  }
}

// ---- Internal helpers for robust EST handling ----
function getESTDateParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value);
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
  const second = parseInt(parts.find(p => p.type === 'second')!.value);
  return { year, month, day, hour, minute, second };
}

function getTimeZoneOffsetMs(timeZone: string, dateUtc: Date): number {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(dateUtc);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const day = Number(parts.find(p => p.type === 'day')!.value);
  const hour = Number(parts.find(p => p.type === 'hour')!.value);
  const minute = Number(parts.find(p => p.type === 'minute')!.value);
  const second = Number(parts.find(p => p.type === 'second')!.value);
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUTC - dateUtc.getTime();
}

function makeESTDate(year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number): Date {
  // Build a UTC date for the EST wall time, then adjust by the EST offset at that instant
  const tentativeUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  const offsetMs = getTimeZoneOffsetMs(EST_TIMEZONE, tentativeUtc);
  return new Date(tentativeUtc.getTime() - offsetMs);
}