/**
 * Widget Registry Module
 *
 * This module consolidates widget metadata, settings, required data, and components.
 *
 * To add a new widget:
 * 1. If your widget requires a new type of meta data, add a new key to the WidgetMetaDataTypes enum.
 * 2. Create your widget's React component (if it doesn't exist yet).
 * 3. Define the widget's dummy data to match the component's expected props.
 * 4. Specify any widget settings that allow customization (using WidgetSetting types).
 * 5. Add a new entry in the widgetRegistry with a unique key that includes all the above.
 */
import React from "react";
import WorkoutChart, { WorkoutChartProps } from "@/components/widgets/WorkoutChart";
import { ActivityCalendar } from "@/components/widgets/ActivityCalendar";
import Counter, { CounterProps } from "@/components/widgets/Counter";
import MonthGraph, { MonthGraphProps } from "@/components/widgets/MonthGraph";
import TimeValue from "@/components/widgets/TimeValue";
import { DailyWorkoutSummary } from "@prisma/client";

/**
 * Enum listing the different types of meta data that widgets may require.
 *
 * If a new type of data is needed for widgets, add a new entry here.
 * 
 * These have to match the keys in the data object in [Widget Name].tsx.
 */
export enum WidgetMetaDataTypes {
  WorkoutSummaries = "workoutSummaries",
  SleepSummaries = "sleepSummaries",
  ActivityDaysLevels = "activityDaysLevels",
  Counters = "counters",
  CounterHistory = "counterHistory"
}

// -------------------
// Widget Settings Types
// -------------------

export type SettingType = "number" | "text" | "boolean" | "select" | "color" | "dropdown";

/**
 * Base interface for a widget setting.
 *
 * When adding settings to a widget, use this structure to ensure consistency.
 */
export interface WidgetSettingBase<T> {
  key: string;
  label: string;
  type: SettingType;
  defaultValue?: T;
  value?: T;
  description?: string;
  source?: string; // for dropdowns
}

/**
 * Interface for select-type widget settings.
 */
export interface SelectWidgetSetting extends WidgetSettingBase<string> {
  type: "select";
  options: { label: string; value: string }[];
}

export type WidgetSetting =
  | WidgetSettingBase<number>
  | WidgetSettingBase<string>
  | WidgetSettingBase<boolean>
  | SelectWidgetSetting;

// -------------------
// Widget Metadata Interface
// -------------------

/**
 * WidgetMeta defines the metadata structure for a widget.
 *
 * When adding a new widget:
 * - Provide a human-readable name and description.
 * - Supply the React component that renders the widget.
 * - Define dummyData that matches the widget's expected props (for previews or defaults).
 * - List any customizable settings.
 * - Specify the required data keys from WidgetMetaDataTypes.
 */
export interface WidgetMeta<
  TData extends Partial<Record<WidgetMetaDataTypes, unknown>> = {}
> {
  name: string;
  description: string;
  component: React.ComponentType<any>;
  dummyData: TData;
  settings: WidgetSetting[];
  /** List of required data keys for this widget. */
  requiredData: WidgetMetaDataTypes[];
}

// -------------------
// Widget Registry
// -------------------

/**
 * Define literal types for widget keys.
 *
 * When adding a new widget, add its unique key to this type union.
 */
export type WidgetValue = "workoutChart" | "activityCalendar" | "counter" | "monthGraph" | "timeValue";

/**
 * The widgetRegistry maps widget keys to their corresponding metadata.
 *
 * To add a new widget:
 * 1. Choose a unique key (e.g., "newWidget").
 * 2. Import or create the React component for your widget.
 * 3. Define dummyData that simulates real data for preview purposes.
 * 4. Add any widget settings using the WidgetSetting types.
 * 5. List any required data keys in the requiredData array.
 */
