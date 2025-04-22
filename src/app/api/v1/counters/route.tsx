import { NextResponse } from "next/server";
import {
  getCounters,
  createCounter,
  updateCounter,
  deleteCounter,
} from "@/utils/db";

// GET: fetch all Counters for a user.
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

    const Counters = await getCounters(Number(userId));
    return NextResponse.json({ data: Counters });
  } catch (error: any) {
    console.error("GET /api/v1/Counters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Counters" },
      { status: 500 }
    );
  }
}

// POST: create a new Counter.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...CounterData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const newCounter = await createCounter(userId, CounterData);
    return NextResponse.json(newCounter, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/counters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Counter" },
      { status: 500 }
    );
  }
}

// PATCH: update an existing Counter.
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, id, ...updateData } = body;

    if (!userId || !id) {
      return NextResponse.json(
        { error: "Missing userId or Counter id" },
        { status: 400 }
      );
    }

    const updatedCounter = await updateCounter(Number(userId), id, updateData);
    return NextResponse.json(updatedCounter); 
  } catch (error: any) {
    console.error("PATCH /api/v1/counters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update Counter" },
      { status: 500 }
    );
  }
}

// DELETE: remove a Counter.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Missing Counter id or userId" },
        { status: 400 }
      );
    }

    await deleteCounter(Number(userId), Number(id));
    return NextResponse.json({ message: "Counter deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/v1/counters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete Counter" },
      { status: 500 }
    );
  }
}