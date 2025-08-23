import { NextResponse } from "next/server";
import { getCounterTimeAggregates } from "@/utils/db/counter";

// GET: fetch time-aggregated counter data for a specific counter
export async function GET(request: Request) {
  const authenticated = request.headers.get("x-user-owns-resource") === "true";
  const sourceAuthenticatedUserId = Number(request.headers.get("x-user-id"));
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const counterId = searchParams.get("counterId");
    const shareToken = searchParams.get("shareToken");
    const groupBy = searchParams.get("groupBy") as "month" | "day" | "hour";
    const timeRange = searchParams.get("timeRange");

    if (!userId || !counterId) {
      return NextResponse.json(
        { error: "Missing userId or counterId" },
        { status: 400 }
      );
    }

    if (!groupBy || !["month", "day", "hour"].includes(groupBy)) {
      return NextResponse.json(
        { error: "Invalid or missing groupBy parameter. Must be 'month', 'day', or 'hour'" },
        { status: 400 }
      );
    }

    const timeRangeNumber = timeRange ? Number(timeRange) : getDefaultTimeRange(groupBy);

    // Validate timeRange
    if (timeRange && (isNaN(timeRangeNumber) || timeRangeNumber < 1 || timeRangeNumber > getMaxTimeRange(groupBy))) {
      return NextResponse.json(
        { error: `Invalid timeRange value (must be between 1 and ${getMaxTimeRange(groupBy)} for ${groupBy})` },
        { status: 400 }
      );
    }

    const aggregatedData = await getCounterTimeAggregates(
      Number(counterId),
      Number(userId),
      groupBy,
      timeRangeNumber,
      authenticated,
      shareToken,
      sourceAuthenticatedUserId
    );

    return NextResponse.json({ data: aggregatedData });
  } catch (error: any) {
    console.error("GET /api/v1/counters/aggregated error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch aggregated counter data" },
      { status: 500 }
    );
  }
}

function getDefaultTimeRange(groupBy: string): number {
  switch (groupBy) {
    case "month":
      return 12;
    case "day":
      return 30;
    case "hour":
      return 24;
    default:
      return 12;
  }
}

function getMaxTimeRange(groupBy: string): number {
  switch (groupBy) {
    case "month":
      return 120; // 10 years
    case "day":
      return 365; // 1 year
    case "hour":
      return 168; // 1 week
    default:
      return 120;
  }
}