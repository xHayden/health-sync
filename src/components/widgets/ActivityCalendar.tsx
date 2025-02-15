import { Calendar } from "@/components/ui/calendar";

export interface ActivityCalendarProps {
  activityDaysLevels: {
    date: Date;
    metGoalDays: Date[],
    exercisedButFailedToMeetGoalDays: Date[]
  }
}

export function ActivityCalendar({
  activityDaysLevels,
}: ActivityCalendarProps) {
  const metGoalDays = activityDaysLevels?.metGoalDays.map((date) => new Date(date)) || [];
  const exercisedButFailedToMeetGoalDays = activityDaysLevels?.exercisedButFailedToMeetGoalDays.map((date) => new Date(date)) || [];
  return (
    <Calendar
      mode="single"
      selected={new Date()}
      className="rounded-md border shadow-sm w-max"
      modifiers={{
        metGoal: metGoalDays,
        exercisedButFailedToMeetGoal: exercisedButFailedToMeetGoalDays,
      }}
      modifiersStyles={{
        metGoal: {
          backgroundColor: "green",
        },
        exercisedButFailedToMeetGoal: {
          backgroundColor: "red",
        },
      }}
    />
  );
}
