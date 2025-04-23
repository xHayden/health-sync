import React from "react";
import widgetRegistry, {
  WidgetMetaDataTypes,
  WidgetValue,
} from "@/lib/widgetRegistry";
import { Widget } from "@/types/WidgetData";
import { useWorkoutSummaries } from "@/hooks/useWorkoutSummaries";
import { useSleepSummaries } from "@/hooks/useSleepSummaries";
import { useCounters } from "@/hooks/useCounters";
import { Session } from "next-auth";
import { UseMutationResult } from "@tanstack/react-query";
import { Counter, DailyWorkoutSummary } from "@prisma/client";

interface WidgetDisplayProps {
  widget: Widget;
  user: Session["user"];
}

export default function WidgetDisplay({ widget, user }: WidgetDisplayProps) {
  const widgetMeta = widgetRegistry[widget.type as WidgetValue];
  const WidgetComponent = widgetMeta?.component;

  const required = widgetMeta?.requiredData ?? [];
  const needsWorkoutData =
    required.includes(WidgetMetaDataTypes.WorkoutSummaries) &&
    widget.data[WidgetMetaDataTypes.WorkoutSummaries] == null;
  const needsSleepData =
    required.includes(WidgetMetaDataTypes.SleepSummaries) &&
    widget.data[WidgetMetaDataTypes.SleepSummaries] == null;
  const needsActivityDaysLevelsData =
    required.includes(WidgetMetaDataTypes.ActivityDaysLevels) &&
    widget.data[WidgetMetaDataTypes.ActivityDaysLevels] == null;
  const needsCounterData =
    required.includes(WidgetMetaDataTypes.Counters) &&
    widget.data[WidgetMetaDataTypes.Counters] == null;

  const {
    data: workoutData,
    isLoading: isLoadingWorkout,
    error: workoutError,
  } = useWorkoutSummaries(user.id, needsWorkoutData || needsActivityDaysLevelsData);

  const {
    data: sleepData,
    isLoading: isLoadingSleep,
    error: sleepError,
  } = useSleepSummaries(user.id, needsSleepData);

  const {
    data: counterData,
    isLoading: isLoadingCounters,
    error: counterError,
    updateCounter,
  } = useCounters(user.id, needsCounterData);

  if (!widgetMeta) {
    return <div>No widget type</div>;
  }

  if (workoutError || sleepError || counterError) {
    return <div>Error loading widget data.</div>;
  }

  if (
    (needsWorkoutData && isLoadingWorkout) ||
    (needsSleepData && isLoadingSleep) ||
    (needsCounterData && isLoadingCounters)
  ) {
    return <div>Loading...</div>;
  }

  const dataProps = { ...widget.data };

  if (needsWorkoutData && Array.isArray(workoutData)) {
    dataProps[WidgetMetaDataTypes.WorkoutSummaries] = workoutData;
  }
  if (needsSleepData && sleepData) {
    dataProps[WidgetMetaDataTypes.SleepSummaries] = sleepData;
  }
  if (needsCounterData && counterData) {
    dataProps[WidgetMetaDataTypes.Counters] = counterData;
  }
  if (needsActivityDaysLevelsData && workoutData) {
    dataProps[WidgetMetaDataTypes.ActivityDaysLevels] = {
      metGoalDays: workoutData
        .map((w: DailyWorkoutSummary) =>
          w.totalWorkoutTime > 60 ? w.date : null
        )
        .filter(Boolean),
      exercisedButFailedToMeetGoalDays: workoutData
        .map((w: DailyWorkoutSummary) =>
          w.totalWorkoutTime > 0 && w.totalWorkoutTime <= 60 ? w.date : null
        )
        .filter(Boolean),
    };
  }

  // 6) Finally render
  return (
    <WidgetComponent
      widgetMeta={widgetMeta}
      widgetId={widget.id}
      widgetType={widget.type}
      {...dataProps}
      settings={widget.settings}
      additionalHooks={{ updateCounter } as AdditionalHooks}
    />
  );
}

export interface AdditionalHooks {
  updateCounter: UseMutationResult<Counter, Error, {
    id: number;
} & Partial<Omit<Counter, "id">>, unknown>
}