const widgetRegistry: Record<WidgetValue, WidgetMeta<any>> = {
  workoutChart: {
    name: "Workout Chart",
    description: "A chart showing the user's workout history.",
    component: WorkoutChart, // React component for WorkoutChart
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
    settings: [
      {
        key: "showGrid",
        label: "Show Grid",
        type: "boolean",
        defaultValue: true,
        description: "Display grid lines on the workout chart.",
      },
      {
        key: "chartColor",
        label: "Chart Color",
        type: "color",
        defaultValue: "#ff5733",
        description: "The primary color for the chart line.",
      },
      {
        key: "lineThickness",
        label: "Line Thickness",
        type: "number",
        defaultValue: 2,
        description: "The thickness of the chart line.",
      },
    ],
    requiredData: [WidgetMetaDataTypes.WorkoutSummaries],
  },
  activityCalendar: {
    name: "Activity Calendar",
    description: "A calendar showing the user's activity history.",
    component: ActivityCalendar, // React component for ActivityCalendar
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
      ] as DailyWorkoutSummary[],
    },
    settings: [
      {
        key: "dailyWorkoutGoal",
        label: "Daily Workout Goal",
        type: "number",
        defaultValue: 60,
        description: "The daily goal of minutes of exercise.",
      },
      {
        key: "metGoalColor",
        label: "Met Goal Color",
        type: "color",
        defaultValue: "#00FF00",
        description: "The color of the day that met the goal.",
      },
      {
        key: "failedToMeetGoalColor",
        label: "Failed to Meet Goal Color",
        type: "color",
        defaultValue: "#FF0000",
        description: "The color of the day that failed to meet the goal.",
      },
      {
        key: "countNoExerciseAsFailedToMeetGoal",
        label: "Count No Exercise as Failed to Meet Goal",
        type: "boolean",
        defaultValue: true,
        description: "Count days with no exercise as failed to meet the goal.",
      },
    ],
    requiredData: [WidgetMetaDataTypes.WorkoutSummaries],
  },
  counter: {
    name: "Counter",
    description: "A simple increment/decrement/reset counter.",
    component: Counter,
    dummyData: {
    },
    settings: [
      {
        key: "cardName",
        label: "Counter Name",
        type: "text",
        defaultValue: "",
        description: "Name for the counter.",
      },
      {
        key: "dataSource",
        type: "dropdown",
        label: "Counter Data Source",
        description: "Counter Data Source",
        source: "counters"
      }
    ],
    requiredData: [
      WidgetMetaDataTypes.Counters // todo, store this separately from widget data to allow as datasource
    ],
  },
  monthGraph: {
    name: "Time Graph",
    description: "A chart showing counter data aggregated by time periods (months, days, or hours).",
    component: MonthGraph,
    dummyData: {
      counterHistory: [
        {
          month: "2024-01",
          totalChanges: 45,
          netChange: 10,
          startValue: 50,
          endValue: 60,
          changeCount: 15,
          averageValue: 55,
        },
        {
          month: "2024-02",
          totalChanges: 38,
          netChange: -5,
          startValue: 60,
          endValue: 55,
          changeCount: 12,
          averageValue: 58,
        },
        {
          month: "2024-03",
          totalChanges: 52,
          netChange: 15,
          startValue: 55,
          endValue: 70,
          changeCount: 18,
          averageValue: 62,
        },
      ],
    } as MonthGraphProps,
    settings: [
      {
        key: "cardName",
        label: "Widget Name",
        type: "text",
        defaultValue: "Time Graph",
        description: "Name for the time graph widget.",
      },
      {
        key: "dataSource",
        type: "dropdown",
        label: "Counter Data Source",
        description: "Counter to display historical data for",
        source: "counters"
      },
      {
        key: "timeGrouping",
        label: "Time Grouping",
        type: "select",
        options: [
          { label: "By Month", value: "month" },
          { label: "By Day", value: "day" },
          { label: "By Hour", value: "hour" }
        ],
        defaultValue: "month",
        description: "How to group the counter data over time"
      },
      {
        key: "timeRange",
        label: "Time Range",
        type: "number",
        defaultValue: 12,
        description: "Number of time periods to display (will auto-adjust based on grouping)"
      },
      {
        key: "aggregationType",
        label: "Aggregation Type",
        type: "select",
        options: [
          { label: "Net Change", value: "net" },
          { label: "Total Changes", value: "total" },
          { label: "Average Value", value: "average" }
        ],
        defaultValue: "net",
        description: "How to aggregate counter data for each month"
      },
      {
        key: "chartType",
        label: "Chart Type",
        type: "select",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
          { label: "Area Chart", value: "area" }
        ],
        defaultValue: "bar",
        description: "Visual style of the chart"
      }
    ],
    requiredData: [
      WidgetMetaDataTypes.Counters,
      WidgetMetaDataTypes.CounterHistory
    ],
  },
  timeValue: {
    name: "Time Value",
    description: "Displays an aggregated counter value over a selected time range.",
    component: TimeValue,
    dummyData: {
    },
    settings: [
      {
        key: "cardName",
        label: "Widget Name",
        type: "text",
        defaultValue: "Time Value",
        description: "Name for the time value widget.",
      },
      {
        key: "dataSource",
        type: "dropdown",
        label: "Counter Data Source",
        description: "Counter to aggregate over",
        source: "counters"
      },
      {
        key: "timeGrouping",
        label: "Time Grouping",
        type: "select",
        options: [
          { label: "By Month", value: "month" },
          { label: "By Day", value: "day" },
          { label: "By Hour", value: "hour" }
        ],
        defaultValue: "month",
        description: "Pick which single latest period to display"
      }
    ],
    requiredData: [
      WidgetMetaDataTypes.Counters
    ],
  },
  // To add a new widget, follow the pattern below:
  // newWidgetKey: {
  //   name: "New Widget Name",
  //   description: "Description of the new widget.",
  //   component: YourNewWidgetComponent, // Import or define your new widget component at the top.
  //   dummyData: {
  //     // Provide dummy data that matches the component's expected props.
  //   },
  //   settings: [
  //     // Define any widget settings here using WidgetSetting types.
  //   ],
  //   requiredData: [
  //     // List any required meta data keys (from WidgetMetaDataTypes) that your widget depends on.
  //   ],
  // },
};

export interface Dropdown {
  key: string,
  items: DropdownItem[],
  disabled?: boolean,
  selected?: string
}

export interface DropdownItem {
  key: string,
  value: string,
  callback: any
}

export type WidgetRegistry = typeof widgetRegistry;
export default widgetRegistry;
