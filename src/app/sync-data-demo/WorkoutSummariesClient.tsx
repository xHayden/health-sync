'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkoutSummary {
  id: number;
  userId: number;
  date: string;
  totalWorkoutTime: number;
  energyBurned: number | null;
  totalDistance: number | null;
  steps: number | null;
  tts: number | null;
  atl: number | null;
  ctl: number | null;
  bodyweight: number | null;
  exerciseTypes: string[];
  user?: {
    id: number;
    name: string | null;
    email: string | null;
  };
  workouts: Array<{
    id: number;
    type: string;
    duration: number;
    energyBurned: number | null;
    distance: number | null;
  }>;
}

interface WorkoutSummariesResponse {
  data: WorkoutSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Summaries' },
  { value: 'recent', label: 'Last 30 Days' },
  { value: 'high-energy', label: 'High Energy (>500 kcal)' },
  { value: 'long-workout', label: 'Long Workouts (>60 min)' },
  { value: 'high-distance', label: 'High Distance (>5 km)' },
  { value: 'high-steps', label: 'High Steps (>10k)' },
  { value: 'cardio', label: 'Cardio Workouts' },
  { value: 'strength', label: 'Strength Workouts' },
];

export default function WorkoutSummariesClient() {
  const [summaries, setSummaries] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSummaries = useCallback(async (pageNum: number, filter: string, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
        ...(filter && filter !== 'all' && { filter }),
      });

      console.log('Fetching workout summaries with params:', params.toString());
      const response = await fetch(`/api/admin/workout-summaries?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch workout summaries: ${response.status}`);
      }

      const result: WorkoutSummariesResponse = await response.json();
      console.log('API Response:', result);

      if (reset) {
        setSummaries(result.data);
      } else {
        setSummaries(prev => [...prev, ...result.data]);
      }

      setHasMore(result.pagination.hasMore);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Error fetching workout summaries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    setSummaries([]);
    fetchSummaries(0, selectedFilter, true);
  }, [selectedFilter, fetchSummaries]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSummaries(nextPage, selectedFilter);
    }
  }, [loading, hasMore, page, selectedFilter, fetchSummaries]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          loadMore();
        }
      }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loadMore]);

  const formatValue = (value: number | null, unit?: string) => {
    if (value === null) return 'N/A';
    if (unit) return `${value.toLocaleString()} ${unit}`;
    return value.toLocaleString();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className="flex flex-col h-[80vh]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex justify-between items-center">
          Workout Summaries
          <span className="text-sm font-normal text-muted-foreground">
            {total.toLocaleString()} total summaries
          </span>
        </CardTitle>
        <div className="w-64">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter summaries" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto rounded-md border"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Workout Time</TableHead>
                <TableHead>Energy Burned</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>TTS</TableHead>
                <TableHead>ATL</TableHead>
                <TableHead>CTL</TableHead>
                <TableHead>Exercise Types</TableHead>
                <TableHead>Workouts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary, index) => (
                <TableRow key={`${summary.id}-${summary.date}-${index}`}>
                  <TableCell className="font-medium">
                    {summary.user?.name || summary.user?.email || `User ${summary.userId}`}
                  </TableCell>
                  <TableCell>
                    {new Date(summary.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{formatTime(summary.totalWorkoutTime)}</TableCell>
                  <TableCell>{formatValue(summary.energyBurned, 'kcal')}</TableCell>
                  <TableCell>{formatValue(summary.totalDistance && summary.totalDistance / 1000, 'km')}</TableCell>
                  <TableCell>{formatValue(summary.steps)}</TableCell>
                  <TableCell>{formatValue(summary.tts, 'TTS')}</TableCell>
                  <TableCell>{formatValue(summary.atl, 'ATL')}</TableCell>
                  <TableCell>{formatValue(summary.ctl, 'CTL')}</TableCell>
                  <TableCell>
                    <div className="max-w-32 truncate" title={summary.exerciseTypes.join(', ')}>
                      {summary.exerciseTypes.join(', ') || 'None'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {summary.workouts.length} workout{summary.workouts.length !== 1 ? 's' : ''}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && (
            <div className="flex items-center justify-center p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-foreground"></div>
                Loading more workout summaries...
              </div>
            </div>
          )}
          {!hasMore && summaries.length > 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No more summaries to load
            </div>
          )}
          {summaries.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No workout summaries found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}