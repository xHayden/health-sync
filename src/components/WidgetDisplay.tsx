import React from "react";
import { DataTypes } from "@/types/WidgetDataEnums";
import widgetRegistry from "@/lib/widgetRegistry";
import { Widget } from "@/types/WidgetData";
import { useWorkoutSummaries } from "@/hooks/useWorkoutSummaries";
import { useSleepSummaries } from "@/hooks/useSleepSummaries";
import { ActivityCalendarProps } from "./widgets/ActivityCalendar";
import { DBDailyWorkoutSummary } from "@/types/HealthData";
import { Session } from "next-auth";

interface WidgetDisplayProps {
  widget: Widget;
  user: Session["user"];
}

export default function WidgetDisplay({ widget, user }: WidgetDisplayProps) {
  // Look up the meta info and the actual component from the registry.
  const widgetMeta = widgetRegistry[widget.type.value];
  const WidgetComponent = widgetMeta.component;

  // Determine if a required data type is missing.
  const needsWorkoutData =
    widget.requiredData.includes(DataTypes.WorkoutSummaries) &&
    widget.data[DataTypes.WorkoutSummaries] === null;
  const needsSleepData =
    widget.requiredData.includes(DataTypes.SleepSummaries) &&
    widget.data[DataTypes.SleepSummaries] === null;
  const needsActivityDaysLevelsData =
    widget.requiredData.includes(DataTypes.ActivityDaysLevels) &&
    widget.data[DataTypes.ActivityDaysLevels] === null;

  // Conditionally fetch missing data.
  const {
    data: workoutData,
    isLoading: isLoadingWorkout,
    error: workoutError,
  } = useWorkoutSummaries(
    user.id,
    needsWorkoutData || needsActivityDaysLevelsData
  );

  const {
    data: sleepData,
    isLoading: isLoadingSleep,
    error: sleepError,
  } = useSleepSummaries(user.id, needsSleepData);

  // Optionally handle errors.
  if (workoutError || sleepError) {
    return <div>Error loading widget data.</div>;
  }

  // While any required data is loading, show a loading indicator.
  if (
    (needsWorkoutData && isLoadingWorkout) ||
    (needsSleepData && isLoadingSleep)
  ) {
    return <div>Loading...</div>;
  }

  // Prepare the data props for the widget component.
  // Start with the existing widget.data.
  const dataProps = { ...widget.data };

  // Overwrite any missing data with fetched data.
  if (needsWorkoutData && workoutData) {
    if (Array.isArray(workoutData)) {
      dataProps[DataTypes.WorkoutSummaries] = workoutData;
    } else {
      console.error("Workout data is not an array.");
    }
  }
  if (needsSleepData && sleepData) {
    dataProps[DataTypes.SleepSummaries] = sleepData;
  }
  if (needsActivityDaysLevelsData && workoutData) {
    const activityData = {
      metGoalDays: workoutData.map(
        (workout: DBDailyWorkoutSummary) => {
          if (workout.date && workout.totalWorkoutTime > 60) {
            return workout.date;
          }
          return null;
        }
      ),
      exercisedButFailedToMeetGoalDays: workoutData.map(
        (workout: DBDailyWorkoutSummary) => {
          if (workout.date && workout.totalWorkoutTime <= 60 && workout.totalWorkoutTime > 0) {
            return workout.date;
          }
          return null;
        }
      ),
    };
    // console.log(activityData);
    dataProps[DataTypes.ActivityDaysLevels] = activityData;
  }

  // Render the widget’s component with the merged data props.
  return <WidgetComponent {...dataProps} />;
}
