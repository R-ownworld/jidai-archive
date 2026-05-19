import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await redis.hgetall('anime:pending');
    if (!data) return NextResponse.json([]);
    const list = Object.values(data).map(v => typeof v === 'string' ? JSON.parse(v) : v);
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
