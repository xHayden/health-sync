import { getSleepSummaries } from "@/utils/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      
      const summaries = await getSleepSummaries(Number(userId));
      return NextResponse.json({ data: summaries });
    } catch (error: any) {
      console.error("GET /api/v1/summaries/sleep error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch sleep summaries" },
        { status: 500 }
      );
    }
  }