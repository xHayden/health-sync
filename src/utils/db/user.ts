import { HealthDataPoint } from "@prisma/client";
import { DBAdapter } from "../db";

export interface BasicUser {
  id: number;
  name: string | null;
  email: string | null;
}

export async function getUserIdOrCreate(email: string): Promise<number> {
  let user = await DBAdapter.getPrismaClient().user.findUnique({
    where: { email },
  });
  if (!user) {
    user = await DBAdapter.getPrismaClient().user.create({
      data: { email },
    });
  }
  return user.id;
}

export async function getAllDataForUser(
  userId: number,
  authenticated?: boolean,
  shareToken?: string | null
): Promise<any> {
  const dataPoints = await DBAdapter.getPrismaClient().healthDataPoint.findMany(
    {
      where: { userId },
      orderBy: { timestamp: "asc" },
    }
  );

  // Group by category
  const results: { [key: string]: any[] } = {};
  for (const dp of dataPoints) {
    if (!results[dp.category]) {
      results[dp.category] = [];
    }
    results[dp.category].push(dp);
  }
  return results;
}

export async function getDataForUserByMetric(
  userId: number,
  metric: string,
  authenticated?: boolean,
  shareToken?: string | null
): Promise<any[]> {
  return DBAdapter.getPrismaClient().healthDataPoint.findMany({
    where: {
      userId,
      category: metric,
    },
    orderBy: { timestamp: "asc" },
  });
}

export async function getDataForUserByDate(
  userId: number,
  date: string,
  authenticated?: boolean,
  shareToken?: string | null
): Promise<any> {
  const start = new Date(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dataPoints: HealthDataPoint[] =
    await DBAdapter.getPrismaClient().healthDataPoint.findMany({
      where: {
        userId,
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: "asc" },
    });

  const results: { [key: string]: any[] } = {};
  for (const dp of dataPoints) {
    if (!results[dp.category]) {
      results[dp.category] = [];
    }
    results[dp.category].push(dp);
  }
  return results;
}

/**
 * Fetch *all* users, but only return their id, name and email.
 */
export async function getAllUsersBasic(): Promise<BasicUser[]> {
  return DBAdapter.getPrismaClient().user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function searchUsersBasic({
  name,
  email,
}: {
  name?: string;
  email?: string;
}): Promise<BasicUser[]> {
  return DBAdapter.getPrismaClient().user.findMany({
    where: {
      OR: [
        { email: { contains: email, mode: "insensitive" } },
        { name: { contains: name, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

/**
 * Check if *any* user exists with the given email or id.
 * Provide either `email` or `id` (or both).
 */
export async function checkUserExists({
  id,
  email,
}: {
  id?: number;
  email?: string;
}): Promise<boolean> {
  if (!email && id === undefined) {
    throw new Error("Must provide email or id to check existence");
  }

  const user = await DBAdapter.getPrismaClient().user.findFirst({
    where: {
      OR: [email ? { email } : undefined, id ? { id } : undefined].filter(
        Boolean
      ) as { email?: string; id?: number }[],
    },
    select: { id: true },
  });

  return user !== null;
}
