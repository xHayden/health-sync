import { NextResponse } from "next/server";
import { getCounterHistory } from "@/utils/db";

// GET: fetch counter history for a specific counter within a date range
export async function GET(request: Request) {
  const authenticated = request.headers.get("x-user-owns-resource") === "true";
  const sourceAuthenticatedUserId = Number(request.headers.get("x-user-id"));
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const counterId = searchParams.get("counterId");
    const shareToken = searchParams.get("shareToken");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!userId || !counterId) {
      return NextResponse.json(
        { error: "Missing userId or counterId" },
        { status: 400 }
      );
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Validate dates
    if (startDate && isNaN(startDateObj!.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDateObj!.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format" },
        { status: 400 }
      );
    }

    const history = await getCounterHistory(
      Number(counterId),
      Number(userId),
      startDateObj,
      endDateObj,
      authenticated,
      shareToken,
      sourceAuthenticatedUserId
    );

    return NextResponse.json({ data: history });
  } catch (error: any) {
    console.error("GET /api/v1/counters/history error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch counter history" },
      { status: 500 }
    );
  }
}