/**
 * Timezone-specific tests for counter aggregation
 *
 * These tests simulate different server timezones to ensure that
 * the counter aggregation logic works consistently regardless of
 * where the server is running.
 */

import {
  getPeriodKeyEST,
  addPeriodEST,
  getStartOfMonthEST,
  getEndOfMonthEST,
  getStartOfDayEST,
  getEndOfDayEST,
  getNowInEST,
} from "../../timezone";

// Mock function to simulate generatePeriodKeys behavior
function generatePeriodKeys(
  startDate: Date,
  endDate: Date,
  groupBy: "month" | "day" | "hour",
): string[] {
  const keys: string[] = [];
  const startKey = getPeriodKeyEST(startDate, groupBy);
  const endKey = getPeriodKeyEST(endDate, groupBy);
  let current = new Date(startDate);

  console.log("generatePeriodKeys debug:", {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startKey,
    endKey,
    groupBy,
  });

  while (getPeriodKeyEST(current, groupBy) <= endKey) {
    const periodKey = getPeriodKeyEST(current, groupBy);
    console.log("  Iteration:", {
      current: current.toISOString(),
      periodKey,
      endKey,
      comparison: periodKey <= endKey,
    });
    keys.push(periodKey);
    // Use EST-aware date addition to avoid timezone issues
    current = addPeriodEST(current, 1, groupBy);
    if (keys.length > 1000) {
      console.error("generatePeriodKeys infinite loop detected!");
      break;
    }
  }
  return keys;
}

// Helper to set timezone for tests
function withTimezone(tz: string, fn: () => void) {
  const originalTZ = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (originalTZ) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }
  }
}

