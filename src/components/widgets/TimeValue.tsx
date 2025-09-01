"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { WidgetSetting } from "@/lib/widgetRegistry";
import { AdditionalHooks } from "../WidgetDisplay";
import { Counter as CounterType } from "@prisma/client";
import { useCounterTimeAggregatedDataHook } from "@/hooks/useCounterHistory";

export interface TimeValueProps {
  counters: CounterType[];
  additionalHooks: AdditionalHooks;
  settings: WidgetSetting[];
}

const TimeValue: React.FC<TimeValueProps> = ({ counters, additionalHooks, settings }) => {
  const [selectedCounter, setSelectedCounter] = useState<CounterType | undefined>(undefined);
  const [needsDataSource, setNeedsDataSource] = useState(true);

  const dataSourceSetting = settings.find((s) => s.key === "dataSource");
  const dataSourceValue = dataSourceSetting?.value ?? dataSourceSetting?.defaultValue;

  const timeGroupingSetting = settings.find((s) => s.key === "timeGrouping");
  const timeGrouping = (timeGroupingSetting?.value ?? timeGroupingSetting?.defaultValue ?? "month") as "month" | "day" | "hour";

  // Simplify: always request only the latest period from the server
  const effectiveTimeRange = 1;

  // Simplified: fixed aggregation (net change) and current period only

  const cardNameSetting = settings.find((s) => s.key === "cardName");
  const cardName = (cardNameSetting?.value ?? cardNameSetting?.defaultValue ?? "Time Value") as string;

  function getDefaultTimeRange(groupBy: string): number {
    // Match MonthGraph defaults exactly
    switch (groupBy) {
      case "month":
        return 12;
      case "day":
        return 30;
      case "hour":
        return 24;
      default:
        return 12;
    }
  }

  useEffect(() => {
    if (!dataSourceValue || !counters || counters.length === 0) {
      setNeedsDataSource(true);
      setSelectedCounter(undefined);
      return;
    }
    const counter = counters.find((c) => c.id == dataSourceValue);
    setSelectedCounter(counter);
    setNeedsDataSource(!counter);
  }, [dataSourceValue, counters]);

  const userId = additionalHooks?.userId;

  const { timeData, isLoading, error } = useCounterTimeAggregatedDataHook(
    userId || 0,
    selectedCounter?.id || 0,
    timeGrouping,
    effectiveTimeRange,
    !!selectedCounter && !!userId
  );

  // Build chartData exactly like MonthGraph for consistent value selection (netChange as the primary series)
  const chartData = useMemo(() => {
    if (!timeData || timeData.length === 0) return [] as { value: number }[];
    return timeData.map((data) => ({ value: data.netChange }));
  }, [timeData]);

  const value = useMemo(() => {
    if (!timeData || timeData.length === 0) return null;
    const latestPoint = chartData[chartData.length - 1];
    return latestPoint ? latestPoint.value : 0;
  }, [timeData, chartData]);

  const formattedValue = useMemo(() => {
    if (value == null) return "-";
    return Math.round(Number(value)).toString();
  }, [value]);

  if (needsDataSource) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{cardName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center text-center">
          <p className="font-bold">Needs Counter Data Source</p>
          <p className="text-sm text-gray-600">(Select in Settings)</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{cardName}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{cardName}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <p className="text-red-600">Error loading data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full mx-2 bg-transparent flex flex-col">
      <CardHeader className="flex items-center text-xl">
        {cardName}
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center p-0">
        <span className="text-8xl font-semibold">{formattedValue}</span>
      </CardContent>
      {/* Spacer footer to mirror Counter's reset button height without showing controls */}
      <CardFooter className="justify-center">
        <Button variant="ghost" className="invisible">
          <RefreshCw size={32} className="mr-2" />
          Reset
        </Button>
      </CardFooter>
    </div>
  );
};

export default TimeValue;


