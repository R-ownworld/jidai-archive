import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const { adminKey } = await req.json();
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 6桁のランダムコードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Redisに5分間保存
    await redis.set('admin:change-key-code', code, { ex: 300 });

    // Resendでメール送信
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'jidai-archive <onboarding@resend.dev>',
        to: [process.env.ADMIN_EMAIL!],
        subject: '【時代 Archive】管理者キー変更コード',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
            <h2 style="color:#c9a84c">時代 Archive</h2>
            <p>管理者キー変更の確認コードです。</p>
            <div style="font-size:2rem;font-weight:bold;letter-spacing:.5rem;text-align:center;padding:1.5rem;background:#f5f5f5;border-radius:8px;margin:1.5rem 0">
              ${code}
            </div>
            <p style="color:#999;font-size:12px">このコードは5分間有効です。身に覚えがない場合は無視してください。</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'メール送信失敗: ' + err }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