describe("Counter Timezone Tests", () => {
  describe("Month Boundary - Oct 31 to Nov 1 transition", () => {
    const testCases = [
      { tz: "UTC", name: "UTC" },
      { tz: "America/Los_Angeles", name: "PST/PDT" },
      { tz: "Asia/Tokyo", name: "JST" },
      { tz: "Europe/London", name: "GMT/BST" },
    ];

    testCases.forEach(({ tz, name }) => {
      it(`should generate correct period keys for Oct-Nov transition in ${name}`, () => {
        withTimezone(tz, () => {
          // Create dates around the Oct 31 -> Nov 1 boundary in EST
          // Oct 31, 2024 23:00 EST
          const oct31Late = new Date("2024-10-31T23:00:00-04:00");
          // Nov 1, 2024 01:00 EST
          const nov1Early = new Date("2024-11-01T01:00:00-04:00");

          const oct31Key = getPeriodKeyEST(oct31Late, "day");
          const nov1Key = getPeriodKeyEST(nov1Early, "day");

          // These should be different days regardless of server timezone
          expect(oct31Key).toBe("2024-10-31");
          expect(nov1Key).toBe("2024-11-01");

          // Month keys should also be different
          const oct31MonthKey = getPeriodKeyEST(oct31Late, "month");
          const nov1MonthKey = getPeriodKeyEST(nov1Early, "month");
          expect(oct31MonthKey).toBe("2024-10");
          expect(nov1MonthKey).toBe("2024-11");
        });
      });

      it(`should not duplicate Nov 2 when generating period keys in ${name}`, () => {
        withTimezone(tz, () => {
          // Generate period keys for Nov 1-3, 2024
          const startDate = getStartOfDayEST(
            new Date("2024-11-01T12:00:00-04:00"),
          );
          const endDate = getEndOfDayEST(new Date("2024-11-03T12:00:00-04:00"));

          const keys = generatePeriodKeys(startDate, endDate, "day");

          // Should have exactly 3 days, no duplicates
          expect(keys).toEqual(["2024-11-01", "2024-11-02", "2024-11-03"]);

          // Check for duplicates
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        });
      });
    });
  });

  describe("Month aggregation across Oct-Nov boundary", () => {
    const testCases = [
      { tz: "UTC", name: "UTC" },
      { tz: "America/Los_Angeles", name: "PST/PDT" },
      { tz: "Asia/Tokyo", name: "JST" },
    ];

    testCases.forEach(({ tz, name }) => {
      it(`should generate correct monthly period keys in ${name}`, () => {
        withTimezone(tz, () => {
          // Generate monthly keys from Sep 2024 to Nov 2024
          const startDate = getStartOfMonthEST(
            new Date("2024-09-15T12:00:00-04:00"),
          );
          const endDate = getEndOfMonthEST(
            new Date("2024-11-15T12:00:00-05:00"),
          ); // Note DST change

          const keys = generatePeriodKeys(startDate, endDate, "month");

          expect(keys).toEqual(["2024-09", "2024-10", "2024-11"]);

          // No duplicates
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        });
      });

      it(`should handle DST transition correctly for monthly aggregation in ${name}`, () => {
        withTimezone(tz, () => {
          // DST ended on Nov 3, 2024 at 2:00 AM EST
          // Oct 31 is still in EDT (UTC-4)
          const oct31 = new Date("2024-10-31T23:59:59-04:00");
          // Nov 1 is in EDT (UTC-4) - DST doesn't end until Nov 3
          const nov1 = new Date("2024-11-01T00:00:00-04:00");
          // Nov 4 is in EST (UTC-5) - after DST ended
          const nov4 = new Date("2024-11-04T00:00:00-05:00");

          const oct31Month = getPeriodKeyEST(oct31, "month");
          const nov1Month = getPeriodKeyEST(nov1, "month");
          const nov4Month = getPeriodKeyEST(nov4, "month");

          expect(oct31Month).toBe("2024-10");
          expect(nov1Month).toBe("2024-11");
          expect(nov4Month).toBe("2024-11");
        });
      });
    });
  });

  describe("addPeriodEST function", () => {
    const testCases = [
      { tz: "UTC", name: "UTC" },
      { tz: "America/Los_Angeles", name: "PST/PDT" },
      { tz: "Asia/Tokyo", name: "JST" },
    ];

    testCases.forEach(({ tz, name }) => {
      it(`should add months correctly across year boundary in ${name}`, () => {
        withTimezone(tz, () => {
          const dec15 = new Date("2024-12-15T12:00:00-05:00");

          const nextMonth = addPeriodEST(dec15, 1, "month");
          const prevMonth = addPeriodEST(dec15, -1, "month");

          expect(getPeriodKeyEST(nextMonth, "month")).toBe("2025-01");
          expect(getPeriodKeyEST(prevMonth, "month")).toBe("2024-11");
        });
      });

      it(`should add days correctly across month boundary in ${name}`, () => {
        withTimezone(tz, () => {
          const oct31 = new Date("2024-10-31T12:00:00-04:00");

          const nextDay = addPeriodEST(oct31, 1, "day");
          const prevDay = addPeriodEST(oct31, -1, "day");

          expect(getPeriodKeyEST(nextDay, "day")).toBe("2024-11-01");
          expect(getPeriodKeyEST(prevDay, "day")).toBe("2024-10-30");
        });
      });

      it(`should add hours correctly across day boundary in ${name}`, () => {
        withTimezone(tz, () => {
          const oct31_23 = new Date("2024-10-31T23:00:00-04:00");

          const nextHour = addPeriodEST(oct31_23, 1, "hour");
          const prevHour = addPeriodEST(oct31_23, -1, "hour");

          expect(getPeriodKeyEST(nextHour, "hour")).toBe("2024-11-01T00");
          expect(getPeriodKeyEST(prevHour, "hour")).toBe("2024-10-31T22");
        });
      });
    });
  });

  describe("Current period detection", () => {
    it("should correctly identify current month regardless of server timezone", () => {
      const testCases = [
        { tz: "UTC", name: "UTC" },
        { tz: "America/Los_Angeles", name: "PST/PDT" },
        { tz: "Asia/Tokyo", name: "JST" },
      ];

      testCases.forEach(({ tz, name }) => {
        withTimezone(tz, () => {
          const now = getNowInEST();
          const currentMonthKey = getPeriodKeyEST(now, "month");

          // Should be a valid YYYY-MM format
          expect(currentMonthKey).toMatch(/^\d{4}-\d{2}$/);

          // The current month should be the same across all timezones when using EST
          console.log(`${name}: Current month in EST is ${currentMonthKey}`);
        });
      });
    });
  });

  describe("Period key generation edge cases", () => {
    it("should handle leap year February correctly", () => {
      withTimezone("UTC", () => {
        // 2024 is a leap year
        const feb28 = new Date("2024-02-28T12:00:00-05:00");
        const feb29 = new Date("2024-02-29T12:00:00-05:00");
        const mar1 = new Date("2024-03-01T12:00:00-05:00");

        expect(getPeriodKeyEST(feb28, "day")).toBe("2024-02-28");
        expect(getPeriodKeyEST(feb29, "day")).toBe("2024-02-29");
        expect(getPeriodKeyEST(mar1, "day")).toBe("2024-03-01");

        const startDate = getStartOfDayEST(feb28);
        const endDate = getEndOfDayEST(mar1);
        const keys = generatePeriodKeys(startDate, endDate, "day");

        expect(keys).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
      });
    });

    it("should not skip or duplicate days when generating long ranges", () => {
      withTimezone("UTC", () => {
        // Generate 31 days from Oct 15 to Nov 14
        const startDate = getStartOfDayEST(
          new Date("2024-10-15T12:00:00-04:00"),
        );
        const endDate = getEndOfDayEST(new Date("2024-11-14T12:00:00-05:00"));

        const keys = generatePeriodKeys(startDate, endDate, "day");

        // Should have exactly 31 days
        expect(keys.length).toBe(31);

        // First should be Oct 15, last should be Nov 14
        expect(keys[0]).toBe("2024-10-15");
        expect(keys[keys.length - 1]).toBe("2024-11-14");

        // No duplicates
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(31);

        // Should include both Oct 31 and Nov 1
        expect(keys).toContain("2024-10-31");
        expect(keys).toContain("2024-11-01");
      });
    });
  });

  describe("Regression test for Nov 2nd duplicate issue", () => {
    it("should not create duplicate Nov 2nd entries", () => {
      const testCases = [
        { tz: "UTC", name: "UTC" },
        { tz: "America/Los_Angeles", name: "PST/PDT" },
        { tz: "Asia/Tokyo", name: "JST" },
      ];

      testCases.forEach(({ tz, name }) => {
        withTimezone(tz, () => {
          // Simulate production scenario: Nov 2, 2025 (as user reported)
          const startDate = getStartOfMonthEST(
            new Date("2025-11-01T00:00:00-04:00"),
          );
          const endDate = getEndOfDayEST(new Date("2025-11-02T23:59:59-05:00"));

          const keys = generatePeriodKeys(startDate, endDate, "day");

          console.log(`${name}: Generated keys:`, keys);

          // Count occurrences of Nov 2
          const nov2Count = keys.filter((k) => k === "2025-11-02").length;
          expect(nov2Count).toBe(1);

          // No duplicates overall
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        });
      });
    });
  });
});
