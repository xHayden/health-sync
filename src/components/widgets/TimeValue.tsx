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

  const timeRangeSetting = settings.find((s) => s.key === "timeRange");
  const timeRangeRaw = timeRangeSetting?.value ?? timeRangeSetting?.defaultValue;
  const timeRange = timeRangeRaw ? Number(timeRangeRaw) : getDefaultTimeRange(timeGrouping);

  const aggregationTypeSetting = settings.find((s) => s.key === "aggregationType");
  const aggregationType = (aggregationTypeSetting?.value ?? aggregationTypeSetting?.defaultValue ?? "net") as "net" | "total" | "average";

  const valueModeSetting = settings.find((s) => s.key === "valueMode");
  const valueMode = (valueModeSetting?.value ?? valueModeSetting?.defaultValue ?? "current") as "current" | "range";

  const cardNameSetting = settings.find((s) => s.key === "cardName");
  const cardName = (cardNameSetting?.value ?? cardNameSetting?.defaultValue ?? "Time Value") as string;

  function getDefaultTimeRange(groupBy: string): number {
    switch (groupBy) {
      case "month":
        return 1;
      case "day":
        return 1;
      case "hour":
        return 24;
      default:
        return 1;
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
    timeRange,
    !!selectedCounter && !!userId
  );

  const value = useMemo(() => {
    if (!timeData || timeData.length === 0) return null;

    if (valueMode === "current") {
      // Use the most recent server-aggregated interval in order returned by API
      const latest = timeData[timeData.length - 1];
      if (!latest) return 0;
      switch (aggregationType) {
        case "total":
          return latest.totalChanges;
        case "average":
          return latest.averageValue;
        case "net":
        default:
          return latest.netChange;
      }
    }

    // valueMode === "range" → aggregate across the returned range
    switch (aggregationType) {
      case "total":
        return timeData.reduce((sum, d) => sum + d.totalChanges, 0);
      case "average":
        return timeData.reduce((sum, d) => sum + d.averageValue, 0) / timeData.length;
      case "net":
      default:
        return timeData.reduce((sum, d) => sum + d.netChange, 0);
    }
  }, [timeData, aggregationType, valueMode]);

  const formattedValue = useMemo(() => {
    if (value == null) return "-";
    if (aggregationType === "average") return Number(value).toFixed(2);
    return Math.round(Number(value)).toString();
  }, [value, aggregationType]);

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


