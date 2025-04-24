import jwt from "jsonwebtoken";
import {
  PermissionType,
  SharedLayout,
  SharedLayoutDataScope,
  Layout,
} from "@prisma/client";
import { DBAdapter } from "../db";
import {
  SharedLayoutWithSharedUserAndOwner,
} from "@/types/WidgetData";

// TODO add auth verification here

const SHARE_SECRET = process.env.SHARE_TOKEN_SECRET as string;
if (!SHARE_SECRET) {
  throw new Error("Environment variable SHARE_TOKEN_SECRET must be set");
}

interface ShareTokenPayload extends jwt.JwtPayload {
  shareId: number;
  ownerId: number;
  layoutId: number;
  sharedUserId: number;
  scopes: {
    id: number;
    resourceType: string;
    resourceId: number | null;
    permissions: PermissionType[];
  }[];
}

/**
 * Helper: Sign a JWT whose `exp` matches the DB `expires` column.
 * If `expires` is null, the token has **no** expiration claim and therefore
 * is valid until the share is revoked.
 */
function signShareToken(
  shared: SharedLayout & { dataScopes: SharedLayoutDataScope[] }
): string {
  const now = Date.now();
  const ttlSeconds = shared.expires
    ? Math.floor((shared.expires.getTime() - now) / 1000)
    : undefined;

  const payload: ShareTokenPayload = {
    shareId: shared.id,
    ownerId: shared.ownerId,
    layoutId: shared.layoutId,
    sharedUserId: shared.sharedUserId,
    scopes: shared.dataScopes.map((ds) => ({
      id: ds.id,
      resourceType: ds.resourceType,
      resourceId: ds.resourceId,
      permissions: ds.permissions,
    })),
  };

  const signOptions: jwt.SignOptions | undefined =
    ttlSeconds && ttlSeconds > 0 ? { expiresIn: ttlSeconds } : undefined;

  return jwt.sign(payload, SHARE_SECRET, signOptions);
}

/**
 * Share a layout with another user, returning a signed JWT token.
 */
export async function shareLayout(
  ownerId: number,
  layoutId: number,
  sharedUserId: number,
  scopes: Array<{
    resourceType: string;
    resourceId?: number;
    permissions: PermissionType[];
  }> = [],
  expires?: Date
): Promise<
  SharedLayout & { token: string; dataScopes: SharedLayoutDataScope[] }
> {
  // Validate scopes
  for (const scope of scopes) {
    if (!scope.resourceType || scope.permissions.length === 0) {
      throw new Error(
        "Each scope must have a resourceType and at least one permission"
      );
    }
  }

  // 1) Create the share record (initially without the token)
  const shared = await DBAdapter.getPrismaClient().sharedLayout.create({
    data: {
      layout: { connect: { id: layoutId } },
      owner: { connect: { id: ownerId } },
      sharedUser: { connect: { id: sharedUserId } },
      expires: expires ?? null,
      dataScopes: {
        create: scopes.map((scope) => ({
          resourceType: scope.resourceType,
          resourceId: scope.resourceId ?? null,
          permissions: scope.permissions,
        })),
      },
    },
    include: { dataScopes: true },
  });

  // 2) Sign JWT so that `exp` mirrors DB `expires`
  const token = signShareToken(shared);

  // 3) Persist token to DB (facilitates revocation / rotation)
  const updated = await DBAdapter.getPrismaClient().sharedLayout.update({
    where: { id: shared.id },
    data: { token },
    include: { dataScopes: true },
  });

  return { ...updated, token };
}

/**
 * Get all layouts shared with a given user.
 */
export async function getSharedLayoutsForMember(
  userId: number
): Promise<Array<SharedLayoutWithSharedUserAndOwner>> {
  return DBAdapter.getPrismaClient().sharedLayout.findMany({
    where: { sharedUserId: userId },
    include: {
      layout: {
        include: {
          user: true
        }
      },
      owner: { select: { id: true, name: true, email: true } },
      sharedUser: { select: { id: true, name: true, email: true } },
      dataScopes: true,
    },
  });
}

/**
 * Get all layouts a user has shared (as owner).
 */
export async function getSharedLayoutsByOwner(
  ownerId: number
): Promise<Array<SharedLayoutWithSharedUserAndOwner>> {
  return DBAdapter.getPrismaClient().sharedLayout.findMany({
    where: { ownerId },
    include: {
      layout: true,
      sharedUser: { select: { id: true, name: true, email: true } },
      owner: { select: { id: true, name: true, email: true } },
      dataScopes: true,
    },
  });
}

