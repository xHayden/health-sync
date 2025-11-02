/**
 * Test for the specific production bug reported:
 * - startValue is wrong on prod starting when the month moved from Oct to Nov, 2025
 * - for aggregate w 1 month units
 * - Works on local but fails on production (different timezones)
 * - Nov 2nd appears twice on the graph with net value of zero
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

// Import the actual generatePeriodKeys logic from counter.ts
function generatePeriodKeys(
  startDate: Date,
  endDate: Date,
  groupBy: "month" | "day" | "hour",
): string[] {
  const keys: string[] = [];
  const startKey = getPeriodKeyEST(startDate, groupBy);
  const endKey = getPeriodKeyEST(endDate, groupBy);
  let current = new Date(startDate);

  while (getPeriodKeyEST(current, groupBy) <= endKey) {
    const periodKey = getPeriodKeyEST(current, groupBy);
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

describe("Production Bug - Oct to Nov transition 2025", () => {
  describe("Month aggregation with 1 month timeRange", () => {
    const serverTimezones = [
      { tz: "UTC", name: "UTC (production)" },
      { tz: "America/New_York", name: "EST/EDT (local)" },
      { tz: "America/Los_Angeles", name: "PST/PDT" },
      { tz: "Asia/Tokyo", name: "JST" },
    ];

    serverTimezones.forEach(({ tz, name }) => {
      it(`should generate correct monthly keys for Oct-Nov 2025 in ${name}`, () => {
        withTimezone(tz, () => {
          // Simulate being on Nov 2, 2025
          const now = new Date("2025-11-02T12:00:00-05:00"); // Nov 2, 2025 noon EST

          // With timeRange=1 (1 month), we want current month only
          const startDate = getStartOfMonthEST(
            addPeriodEST(now, -(1 - 1), "month"),
          );
          const endDate = getEndOfMonthEST(now);

          const keys = generatePeriodKeys(startDate, endDate, "month");

          // Should have exactly 1 month (November 2025)
          expect(keys).toEqual(["2025-11"]);

          // No duplicates
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(1);
        });
      });

      it(`should generate correct daily keys for Nov 1-2, 2025 in ${name}`, () => {
        withTimezone(tz, () => {
          // Simulate aggregating Nov 1-2, 2025
          const startDate = getStartOfDayEST(
            new Date("2025-11-01T00:00:00-04:00"),
          );
          const endDate = getEndOfDayEST(new Date("2025-11-02T23:59:59-05:00"));

          const keys = generatePeriodKeys(startDate, endDate, "day");

          // Check Nov 2 appears exactly once
          const nov2Count = keys.filter((k) => k === "2025-11-02").length;
          expect(nov2Count).toBe(1);

          // No duplicates
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);

          // Should include Nov 1 and Nov 2
          expect(keys).toContain("2025-11-01");
          expect(keys).toContain("2025-11-02");
        });
      });
    });
  });

  describe("Period key consistency across timezones", () => {
    it("should return the same period keys regardless of server timezone", () => {
      const testDate = new Date("2025-11-02T15:30:00-05:00"); // Nov 2, 2025 3:30 PM EST

      const results: { [tz: string]: string } = {};

      ["UTC", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"].forEach(
        (tz) => {
          withTimezone(tz, () => {
            results[tz] = getPeriodKeyEST(testDate, "day");
          });
        },
      );

      console.log("Period keys across timezones:", results);

      // All should return the same period key
      const uniqueValues = new Set(Object.values(results));
      expect(uniqueValues.size).toBe(1);
      expect(uniqueValues.values().next().value).toBe("2025-11-02");
    });
  });
});
