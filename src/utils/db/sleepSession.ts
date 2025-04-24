import { PermissionType, SleepSession } from "@prisma/client";
import {
  checkHasSharePermission,
  CheckHasSharePermissionArgs,
} from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

export async function insertSleepSessions(
  userId: number,
  sleepSessions: SleepSession[] | undefined,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<void> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "sleepSessions",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  if (!sleepSessions || sleepSessions.length === 0) return;
  return;
}

export async function getSleepSessions(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<SleepSession[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "sleepSessions",
      resourceId: null,
      permissionType: PermissionType.READ,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }

  return [];
}
