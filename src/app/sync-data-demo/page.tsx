import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import HealthDataClient from './HealthDataClient';
import WorkoutSummariesClient from './WorkoutSummariesClient';

export default async function SyncDataDemoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Apple Health Sync Data Demo</h1>
        <p className="text-muted-foreground">
          Demo for synchronized health data and workout summaries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkoutSummariesClient />
        <HealthDataClient />
      </div>
    </div>
  );
}