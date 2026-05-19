import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const { name, action, adminKey } = await req.json();
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!name || !action) return NextResponse.json({ error: 'name and action required' }, { status: 400 });

    if (action === 'approve') {
      await redis.hdel('anime:pending', name);
      await redis.sadd('anime:approved', name);
    } else if (action === 'reject') {
      await redis.hdel('anime:pending', name);
    } else if (action === 'revoke') {
      await redis.srem('anime:approved', name);
    } else {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
