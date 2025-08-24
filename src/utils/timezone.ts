/**
 * Timezone utilities for consistent EST handling
 */

const EST_TIMEZONE = 'America/New_York';

/**
 * Get current date/time in EST
 */
export function getNowInEST(): Date {
  // Use a simpler approach - get current UTC time and offset by EST hours
  const now = new Date();
  
  // EST is UTC-5 (or UTC-4 during DST)
  // Use Intl API to determine if we're in DST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const timeZoneName = parts.find(p => p.type === 'timeZoneName')?.value;
  const isDST = timeZoneName === 'EDT'; // Eastern Daylight Time
  
  const offsetHours = isDST ? -4 : -5; // EST is 4-5 hours behind UTC
  const estTime = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
  
  // console.log('getNowInEST debug:', {
  //   serverTime: now.toISOString(),
  //   timeZoneName,
  //   isDST,
  //   offsetHours,
  //   estTime: estTime.toISOString(),
  // });
  
  return estTime;
}

/**
 * Convert a date to EST string representation, then back to Date
 * This ensures we're working with EST-interpreted dates consistently
 */
export function toEST(date: Date): Date {
  // Get the date components as they would appear in EST
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
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
  const second = parseInt(parts.find(p => p.type === 'second')!.value);
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Get start of day in EST for a given date
 */
export function getStartOfDayEST(date: Date): Date {
  const estDate = toEST(date);
  estDate.setHours(0, 0, 0, 0);
  return estDate;
}

/**
 * Get end of day in EST for a given date
 */
export function getEndOfDayEST(date: Date): Date {
  const estDate = toEST(date);
  estDate.setHours(23, 59, 59, 999);
  return estDate;
}

/**
 * Get start of month in EST for a given date
 */
export function getStartOfMonthEST(date: Date): Date {
  const estDate = toEST(date);
  return new Date(estDate.getFullYear(), estDate.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get end of month in EST for a given date
 */
export function getEndOfMonthEST(date: Date): Date {
  const estDate = toEST(date);
  return new Date(estDate.getFullYear(), estDate.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get start of hour in EST for a given date
 */
export function getStartOfHourEST(date: Date): Date {
  const estDate = toEST(date);
  estDate.setMinutes(0, 0, 0);
  return estDate;
}

/**
 * Get end of hour in EST for a given date
 */
export function getEndOfHourEST(date: Date): Date {
  const estDate = toEST(date);
  estDate.setMinutes(59, 59, 999);
  return estDate;
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
  const estDate = toEST(date);
  
  if (unit === "month") {
    estDate.setMonth(estDate.getMonth() + amount);
  } else if (unit === "day") {
    estDate.setDate(estDate.getDate() + amount);
  } else { // hour
    estDate.setHours(estDate.getHours() + amount);
  }
  
  return estDate;
}