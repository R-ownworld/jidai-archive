import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const animeId = searchParams.get("id") || "";
  const animeName = searchParams.get("name") || "";

  if (!animeId && !animeName) {
    return NextResponse.json({ error: "id or name required" }, { status: 400, headers });
  }

  const query = animeName || animeId.replace(/-/g, " ");

  try {
    const prompt = `あなたは日本のアニメ専門家です。「${query}」について正確な情報をJSON形式のみで返してください。前置き不要。

OP/EDは全曲・使用話数も正確に。劇場版も全作品。

{
  "title": "タイトル",
  "titleEn": "英語タイトル",
  "eyebrow": "放送年・概要",
  "studio": "スタジオ",
  "director": "監督",
  "period": "放送期間",
  "tags": ["タグ1","タグ2"],
  "desc": "説明150字程度",
  "tv": [
    {
      "name": "シリーズ名",
      "meta": "放送期間/話数/放送局",
      "themes": [
        {"type":"op","song":"曲名","artist":"アーティスト名","artistName":"アーティスト名","artistNameEn":"英語名","artistCategory":"musician","episodes":"第1話 — 第13話","bpm":120}
      ]
    }
  ],
  "movies": [
    {
      "year": 2024,
      "title": "劇場版タイトル",
      "songs": [
        {"type":"op","label":"主題歌","song":"曲名","artist":"アーティスト","artistName":"アーティスト","artistNameEn":"英語名","artistCategory":"musician","bpm":130}
      ]
    }
  ],
  "related": [
    {"type":"manga","name":"manga","title":"原作タイトル","author":"著者","publisher":"出版社","period":"連載期間","link":"#"}
  ],
  "streaming": [
    {"service":"Netflix","url":"https://www.netflix.com/search?q=${encodeURIComponent(query)}"},
    {"service":"Amazon Prime","url":"https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}"}
  ],
  "pilgrimage": [
    {"name":"聖地名","location":"都道府県","desc":"登場シーンの説明"}
  ],
  "kana": "最初のひらがな1文字"
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();
    const jsonStart = clean.indexOf("{");
    const jsonEnd = clean.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "No JSON found" }, { status: 500, headers });
    }

    const data = JSON.parse(clean.substring(jsonStart, jsonEnd + 1));
    return NextResponse.json(data, { headers });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}
