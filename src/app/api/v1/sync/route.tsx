import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';
import { insertHealthData } from "@/utils/db";
import { ResponseStatus } from "@/utils/requests";
import { decode } from '@msgpack/msgpack';
import { headers } from "next/headers";
import { HistoricalHealthData } from '@/types/HealthData';

export async function POST(req: NextRequest) {
  const authenticated = req.headers.get("x-user-owns-resource") === "true";
  try {
    const headersList = await headers();
    const contentEncoding = headersList.get("content-encoding");
    let bodyBuffer = Buffer.from(await req.arrayBuffer());

    // If Brotli encoded (MessagePack + Brotli)
    if (contentEncoding === "br") {
      bodyBuffer = zlib.brotliDecompressSync(bodyBuffer as unknown as ArrayBuffer);
      
      // Decoding MessagePack
      const bodyObj = decode(bodyBuffer); // This returns a JS object structure
      try {
        await insertHealthData(bodyObj as HistoricalHealthData);
        console.log("Returnung 200 from /api/v1/sync");
        return NextResponse.json(ResponseStatus(true, "/api/v1/sync"), { status: 200 });
      } catch (dbError) {
        console.error("Database error in sync route (brotli):", dbError);
        return NextResponse.json(
          ResponseStatus(false, "/api/v1/sync", 500, "Database error"),
          { status: 500 }
        );
      }
    }

    if (contentEncoding === "deflate" || contentEncoding === "zlib") {
      bodyBuffer = zlib.inflateRawSync(bodyBuffer as unknown as ArrayBuffer);
    }

    if (contentEncoding === "gzip") {
      bodyBuffer = zlib.gunzipSync(bodyBuffer as unknown as ArrayBuffer);
    }

    // If none of the above matched and you got here, assume it's JSON or return an error
    try {
      const jsonBody = JSON.parse(bodyBuffer.toString("utf-8"));
      try {
        await insertHealthData(jsonBody, true); // DISABLED FOR TESTING
        return NextResponse.json(ResponseStatus(true, "/api/v1/sync"), { status: 200 });
      } catch (dbError) {
        console.error("Database error in sync route (json):", dbError);
        return NextResponse.json(
          ResponseStatus(false, "/api/v1/sync", 500, "Database error"),
          { status: 500 }
        );
      }
    } catch (e) {
      console.error("JSON parsing error in sync route:", e);
      console.error("Request headers:", Object.fromEntries(req.headers.entries()));
      console.error("Content encoding:", contentEncoding);
      return NextResponse.json(
        ResponseStatus(false, "/api/v1/sync", 400, "Invalid JSON after decompression"),
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("Sync route error:", e);
    console.error("Request method:", req.method);
    console.error("Request headers:", Object.fromEntries(req.headers.entries()));
    console.error("Request URL:", req.url);
    return NextResponse.json(
      ResponseStatus(false, "/api/v1/sync", 500, "Internal Server Error"),
      { status: 500 }
    );
  }
}
