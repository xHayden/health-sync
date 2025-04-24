import { insertHealthData } from "@/utils/db";
import { calculateAndStoreWorkoutSummaries } from "@/utils/fitnessCalc";
import { ResponseStatus } from "@/utils/requests";
import { NextApiRequest } from "next/types";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("JSON Parsing Error:", err);
    return ResponseStatus(false, "/api/v1/sync/summaries", 400, "Invalid JSON format");
  }
  
  const { id } = body;
  if (!id) {
    return ResponseStatus(false, "/api/v1/sync/summaries", 400, "Missing 'id' in request body");
  }

  try {
    await calculateAndStoreWorkoutSummaries(id);
    // await calculateAndStoreSleepSummaries(id);
  } catch (e) {
    console.error("Error in calculateAndStoreSummaries:", e);
    return ResponseStatus(false, "/api/v1/sync/summaries", 500, "Unable to insert workout and sleep summaries");
  }

  return ResponseStatus(true, "/api/v1/sync/fitness");
}