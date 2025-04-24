import { CheckHasSharePermissionArgs } from "@/utils/db/sharedLayout";

export class PermissionError extends Error {
  constructor({ ownerUserId, resourceType, resourceId, permissionType, sessionUserId }: CheckHasSharePermissionArgs) {
    super(`userId ${sessionUserId} does not have ${permissionType} access to ${resourceId ? resourceId + " from" : "all"} ${resourceType} of userId ${ownerUserId}`);
    this.name = "PermissionError";
  }
}