/**
 * Update the expiration or scopes of an existing share and re-issue JWT.
 * The JWT's `exp` claim is ALWAYS regenerated to match the DB `expires`
 * so that the two sources of truth never diverge.
 */
export async function updateSharedLayout(
  shareId: number,
  updates: {
    expires?: Date | null;
    scopesToAdd?: Array<{
      resourceType: string;
      resourceId?: number;
      permissions: PermissionType[];
    }>;
    scopesToRemove?: number[]; // IDs of SharedLayoutDataScope to remove
    onDashboard?: boolean
  }
): Promise<
  SharedLayout & { token: string; dataScopes: SharedLayoutDataScope[] }
> {
  const prisma = DBAdapter.getPrismaClient();
  const { onDashboard } = updates;

  // 1) Remove specified scopes
  if (updates.scopesToRemove?.length) {
    await prisma.sharedLayoutDataScope.deleteMany({
      where: { id: { in: updates.scopesToRemove } },
    });
  }

  // 2) Add new scopes (validated)
  if (updates.scopesToAdd?.length) {
    for (const scope of updates.scopesToAdd) {
      if (!scope.resourceType || scope.permissions.length === 0) {
        throw new Error(
          "Each added scope must have a resourceType and at least one permission"
        );
      }
    }
    await prisma.sharedLayoutDataScope.createMany({
      data: updates.scopesToAdd.map((scope) => ({
        sharedLayoutId: shareId,
        resourceType: scope.resourceType,
        resourceId: scope.resourceId ?? null,
        permissions: scope.permissions,
      })),
      skipDuplicates: true,
    });
  }

  // 3) Update expiration if provided (can be set, cleared, or unchanged)
  if (updates.expires !== undefined) {
    await prisma.sharedLayout.update({
      where: { id: shareId },
      data: { expires: updates.expires },
    });
  }

  // 4) Fetch the fresh record (+ scopes) then re-issue JWT so that
  //    its `exp` mirrors DB `expires`. This guarantees the two never diverge.
  const shared = await prisma.sharedLayout.findUnique({
    where: { id: shareId },
    include: { dataScopes: true },
  });
  if (!shared) throw new Error("Shared layout not found");

  const token = signShareToken(shared);

  const updated = await prisma.sharedLayout.update({
    where: { id: shareId },
    data: { token, onDashboard },
    include: { dataScopes: true },
  });

  return { ...updated, token };
}

export async function revokeSharedLayout(shareId: number): Promise<void> {
  await DBAdapter.getPrismaClient().sharedLayout.delete({
    where: { id: shareId },
  });
}

/**
 * Validate a share token and retrieve the corresponding layout if valid.
 * Additional behaviour:
 *   1. The supplied token **must** match the one stored in DB.
 *   2. If the share is expired (either by JWT or DB check), the record is
 *      deleted immediately to keep the table tidy.
 */
export async function getLayoutByShareToken(
  token: string
): Promise<
  | (SharedLayout & { layout: Layout; dataScopes: SharedLayoutDataScope[] })
  | null
