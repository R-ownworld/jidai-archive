import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET: 承認済みアーティスト一覧を取得
export async function GET() {
  try {
    const artists = await redis.get<any[]>("artists:approved") || [];
    return NextResponse.json(artists, { headers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

// POST: 新しいアーティストを承認待ちとして保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameEn, genre, era, kana } = body;

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400, headers });
    }

    // シティポップ系かどうか判定
    const citypopGenres = ["シティポップ", "ニューミュージック", "AOR", "フュージョン", "R&B", "ソウル", "テクノポップ", "フォーク"];
    const isCitypop = citypopGenres.some(g => (genre || "").includes(g));

    if (!isCitypop) {
      return NextResponse.json({ message: "Not citypop genre, skipped" }, { headers });
    }

    // 既に承認済みかチェック
    const approved = await redis.get<any[]>("artists:approved") || [];
    if (approved.some(a => a.name === name)) {
      return NextResponse.json({ message: "Already exists" }, { headers });
    }

    // 承認待ちにも既にあるかチェック
    const pending = await redis.get<any[]>("artists:pending") || [];
    if (pending.some(a => a.name === name)) {
      return NextResponse.json({ message: "Already pending" }, { headers });
    }

    // 承認待ちに追加
    const newArtist = {
      name,
      nameEn: nameEn || "",
      genre: genre || "",
      era: era || "1970s-80s",
      kana: kana || name.charAt(0),
      addedAt: new Date().toISOString(),
    };

    pending.push(newArtist);
    await redis.set("artists:pending", pending);

    return NextResponse.json({ message: "Added to pending", artist: newArtist }, { headers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}
