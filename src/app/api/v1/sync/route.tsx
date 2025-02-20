import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';
import { insertHealthData } from "@/utils/db";
import { ResponseStatus } from "@/utils/requests";
import { decode } from '@msgpack/msgpack';
import { headers } from "next/headers";
import { NextApiRequest } from 'next';
import { HistoricalHealthData } from '@/types/HealthData';

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const contentEncoding = headersList.get("content-encoding");
    let bodyBuffer = Buffer.from(await req.arrayBuffer());

    // If Brotli encoded (MessagePack + Brotli)
    if (contentEncoding === "br") {
      bodyBuffer = zlib.brotliDecompressSync(bodyBuffer as unknown as ArrayBuffer);
      
      // Now decode MessagePack
      const bodyObj = decode(bodyBuffer); // This returns a JS object structure
      
      await insertHealthData(bodyObj as HistoricalHealthData);

      return NextResponse.json(ResponseStatus(true, "/api/v1/sync"), { status: 200 });
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
      await insertHealthData(jsonBody);
      return NextResponse.json(ResponseStatus(true, "/api/v1/sync"), { status: 200 });
    } catch (e) {
      return NextResponse.json(
        ResponseStatus(false, "/api/v1/sync", 400, "Invalid JSON after decompression"),
        { status: 400 }
      );
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      ResponseStatus(false, "/api/v1/sync", 500, "Internal Server Error"),
      { status: 500 }
    );
  }
}