> {
  const prisma = DBAdapter.getPrismaClient();

  let payload: ShareTokenPayload;
  try {
    payload = jwt.verify(token, SHARE_SECRET) as ShareTokenPayload;
  } catch (err) {
    // Cleanup expired or tampered rows if possible
    try {
      const decoded = jwt.decode(token) as ShareTokenPayload | null;
      if (decoded?.shareId) {
        await prisma.sharedLayout
          .delete({ where: { id: decoded.shareId } })
          .catch(() => {});
      }
    } finally {
      return null;
    }
  }

  // 2) Fetch the share record & scopes
  const shared = await prisma.sharedLayout.findUnique({
    where: { id: payload.shareId },
    include: { layout: true, dataScopes: true },
  });
  if (!shared) return null;

  // 3) Ensure the supplied token is the *current* one recorded in DB.
  if (shared.token !== token) return null;

  // 4) Check DB-stored expiration. If expired, delete row for quick cleanup.
  if (shared.expires && shared.expires < new Date()) {
    await prisma.sharedLayout
      .delete({ where: { id: shared.id } })
      .catch(() => {});
    return null;
  }

  // 5) Compare scopes for tamper detection
  const dbScopes = shared.dataScopes;
  const tokenScopes = payload.scopes;

  // Must have exactly the same number of scopes
  if (tokenScopes.length !== dbScopes.length) {
    return null;
  }

  for (const tScope of tokenScopes) {
    // Find the matching DB scope by ID
    const dbScope = dbScopes.find((ds) => ds.id === tScope.id);
    if (!dbScope) {
      return null;
    }

    // Must match resourceType & resourceId
    if (dbScope.resourceType !== tScope.resourceType) {
      return null;
    }
    // Both may be null or numbers
    if ((dbScope.resourceId ?? null) !== (tScope.resourceId ?? null)) {
      return null;
    }

    // Permissions arrays must match exactly (order-agnostic)
    const dbPerms = [...dbScope.permissions].sort();
    const tokenPerms = [...tScope.permissions].sort();
    if (
      dbPerms.length !== tokenPerms.length ||
      dbPerms.some((perm, idx) => perm !== tokenPerms[idx])
    ) {
      return null;
    }
  }

  // If everything lines up, return the shared layout
  return shared;
}

export interface CheckHasSharePermissionArgs {
  /** ID of the owner of the resource */
  ownerUserId: number;
  resourceType: string | string[];
  resourceId: number | null;
  permissionType: PermissionType;
  /** Raw JWT presented by the caller (optional) */
  shareToken?: string | null;
  /** ID of the **caller** (never the owner id) */
  sessionUserId?: number | null;
}

/**
 * Returns `true` when the caller can perform `permissionType`
 * on (`resourceType`, `resourceId`).
 *
 * 1. Token present & payload grants the permission
 * 2. Otherwise: single‑query lookup in SharedLayout table
 */
export async function checkHasSharePermission(
  args: CheckHasSharePermissionArgs
): Promise<boolean> {
  const {
    ownerUserId,
    resourceType,
    resourceId,
    permissionType,
    shareToken,
    sessionUserId,
  } = args;

  // Normalise resourceType to an array so downstream logic can stay simple
  const resourceTypes = Array.isArray(resourceType)
    ? resourceType
    : [resourceType];

  // Helper to treat WRITE as including READ
  const grantsRead = (perms: PermissionType[], check: PermissionType) =>
    perms.includes(check) ||
    (check === PermissionType.READ && perms.includes(PermissionType.WRITE));

  /* ------------------------------------------------------------------
   * 1) Try token‑based check first
   * ------------------------------------------------------------------*/
  if (shareToken) {
    try {
      const decoded = jwt.verify(shareToken, SHARE_SECRET) as ShareTokenPayload;

      // Must match the correct owner
      if (decoded.ownerId !== ownerUserId) return false;

      // See if any scope in the token covers •one of• the requested types
      const tokenScopeMatches = decoded.scopes.some((s) => {
        const typeOk = resourceTypes.includes(s.resourceType);
        const idOk = s.resourceId === null || s.resourceId === resourceId;
        const permOk = grantsRead(s.permissions, permissionType);
        return typeOk && idOk && permOk;
      });

      if (tokenScopeMatches) return true;
    } catch {
      // invalid/expired token → fall through to DB check
    }
  }

  /* ------------------------------------------------------------------
   * 2) Fallback to database lookup
   * ------------------------------------------------------------------*/
  const prisma = DBAdapter.getPrismaClient();

  // Build a permission filter: for READ, allow READ or WRITE; else exact match
  const permissionFilter =
    permissionType === PermissionType.READ
      ? {
          OR: [
            { permissions: { has: PermissionType.READ } },
            { permissions: { has: PermissionType.WRITE } },
          ],
        }
      : { permissions: { has: permissionType } };

  // Build the OR conditions for every requested resourceType
  const resourceTypeFilters = resourceTypes.map((rt) => ({
    dataScopes: {
      some: {
        resourceType: rt,
        OR: [{ resourceId: null }, { resourceId: resourceId ?? undefined }],
        ...permissionFilter,
      },
    },
  }));

  const shareExists = await prisma.sharedLayout.findFirst({
    where: {
      sharedUserId: sessionUserId as number,
      OR: [
        { expires: null },
        { expires: { gte: new Date() } },
        ...resourceTypeFilters,
      ],
    },
    select: { id: true },
  });

  return Boolean(shareExists);
}
