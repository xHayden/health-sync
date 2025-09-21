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
    const category = searchParams.get('category');

    const skip = page * limit;

    console.log('Health data API - User ID:', session.user.id, 'Category:', category);

    const where = {
      ...(category && { category }),
    };

    const [data, total] = await Promise.all([
      DBAdapter.getPrismaClient().healthDataPoint.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      DBAdapter.getPrismaClient().healthDataPoint.count({ where }),
    ]);

    console.log('Health data API - Found:', total, 'records');

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
    console.error('Error fetching health data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}