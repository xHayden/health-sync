import React from "react";

import WorkoutChart from "@/components/widgets/WorkoutChart";
import { WidgetTypes, WidgetType } from "@/types/WidgetDataEnums";
import {
  ActivityCalendar,
  ActivityCalendarProps,
} from "@/components/widgets/ActivityCalendar";
import { WorkoutChartProps } from "@/components/widgets/WorkoutChart";

export interface WidgetMeta {
  name: string;
  description: string;
  component: React.ComponentType<any>;
  dummyData: any;
}

const widgetRegistry: Record<WidgetType["value"], WidgetMeta> = {
  [WidgetTypes.WorkoutChart.value]: {
    name: "Workout Chart",
    description: "A chart showing the user's workout history.",
    component: WorkoutChart,
    dummyData: {
      workoutSummaries: [
        {
          date: new Date("2024-01-01"),
          atl: 100,
          ctl: 100,
          userId: 1,
          totalWorkoutTime: 100,
          exerciseTypes: ["strength", "endurance"],
          id: 1,
          user: {
            id: 1,
            email: "test@test.com",
            createdAt: "2024-01-01",
          },
        },
        {
          date: new Date("2024-01-02"),
          atl: 120,
          ctl: 150,
          userId: 1,
          totalWorkoutTime: 100,
          exerciseTypes: ["strength", "endurance"],
          id: 2,
          user: {
            id: 1,
            email: "test@test.com",
            createdAt: "2024-01-01",
          },
        },
        {
          date: new Date("2024-01-03"),
          atl: 190,
          ctl: 200,
          userId: 1,
          totalWorkoutTime: 100,
          exerciseTypes: ["strength", "endurance"],
          id: 3,
          user: {
            id: 1,
            email: "test@test.com",
            createdAt: "2024-01-01",
          },
        },
      ],
    } as WorkoutChartProps,
  },
  [WidgetTypes.ActivityCalendar.value]: {
    name: "Activity Calendar",
    description: "A calendar showing the user's activity history.",
    component: ActivityCalendar,
    dummyData: {
      activityDaysLevels:
        {
          date: new Date("2024-01-01"),
          metGoalDays: [new Date("2024-01-01")],
          exercisedButFailedToMeetGoalDays: [new Date("2024-01-02")],
        } as ActivityCalendarProps,
    },
  },
};

export default widgetRegistry;
