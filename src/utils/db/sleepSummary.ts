import { PermissionType, SleepSession } from "@prisma/client";
import { checkHasSharePermission, CheckHasSharePermissionArgs } from "./sharedLayout";
import { PermissionError } from "@/lib/errors";

export async function insertSleepSummaries(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null,
  sessionUserId?: number | null
): Promise<SleepSession[]> {
  if (!authenticated) {
    const resourceArgs: CheckHasSharePermissionArgs = {
      ownerUserId: userId,
      resourceType: "sleepSummaries",
      resourceId: null,
      permissionType: PermissionType.WRITE,
      shareToken,
      sessionUserId,
    };
    if (!(await checkHasSharePermission(resourceArgs)))
      throw new PermissionError(resourceArgs);
  }
  return [];
}
