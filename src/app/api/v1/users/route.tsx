import { NextResponse } from "next/server";
import { getAllUsersBasic } from "@/utils/db";

export async function GET(request: Request) {
  try {
    const users = await getAllUsersBasic();
    return NextResponse.json({ data: users });
  } catch (error: any) {
    console.error("GET /api/v1/users error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
