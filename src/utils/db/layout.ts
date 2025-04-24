import { TypedLayout, TypedLayoutWithUser, Widget } from "@/types/WidgetData";
import { DBAdapter } from "../db";
import { PermissionType, Prisma } from "@prisma/client";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

/**
 * Fetches all layouts for a given user.
 */
export async function getLayouts(
  userId: number,
  authenticated?: boolean,
  shareToken?: string,
  sessionUserId?: number | null
): Promise<TypedLayoutWithUser[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "layouts",
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const layouts = await DBAdapter.getPrismaClient().layout.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });
  // Assume that the layout column stores the complete Layout object as JSON
  return layouts.map((row) => ({
    ...row,
    widgets: row.widgets as unknown as Widget[],
  }));
}

/**
 * Creates a new layout for the user.
 */
export async function createLayout(
  userId: number,
  data: TypedLayout,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<TypedLayoutWithUser> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "layouts",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const rec = await DBAdapter.getPrismaClient().layout.create({
    data: {
      userId,
      name: data.name,
      widgets: data.widgets as unknown as Prisma.InputJsonValue[],
      onDashboard: false,
    },
    include: { user: true },
  });
  return {
    ...rec,
    widgets: rec.widgets as unknown as Widget[],
  };
}

/**
 * Updates an existing layout for the user.
 * Throws an error if the layout is not found or does not belong to the user.
 */
export async function updateLayout(
  userId: number,
  layoutId: number,
  layoutData?: TypedLayout,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<TypedLayoutWithUser> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "layouts",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  const existing = await DBAdapter.getPrismaClient().layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) {
    throw new Error("Layout not found or unauthorized");
  }

  const rec = await DBAdapter.getPrismaClient().layout.update({
    where: { id: existing.id, userId },
    data: {
      name: layoutData?.name,
      widgets: layoutData?.widgets as unknown as Prisma.InputJsonValue[],
      onDashboard: layoutData?.onDashboard,
    },
    include: { user: true },
  });
  return {
    ...rec,
    widgets: rec.widgets as unknown as Widget[],
  };
}

/**
 * Deletes a layout for the user.
 * Throws an error if the layout is not found or does not belong to the user.
 */
export async function deleteLayout(
  userId: number,
  layoutId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "layouts",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  
  const existing = await DBAdapter.getPrismaClient().layout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) {
    throw new Error("Layout not found or unauthorized");
  }
  await DBAdapter.getPrismaClient().layout.delete({
    where: { id: layoutId },
  });
}
