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

interface HealthDataPoint {
  id: number;
  userId: number;
  category: string;
  timestamp: string;
  value: number;
  user?: {
    id: number;
    name: string | null;
    email: string | null;
  };
}

interface HealthDataResponse {
  data: HealthDataPoint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const HEALTH_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'step_counts', label: 'Step Count' },
  { value: 'active_energy_burned', label: 'Active Energy Burned' },
  { value: 'basal_energy_burned', label: 'Basal Energy Burned' },
  { value: 'flights_climbed', label: 'Flights Climbed' },
  { value: 'distance_walking_running', label: 'Distance Walking/Running' },
  { value: 'apple_exercise_time', label: 'Apple Exercise Time' },
  { value: 'apple_stand_time', label: 'Apple Stand Time' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'resting_heart_rate', label: 'Resting Heart Rate' },
  { value: 'heart_rate_variability_sdnn', label: 'Heart Rate Variability SDNN' },
  { value: 'blood_pressure_systolic', label: 'Blood Pressure Systolic' },
  { value: 'blood_pressure_diastolic', label: 'Blood Pressure Diastolic' },
  { value: 'vo2_max', label: 'VO2 Max' },
  { value: 'height', label: 'Height' },
  { value: 'body_mass', label: 'Body Mass' },
  { value: 'body_mass_index', label: 'Body Mass Index' },
  { value: 'body_fat_percentage', label: 'Body Fat Percentage' },
  { value: 'lean_body_mass', label: 'Lean Body Mass' },
  { value: 'waist_circumference', label: 'Waist Circumference' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation' },
  { value: 'respiratory_rate', label: 'Respiratory Rate' },
  { value: 'dietary_energy', label: 'Dietary Energy' },
  { value: 'dietary_carbohydrates', label: 'Dietary Carbohydrates' },
  { value: 'dietary_fat_total', label: 'Dietary Fat Total' },
  { value: 'dietary_protein', label: 'Dietary Protein' },
  { value: 'dietary_water', label: 'Dietary Water' },
  { value: 'mindful_session', label: 'Mindful Session' },
];

export default function HealthDataClient() {
  const [healthData, setHealthData] = useState<HealthDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [total, setTotal] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealthData = useCallback(async (pageNum: number, category: string, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
        ...(category && category !== 'all' && { category }),
      });

      console.log('Fetching health data with params:', params.toString());
      const response = await fetch(`/api/admin/health-data?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch health data: ${response.status}`);
      }

      const result: HealthDataResponse = await response.json();
      console.log('API Response:', result);

      if (reset) {
        setHealthData(result.data);
      } else {
        setHealthData(prev => [...prev, ...result.data]);
      }

      setHasMore(result.pagination.hasMore);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    setHealthData([]);
    fetchHealthData(0, selectedCategory, true);
  }, [selectedCategory, fetchHealthData]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHealthData(nextPage, selectedCategory);
    }
  }, [loading, hasMore, page, selectedCategory, fetchHealthData]);

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

  const formatValue = (value: number, category: string) => {
    switch (category) {
      case 'step_counts':
        return value.toLocaleString();
      case 'active_energy_burned':
      case 'basal_energy_burned':
        return `${value.toFixed(1)} kcal`;
      case 'distance_walking_running':
        return `${(value / 1000).toFixed(2)} km`;
      case 'heart_rate':
      case 'resting_heart_rate':
        return `${Math.round(value)} bpm`;
      case 'body_mass':
        return `${value.toFixed(1)} kg`;
      case 'height':
        return `${(value * 100).toFixed(1)} cm`;
      default:
        return value.toString();
    }
  };

  return (
    <Card className="flex flex-col h-[80vh]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex justify-between items-center">
          Health Data
          <span className="text-sm font-normal text-muted-foreground">
            {total.toLocaleString()} total records
          </span>
        </CardTitle>
        <div className="w-64">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {HEALTH_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
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
                  <TableHead>Category</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthData.map((item, index) => (
                  <TableRow key={`${item.id}-${item.timestamp}-${index}`}>
                    <TableCell className="font-medium">
                      {item.user?.name || item.user?.email || `User ${item.userId}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {HEALTH_CATEGORIES.find(cat => cat.value === item.category)?.label || item.category}
                    </TableCell>
                    <TableCell>{formatValue(item.value, item.category)}</TableCell>
                    <TableCell>
                      {new Date(item.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {loading && (
              <div className="flex items-center justify-center p-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-foreground"></div>
                  Loading more health data...
                </div>
              </div>
            )}
            {!hasMore && healthData.length > 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No more data to load
              </div>
            )}
            {healthData.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No health data found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
  );
}