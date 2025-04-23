// app/api/v1/layouts/route.tsx
import { NextResponse } from "next/server";
import {
  getLayouts,
  createLayout,
  updateLayout,
  deleteLayout,
} from "@/utils/db";

// GET: fetch all layouts for a user.
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

    const layouts = await getLayouts(Number(userId));
    return NextResponse.json({ data: layouts });
  } catch (error: any) {
    console.error("GET /api/v1/layouts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch layouts" },
      { status: 500 }
    );
  }
}

// POST: create a new layout.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...layoutData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const newLayout = await createLayout(userId, layoutData);
    return NextResponse.json(newLayout, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/layouts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create layout" },
      { status: 500 }
    );
  }
}

// PATCH: update an existing layout.
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, id, ...updateData } = body;

    if (!userId || !id) {
      return NextResponse.json(
        { error: "Missing userId or layout id" },
        { status: 400 }
      );
    }

    const updatedLayout = await updateLayout(Number(userId), id, updateData);
    return NextResponse.json(updatedLayout); 
  } catch (error: any) {
    console.error("PATCH /api/v1/layouts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update layout" },
      { status: 500 }
    );
  }
}

// DELETE: remove a layout.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Missing layout id or userId" },
        { status: 400 }
      );
    }

    await deleteLayout(Number(userId), Number(id));
    return NextResponse.json({ message: "Layout deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/v1/layouts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete layout" },
      { status: 500 }
    );
  }
}