import { NextResponse } from "next/server";
import {
  shareLayout,
  updateSharedLayout,
  getSharedLayoutsForMember,
  getSharedLayoutsByOwner,
  revokeSharedLayout,
} from "@/utils/db";

// GET: fetch shared layouts by owner or member
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const sharedUserId = searchParams.get("sharedUserId");

    if (ownerId && sharedUserId) {
      return NextResponse.json(
        { error: "Specify only one of ownerId or memberId" },
        { status: 400 }
      );
    }
    if (!ownerId && !sharedUserId) {
      return NextResponse.json(
        { error: "Missing ownerId or sharedUserId" },
        { status: 400 }
      );
    }

    if (ownerId) {
      const shares = await getSharedLayoutsByOwner(Number(ownerId));
      return NextResponse.json({ data: shares });
    } else {
      const shares = await getSharedLayoutsForMember(Number(sharedUserId));
      return NextResponse.json({ data: shares });
    }
  } catch (error: any) {
    console.error("GET /api/v1/layouts/share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shared layouts" },
      { status: 500 }
    );
  }
}

// POST: create a new share
export async function POST(request: Request) {
  try {
    // TODO -- verify this user is in fact the owner
    const body = await request.json();
    const { ownerId, layoutId, sharedUserId, scopes, expires } = body;
    if (
      ownerId === undefined ||
      layoutId === undefined ||
      sharedUserId === undefined
    ) {
      return NextResponse.json(
        { error: "Missing ownerId, layoutId, or sharedUserId" },
        { status: 400 }
      );
    }

    const shared = await shareLayout(
      Number(ownerId),
      Number(layoutId),
      Number(sharedUserId),
      scopes,
      expires ? new Date(expires) : undefined
    );
    return NextResponse.json(shared, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/layouts/share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create share" },
      { status: 500 }
    );
  }
}

// PATCH: update an existing share
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { shareId, expires, scopesToAdd, scopesToRemove, onDashboard } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId" },
        { status: 400 }
      );
    }

    const updated = await updateSharedLayout(Number(shareId), {
      expires:
        expires !== undefined
          ? expires
            ? new Date(expires)
            : null
          : undefined,
      scopesToAdd,
      scopesToRemove,
      onDashboard
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/v1/layouts/share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update share" },
      { status: 500 }
    );
  }
}

// DELETE: revoke a share
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("shareId");
    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId" },
        { status: 400 }
      );
    }
    await revokeSharedLayout(Number(shareId));
    return NextResponse.json({ message: "Share revoked successfully" });
  } catch (error: any) {
    console.error("DELETE /api/v1/layouts/share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke share" },
      { status: 500 }
    );
  }
}
