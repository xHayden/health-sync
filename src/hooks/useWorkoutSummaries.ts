import { useQuery } from "@tanstack/react-query";

const fetchWorkoutSummaries = async (userId: number) => {
  const response = await fetch(`/api/v1/summaries/workout?userId=${userId}`);
  if (!response.ok) {
    throw new Error("Error fetching workout summaries");
  }
  const json = await response.json();
  if (json.data) {
    return json.data;
  } else {
    // TODO: handle this
    return [];
  }
};

export const useWorkoutSummaries = (userId: number, enabled: boolean) =>
  useQuery({
    queryKey: ["workoutSummaries", userId],
    queryFn: () => fetchWorkoutSummaries(userId),
    enabled: !!userId && enabled,
  });
