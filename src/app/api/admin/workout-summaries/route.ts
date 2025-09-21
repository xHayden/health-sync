import { NextRequest, NextResponse } from 'next/server';
import { DBAdapter } from '@/utils/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filter = searchParams.get('filter');

    const skip = page * limit;

    console.log('Admin workout summaries API - Page:', page, 'Filter:', filter);

    // Build where clause based on filter
    let where: any = {};

    if (filter && filter !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      switch (filter) {
        case 'recent':
          where.date = { gte: thirtyDaysAgo };
          break;
        case 'high-energy':
          where.energyBurned = { gt: 500 };
          break;
        case 'long-workout':
          where.totalWorkoutTime = { gt: 60 };
          break;
        case 'high-distance':
          where.totalDistance = { gt: 5000 }; // 5km in meters
          break;
        case 'high-steps':
          where.steps = { gt: 10000 };
          break;
        case 'cardio':
          where.exerciseTypes = { hasSome: ['Running', 'Cycling', 'Swimming', 'Walking'] };
          break;
        case 'strength':
          where.exerciseTypes = { hasSome: ['Weight Training', 'Strength Training', 'Functional Strength Training'] };
          break;
      }
    }

    const [data, total] = await Promise.all([
      DBAdapter.getPrismaClient().dailyWorkoutSummary.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          workouts: {
            select: {
              id: true,
              type: true,
              duration: true,
              energyBurned: true,
              distance: true,
            },
          },
        },
      }),
      DBAdapter.getPrismaClient().dailyWorkoutSummary.count({ where }),
    ]);

    console.log('Admin workout summaries API - Found:', total, 'records');

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching admin workout summaries:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}