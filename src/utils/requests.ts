import { authOptions } from "@/lib/authOptions";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

export function ResponseStatus(
  success: boolean,
  route: string,
  responseCode?: number,
  message?: string
) {
  return Response.json({
    success: success,
    route: route,
    responseCode: responseCode ?? 200,
    message: message ?? "",
  });
}

export const VerifyResourceOwnerWithServerSession = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> => {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    // no session → not allowed
    return false;
  }

  const sessionUserId = session.user.id.toString();

  // 1) check req.query.userId
  const queryUserId = req.query.userId;
  if (queryUserId) {
    // Next.js may parse query params as string|array
    const allowed = Array.isArray(queryUserId)
      ? queryUserId.includes(sessionUserId)
      : queryUserId === sessionUserId;
    return allowed;
  }

  // 2) check req.body.userId
  const bodyUserId = (req.body?.userId ?? "").toString();
  if (bodyUserId) {
    return bodyUserId === sessionUserId;
  }

  // 3) if no userId in either place, default to true
  return true;
};
