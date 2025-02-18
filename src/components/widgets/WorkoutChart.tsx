"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Customized,
} from "recharts";
import { Slider } from "@/components/ui/slider"; // adjust the import path as needed
import { DBDailyWorkoutSummary } from "@/types/HealthData";

// --- CustomFill ---
// This component draws custom filled segments (polygons) between the CTL and ATL lines.
// It divides each line segment and, if the two lines cross between two data points,
// it calculates the intersection and splits the segment so that each piece is colored
// red (if ATL > CTL) or green (if ATL < CTL).
const CustomFill = (props: any) => {
  const { xAxisMap, yAxisMap, data } = props;
  if (!data || data.length === 0) return null;

  // Get the first x and y axis objects (Recharts provides these in the props)
  const xAxis: any = Object.values(xAxisMap)[0];
  const yAxis: any = Object.values(yAxisMap)[0];

  const segments: Array<{
    points: { x: number; y: number }[];
    fill: string;
  }> = [];

  for (let i = 0; i < data.length - 1; i++) {
    const d0 = data[i].atl - data[i].ctl;
    const d1 = data[i + 1].atl - data[i + 1].ctl;

    const x0 = xAxis.scale(data[i].date);
    const x1 = xAxis.scale(data[i + 1].date);
    const yCtl0 = yAxis.scale(data[i].ctl);
    const yCtl1 = yAxis.scale(data[i + 1].ctl);
    const yAtl0 = yAxis.scale(data[i].atl);
    const yAtl1 = yAxis.scale(data[i + 1].atl);

    // If the difference has the same sign on both ends,
    // draw one polygon covering the entire segment.
    if (d0 * d1 >= 0) {
      const fillColor = d0 >= 0 ? "#ef4444" : "#22c55e"; // red if ATL > CTL, green otherwise
      segments.push({
        points: [
          { x: x0, y: yCtl0 },
          { x: x1, y: yCtl1 },
          { x: x1, y: yAtl1 },
          { x: x0, y: yAtl0 },
        ],
        fill: fillColor,
      });
    } else {
      // The lines cross between these two points.
      // Compute the fractional t at which the difference equals zero.
      const t = d0 / (d0 - d1);
      const xInt = x0 + t * (x1 - x0);
      const yCtlInt = yCtl0 + t * (yCtl1 - yCtl0);
      const yAtlInt = yAtl0 + t * (yAtl1 - yAtl0); // should equal yCtlInt ideally

      // First segment: from point i to the intersection
      const fillColor1 = d0 >= 0 ? "#ef4444" : "#22c55e";
      segments.push({
        points: [
          { x: x0, y: yCtl0 },
          { x: xInt, y: yCtlInt },
          { x: xInt, y: yAtlInt },
          { x: x0, y: yAtl0 },
        ],
        fill: fillColor1,
      });
      // Second segment: from the intersection to point i+1
      const fillColor2 = d1 >= 0 ? "#ef4444" : "#22c55e";
      segments.push({
        points: [
          { x: xInt, y: yCtlInt },
          { x: x1, y: yCtl1 },
          { x: x1, y: yAtl1 },
          { x: xInt, y: yAtlInt },
        ],
        fill: fillColor2,
      });
    }
  }

  return (
    <g>
      {segments.map((seg, index) => {
        const d =
          `M${seg.points[0].x},${seg.points[0].y} ` +
          `L${seg.points[1].x},${seg.points[1].y} ` +
          `L${seg.points[2].x},${seg.points[2].y} ` +
          `L${seg.points[3].x},${seg.points[3].y} Z`;
        return (
          <path
            key={index}
            d={d}
            fill={seg.fill}
            fillOpacity={0.3}
            stroke="none"
          />
        );
      })}
    </g>
  );
};

export interface WorkoutChartProps {
  workoutSummaries: DBDailyWorkoutSummary[];
}

const WorkoutChart: React.FC<WorkoutChartProps> = ({ workoutSummaries }) => {
  // Manage the slider state (days to show)
  const [days, setDays] = useState(30);
  // console.log("Rendering WorkoutChart");

  // Filter data to show only the last `days` worth of entries.
  const filteredData = useMemo(() => {
    if (!workoutSummaries) return [];
    // Assumes data is sorted by date ascending.
    let data = workoutSummaries.slice(-days).map((summary) => ({
      date: summary.date,
      atl: summary.atl,
      ctl: summary.ctl,
    }));
    return data;
  }, [workoutSummaries, days]);

  // Handler for the slider. (ShadCN's slider typically returns an array.)
  const handleSliderChange = (value: number[]) => {
    setDays(value[0]);
  };

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width={"100%"} height={"100%"}>
        <LineChart
          data={filteredData}
          margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          {/* Draw the custom fill between the CTL and ATL lines */}
          <Customized component={<CustomFill data={filteredData} />} />
          <Line type="monotone" dataKey="ctl" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="atl" stroke="#60a5fa" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="">
        <p className="text-sm mb-1">Showing last {days} days</p>
        <Slider
          value={[days]}
          min={1}
          max={365}
          onValueChange={handleSliderChange}
        />
      </div>
    </div>
  );
};

export default WorkoutChart;
