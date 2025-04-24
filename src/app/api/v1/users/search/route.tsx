import { NextResponse } from "next/server";
import { searchUsersBasic } from "@/utils/db";

// GET: search users by name and/or email (case-insensitive).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") ?? undefined;
    const email = searchParams.get("email") ?? undefined;

    if (!name && !email) {
      return NextResponse.json(
        { error: "Must provide at least `name` or `email` to search" },
        { status: 400 }
      );
    }

    const users = await searchUsersBasic({ name, email });
    return NextResponse.json({ data: users });
  } catch (error: any) {
    console.error("GET /api/v1/users/search error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search users" },
      { status: 500 }
    );
  }
}