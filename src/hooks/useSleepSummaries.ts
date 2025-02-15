import { useQuery } from "@tanstack/react-query";

const fetchSleepSummaries = async (userId: number) => {
  const response = await fetch(`/api/v1/summaries/sleep?userId=${userId}`);
  if (!response.ok) {
    throw new Error("Error fetching sleep summaries");
  }
  const json = await response.json();
  console.log(json);
  return json.data;
};

export const useSleepSummaries = (userId: number, enabled: boolean) =>
  useQuery({
    queryKey: ["sleepSummaries", userId],
    queryFn: () => fetchSleepSummaries(userId),
    enabled: !!userId && enabled,
  });
