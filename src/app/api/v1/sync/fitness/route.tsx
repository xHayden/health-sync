import { insertHealthData } from "@/utils/db";
import { calculateAndStoreFitnessMetrics } from "@/utils/fitnessCalc";
import { ResponseStatus } from "@/utils/requests";
import { NextApiRequest } from "next/types";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("JSON Parsing Error:", err);
    return ResponseStatus(false, "/api/v1/sync/fitness", 400, "Invalid JSON format");
  }
  
  const { id } = body;
  if (!id) {
    return ResponseStatus(false, "/api/v1/sync/fitness", 400, "Missing 'id' in request body");
  }

  console.log(id, "test");

  try {
    await calculateAndStoreFitnessMetrics(id);
  } catch (e) {
    console.error("Error in calculateAndStoreFitnessMetrics:", e);
    return ResponseStatus(false, "/api/v1/sync/fitness", 500, "Unable to insert health data");
  }

  return ResponseStatus(true, "/api/v1/sync/fitness");
}