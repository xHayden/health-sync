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
import { MonthlyCounterData, useCounterHistoryData } from "@/hooks/useCounterHistory";
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
  counterHistory: MonthlyCounterData[];
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

  // Get settings values
  const dataSourceValue = settings.find((s) => s.key === "dataSource")?.value;
  const dateRange = Number(settings.find((s) => s.key === "dateRange")?.value) || 12;
  const aggregationType = settings.find((s) => s.key === "aggregationType")?.value || "net";
  const chartType = settings.find((s) => s.key === "chartType")?.value || "bar";
  const cardName = settings.find((s) => s.key === "cardName")?.value || "Month Graph";

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
  const { monthlyData, isLoading, error } = useCounterHistoryData(
    userId || 0,
    selectedCounter?.id || 0,
    dateRange,
    !!selectedCounter && !!userId
  );

  // Prepare chart data based on aggregation type
  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];

    return monthlyData.map((data) => {
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

      return {
        monthLabel: new Date(data.month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value,
        ...data,
      };
    });
  }, [monthlyData, aggregationType]);

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
            <XAxis dataKey="monthLabel" />
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
            <XAxis dataKey="monthLabel" />
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
            <XAxis dataKey="monthLabel" />
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
            {selectedCounter.name} - {getAggregationLabel()} over {dateRange} months
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