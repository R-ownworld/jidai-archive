import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const { name, nameEn, requestedAt } = await req.json();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    // 既に承認済みか確認
    const approved = await redis.sismember('anime:approved', name);
    if (approved) return NextResponse.json({ status: 'already_approved' });

    // 既にpendingか確認
    const existing = await redis.hget('anime:pending', name);
    if (existing) return NextResponse.json({ status: 'already_pending' });

    // pendingに追加
    await redis.hset('anime:pending', {
      [name]: JSON.stringify({ name, nameEn: nameEn || '', requestedAt: requestedAt || Date.now() })
    });

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
