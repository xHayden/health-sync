import React, { useEffect, useMemo, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { WidgetSetting, WidgetValue } from "@/lib/widgetRegistry";
import { DBDailyWorkoutSummary } from "@/types/HealthData";
import { Property } from "csstype";

export interface ActivityCalendarProps {
  workoutSummaries: DBDailyWorkoutSummary[];
  widgetType: WidgetValue;
  settings: WidgetSetting[];
}

export function ActivityCalendar({
  workoutSummaries,
  widgetType,
  settings,
}: ActivityCalendarProps) {
  // Memoize extraction of setting values
  const dailyWorkoutGoal = useMemo(() => {
    return (
      Number(
        settings.find((setting) => setting.key === "dailyWorkoutGoal")?.value
      ) || 60
    );
  }, [settings]);

  const metGoalColor = useMemo(() => {
    return (
      settings.find((setting) => setting.key === "metGoalColor")?.value ??
      "#00FF00"
    );
  }, [settings]);

  const failedToMeetGoalColor = useMemo(() => {
    return (
      settings.find((setting) => setting.key === "failedToMeetGoalColor")
        ?.value ?? "#FF0000"
    );
  }, [settings]);

  const countNoExerciseAsFailedToMeetGoal = useMemo(() => {
    return (
      settings.find(
        (setting) => setting.key === "countNoExerciseAsFailedToMeetGoal"
      )?.value ?? true
    );
  }, [settings]);

  // Memoize the workout days calculations based on dependencies
  const metGoalDays = useMemo(() => {
    return workoutSummaries
      .filter((workout) => workout.totalWorkoutTime >= dailyWorkoutGoal)
      .map((workout) => new Date(workout.date));
  }, [workoutSummaries, dailyWorkoutGoal]);

  const exercisedButFailedToMeetGoalDays = useMemo(() => {
    return workoutSummaries
      .filter((workout) => {
        if (countNoExerciseAsFailedToMeetGoal) {
          return workout.totalWorkoutTime < dailyWorkoutGoal;
        }
        return (
          workout.totalWorkoutTime > 0 &&
          workout.totalWorkoutTime < dailyWorkoutGoal
        );
      })
      .map((workout) => new Date(workout.date));
  }, [workoutSummaries, dailyWorkoutGoal, countNoExerciseAsFailedToMeetGoal]);

  if (!settings) {
    return <div>No settings</div>;
  }

  return (
    <div className="rounded-md shadow-sm w-full h-full">
      <Calendar
        mode="default"
        selected={new Date()}
        className="rounded-md shadow-sm w-full h-full bg-transparent"
        modifiers={{
          metGoal: metGoalDays,
          exercisedButFailedToMeetGoal: exercisedButFailedToMeetGoalDays,
        }}
        modifiersStyles={{
          metGoal: {
            color: metGoalColor as Property.BackgroundColor,
            borderRadius: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
            fontWeight: "bold",
          },
          exercisedButFailedToMeetGoal: {
            borderRadius: "100%",
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
            color: failedToMeetGoalColor as Property.Color,
            fontWeight: "bold",
          },
        }}
      />
    </div>
  );
}
