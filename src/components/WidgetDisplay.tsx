import React from "react";
import widgetRegistry, {
  WidgetMetaDataTypes,
  WidgetValue,
} from "@/lib/widgetRegistry";
import { Widget } from "@/types/WidgetData";
import { useWorkoutSummaries } from "@/hooks/useWorkoutSummaries";
import { useSleepSummaries } from "@/hooks/useSleepSummaries";
import { DBDailyWorkoutSummary } from "@/types/HealthData";
import { Session } from "next-auth";

interface WidgetDisplayProps {
  widget: Widget;
  user: Session["user"];
}

export default function WidgetDisplay({ widget, user }: WidgetDisplayProps) {
  // Look up the meta info and the actual component from the registry.
  if (!widget.type || !widgetRegistry[widget.type as WidgetValue]) {
    return <div>No widget type</div>;
  }
  const widgetMeta = widgetRegistry[widget.type as WidgetValue];
  const WidgetComponent = widgetMeta.component;

  // Determine if a required data type is missing.
  const needsWorkoutData =
    widgetMeta.requiredData.includes(WidgetMetaDataTypes.WorkoutSummaries) &&
    (widget.data[WidgetMetaDataTypes.WorkoutSummaries] === null || widget.data[WidgetMetaDataTypes.WorkoutSummaries] === undefined);
  const needsSleepData =
    widgetMeta.requiredData.includes(WidgetMetaDataTypes.SleepSummaries) &&
    (widget.data[WidgetMetaDataTypes.SleepSummaries] === null || widget.data[WidgetMetaDataTypes.SleepSummaries] === undefined);
  const needsActivityDaysLevelsData =
    widgetMeta.requiredData.includes(WidgetMetaDataTypes.ActivityDaysLevels) &&
    (widget.data[WidgetMetaDataTypes.ActivityDaysLevels] === null || widget.data[WidgetMetaDataTypes.ActivityDaysLevels] === undefined);

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
      dataProps[WidgetMetaDataTypes.WorkoutSummaries] = workoutData;
    } else {
      console.error("Workout data is not an array.");
    }
  }
  if (needsSleepData && sleepData) {
    dataProps[WidgetMetaDataTypes.SleepSummaries] = sleepData;
  }
  if (needsActivityDaysLevelsData && workoutData) {
    const activityData = {
      metGoalDays: workoutData.map((workout: DBDailyWorkoutSummary) => {
        if (workout.date && workout.totalWorkoutTime > 60) {
          return workout.date;
        }
        return null;
      }),
      exercisedButFailedToMeetGoalDays: workoutData.map(
        (workout: DBDailyWorkoutSummary) => {
          if (
            workout.date &&
            workout.totalWorkoutTime <= 60 &&
            workout.totalWorkoutTime > 0
          ) {
            return workout.date;
          }
          return null;
        }
      ),
    };
    dataProps[WidgetMetaDataTypes.ActivityDaysLevels] = activityData;
  }

  // Render the widget’s component with the merged data props.
  return <WidgetComponent {...dataProps} widgetType={widget.type} settings={widget.settings} />;
}
