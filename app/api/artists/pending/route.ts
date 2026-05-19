import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET: 承認待ちアーティスト一覧
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get("key");

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    }

    const pending = await redis.get<any[]>("artists:pending") || [];
    return NextResponse.json(pending, { headers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}
