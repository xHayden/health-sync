import { NextResponse } from "next/server";
import { getCounterMonthlyAggregates } from "@/utils/db";

// GET: fetch monthly aggregated counter data for a specific counter
export async function GET(request: Request) {
  const authenticated = request.headers.get("x-user-owns-resource") === "true";
  const sourceAuthenticatedUserId = Number(request.headers.get("x-user-id"));
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const counterId = searchParams.get("counterId");
    const shareToken = searchParams.get("shareToken");
    const monthsBack = searchParams.get("monthsBack");

    if (!userId || !counterId) {
      return NextResponse.json(
        { error: "Missing userId or counterId" },
        { status: 400 }
      );
    }

    const monthsBackNumber = monthsBack ? Number(monthsBack) : 12;

    // Validate monthsBack
    if (monthsBack && (isNaN(monthsBackNumber) || monthsBackNumber < 1 || monthsBackNumber > 120)) {
      return NextResponse.json(
        { error: "Invalid monthsBack value (must be between 1 and 120)" },
        { status: 400 }
      );
    }

    const monthlyData = await getCounterMonthlyAggregates(
      Number(counterId),
      Number(userId),
      monthsBackNumber,
      authenticated,
      shareToken,
      sourceAuthenticatedUserId
    );

    return NextResponse.json({ data: monthlyData });
  } catch (error: any) {
    console.error("GET /api/v1/counters/monthly error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch monthly counter data" },
      { status: 500 }
    );
  }
}