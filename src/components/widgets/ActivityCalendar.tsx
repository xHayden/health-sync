import { Calendar } from "@/components/ui/calendar";

export interface ActivityCalendarProps {
  activityDaysLevels: {
    date: Date;
    metGoalDays: Date[];
    exercisedButFailedToMeetGoalDays: Date[];
  };
}

export function ActivityCalendar({
  activityDaysLevels,
}: ActivityCalendarProps) {
  const metGoalDays =
    activityDaysLevels?.metGoalDays.map((date) => new Date(date)) || [];
  const exercisedButFailedToMeetGoalDays =
    activityDaysLevels?.exercisedButFailedToMeetGoalDays.map(
      (date) => new Date(date)
    ) || [];
  return (
    <div className="rounded-md shadow-sm w-full h-full">
      <Calendar
        mode="default"
        selected={new Date()}
        className="rounded-md shadow-sm w-full h-full"
        modifiers={{
          metGoal: metGoalDays,
          exercisedButFailedToMeetGoal: exercisedButFailedToMeetGoalDays,
        }}
        modifiersStyles={{
          metGoal: {
            // A full circle with a solid background for a met goal
            backgroundColor: "rgba(34, 197, 94, 0.5)", // subtle green
            borderRadius: "100%",
            width: "80%",
            height: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
            color: "white",
            fontWeight: "bold",
          },
          exercisedButFailedToMeetGoal: {
            backgroundColor: "transparent",
            border: "4px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "100%",
            width: "80%",
            height: "80%",
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
            color: "rgba(34, 197, 94, 0.8)",
            fontWeight: "bold",
          },
        }}
      />
    </div>
  );
}
