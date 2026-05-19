import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, action, adminKey } = body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    }

    if (action === "revoke") {
      // 承認済みから取り消して承認待ちに戻す
      const approved = await redis.get<any[]>("artists:approved") || [];
      const artist = approved.find(a => a.name === name);
      if (!artist) {
        return NextResponse.json({ error: "Artist not found in approved" }, { status: 404, headers });
      }
      const newApproved = approved.filter(a => a.name !== name);
      await redis.set("artists:approved", newApproved);

      // 承認待ちに戻す
      const pending = await redis.get<any[]>("artists:pending") || [];
      pending.push({ ...artist, revokedAt: new Date().toISOString() });
      await redis.set("artists:pending", pending);

      return NextResponse.json({ message: "Revoked", artist }, { headers });
    }

    // approve / reject
    const pending = await redis.get<any[]>("artists:pending") || [];
    const artist = pending.find(a => a.name === name);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found in pending" }, { status: 404, headers });
    }

    const newPending = pending.filter(a => a.name !== name);
    await redis.set("artists:pending", newPending);

    if (action === "approve") {
      const approved = await redis.get<any[]>("artists:approved") || [];
      approved.push(artist);
      const kanaOrder = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
      approved.sort((a, b) => {
        const ak = (a.kana || 'あ').charAt(0);
        const bk = (b.kana || 'あ').charAt(0);
        const ai = kanaOrder.indexOf(ak);
        const bi = kanaOrder.indexOf(bk);
        if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return a.name.localeCompare(b.name, 'ja');
      });
      await redis.set("artists:approved", approved);
      return NextResponse.json({ message: "Approved", artist }, { headers });
    } else {
      return NextResponse.json({ message: "Rejected", artist }, { headers });
    }
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}
