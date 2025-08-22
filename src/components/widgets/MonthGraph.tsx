"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WidgetSetting } from "@/lib/widgetRegistry";
import { AdditionalHooks } from "../WidgetDisplay";
import { MonthlyCounterData, TimeAggregatedData, useCounterTimeAggregatedDataHook } from "@/hooks/useCounterHistory";
import { Counter as CounterType } from "@prisma/client";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface MonthGraphProps {
  counters: CounterType[];
  counterHistory: MonthlyCounterData[]; // Keep for backward compatibility
  additionalHooks: AdditionalHooks;
  settings: WidgetSetting[];
}

const MonthGraph: React.FC<MonthGraphProps> = ({
  counters,
  counterHistory,
  additionalHooks,
  settings,
}) => {
  const [selectedCounter, setSelectedCounter] = useState<CounterType | undefined>(undefined);
  const [needsDataSource, setNeedsDataSource] = useState(true);

  // Get settings values using the same pattern as the settings UI
  const dataSourceSetting = settings.find((s) => s.key === "dataSource");
  const dataSourceValue = dataSourceSetting?.value ?? dataSourceSetting?.defaultValue;
  
  const timeGroupingSetting = settings.find((s) => s.key === "timeGrouping");
  const timeGrouping = (timeGroupingSetting?.value ?? timeGroupingSetting?.defaultValue ?? "month") as "month" | "day" | "hour";
  
  const timeRangeSetting = settings.find((s) => s.key === "timeRange");
  const timeRangeValue = timeRangeSetting?.value ?? timeRangeSetting?.defaultValue;
  const timeRange = timeRangeValue ? Number(timeRangeValue) : getDefaultTimeRange(timeGrouping);

  const aggregationTypeSetting = settings.find((s) => s.key === "aggregationType");
  const aggregationType = aggregationTypeSetting?.value ?? aggregationTypeSetting?.defaultValue ?? "net";
  
  const chartTypeSetting = settings.find((s) => s.key === "chartType");
  const chartType = chartTypeSetting?.value ?? chartTypeSetting?.defaultValue ?? "bar";
  
  const cardNameSetting = settings.find((s) => s.key === "cardName");
  const cardName = cardNameSetting?.value ?? cardNameSetting?.defaultValue ?? "Time Graph";

  // Debug logging
  console.log("MonthGraph settings debug:", {
    dataSourceValue,
    timeGrouping,
    timeRange,
    aggregationType,
    chartType,
    cardName,
    allSettings: settings.map(s => ({ key: s.key, value: s.value, defaultValue: s.defaultValue }))
  });

  // Helper function to get appropriate default time ranges
  function getDefaultTimeRange(groupBy: string): number {
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

  // Set up selected counter based on data source setting
  useEffect(() => {
    if (!dataSourceValue || !counters || counters.length === 0) {
      setNeedsDataSource(true);
      return;
    }
    const counter = counters.find((c) => c.id == dataSourceValue);
    setSelectedCounter(counter);
    setNeedsDataSource(!counter);
  }, [dataSourceValue, counters]);

  // Fetch historical data for the selected counter
  const userId = additionalHooks?.userId;
  
  // Debug the API call parameters
  console.log("API call parameters:", {
    userId: userId || 0,
    counterId: selectedCounter?.id || 0,
    timeGrouping,
    timeRange,
    enabled: !!selectedCounter && !!userId
  });
  
  const { timeData, isLoading, error } = useCounterTimeAggregatedDataHook(
    userId || 0,
    selectedCounter?.id || 0,
    timeGrouping,
    timeRange,
    !!selectedCounter && !!userId
  );

  // Prepare chart data based on aggregation type
  const chartData = useMemo(() => {
    if (!timeData || timeData.length === 0) return [];

    return timeData.map((data) => {
      let value: number;
      switch (aggregationType) {
        case "total":
          value = data.totalChanges;
          break;
        case "average":
          value = data.averageValue;
          break;
        case "net":
        default:
          value = data.netChange;
          break;
      }

      // Format the period label based on grouping type
      let periodLabel: string;
      if (timeGrouping === "month") {
        periodLabel = new Date(data.period + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
      } else if (timeGrouping === "day") {
        periodLabel = new Date(data.period).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else { // hour
        const hourDate = new Date(data.period + ":00:00.000Z");
        periodLabel = hourDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        });
      }

      return {
        periodLabel,
        value,
        ...data,
      };
    });
  }, [timeData, aggregationType, timeGrouping]);

  // Chart component selection
  const renderChart = () => {
    const chartProps = {
      data: chartData,
    };

    const commonProps = {
      dataKey: "value",
      stroke: "#8884d8",
      fill: "#8884d8",
    };

    switch (chartType) {
      case "line":
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodLabel" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value, getAggregationLabel()]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Line {...commonProps} type="monotone" strokeWidth={2} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodLabel" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value, getAggregationLabel()]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Area {...commonProps} type="monotone" strokeWidth={2} />
          </AreaChart>
        );
      case "bar":
      default:
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodLabel" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value, getAggregationLabel()]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar {...commonProps} />
          </BarChart>
        );
    }
  };

  const getAggregationLabel = () => {
    switch (aggregationType) {
      case "total":
        return "Total Changes";
      case "average":
        return "Average Value";
      case "net":
      default:
        return "Net Change";
    }
  };

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
        <CardContent className="flex justify-center items-center h-64">
          <p>Loading chart data...</p>
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
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-red-600">Error loading data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{cardName}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-gray-600">No data available for the selected time period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{cardName}</CardTitle>
        {selectedCounter && (
          <p className="text-sm text-gray-600">
            {selectedCounter.name} - {getAggregationLabel()} over {timeRange} {timeGrouping}s
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthGraph;