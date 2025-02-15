export enum DataTypes {
  WorkoutSummaries = "workoutSummaries",
  SleepSummaries = "sleepSummaries",
  ActivityDaysLevels = "activityDaysLevels",
}

export const WidgetTypes = {
  WorkoutChart: {
    value: "workoutChart",
    requiredData: [DataTypes.WorkoutSummaries],
  },
  ActivityCalendar: {
    value: "activityCalendar",
    requiredData: [DataTypes.ActivityDaysLevels],
  },
} as const;

export type WidgetType = (typeof WidgetTypes)[keyof typeof WidgetTypes];