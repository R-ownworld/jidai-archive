import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const { adminKey, code, newKey } = await req.json();

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!code || !newKey) {
      return NextResponse.json({ error: 'code and newKey required' }, { status: 400 });
    }
    if (newKey.length < 8) {
      return NextResponse.json({ error: 'newKey must be at least 8 characters' }, { status: 400 });
    }

    // Redisのコードと照合
    const savedCode = await redis.get('admin:change-key-code');
    if (!savedCode || savedCode !== code) {
      return NextResponse.json({ error: 'コードが無効または期限切れです' }, { status: 400 });
    }

    // コードを削除
    await redis.del('admin:change-key-code');

    // 注意: ADMIN_KEYはVercelの環境変数なので、ここではRedisに新キーを保存して
    // 次回ログイン時にRedisのキーを優先する仕組みにする
    await redis.set('admin:override-key', newKey);

    return NextResponse.json({ status: 'ok', message: '新しいキーを設定しました。次回から新しいキーでログインしてください。' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
