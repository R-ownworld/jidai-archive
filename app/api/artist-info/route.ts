import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("name") || "";
  const artistNameEn = searchParams.get("en") || "";
  const category = searchParams.get("category") || "musician";

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!artistName) {
    return NextResponse.json({ error: "Artist name required" }, { status: 400, headers });
  }

  try {
    const categoryPrompts: Record<string, string> = {
      musician: `音楽アーティスト「${artistName}」(英語名: ${artistNameEn}) について`,
      illustrator: `イラストレーター「${artistName}」(英語名: ${artistNameEn}) について。画風・作品の特徴・時代背景との関係を中心に`,
      designer: `デザイナー「${artistName}」(英語名: ${artistNameEn}) について。手がけた作品・デザインの特徴・時代背景との関係を中心に`,
      director: `映画監督・ディレクター「${artistName}」(英語名: ${artistNameEn}) について`,
      producer: `音楽プロデューサー「${artistName}」(英語名: ${artistNameEn}) について。手がけたアーティスト・作品も含めて`,
    };

    const categoryDesc = categoryPrompts[category] || categoryPrompts.musician;

    // worksフィールドはmusician以外で使う（musicianはdiscographyをiTunesから取るため不要）
    const worksField = category !== "musician"
      ? `  "works": [\n` +
        `    {\n` +
        `      "title": "代表作タイトル",\n` +
        `      "year": "年（例：1982）",\n` +
        `      "type": "ジャケット/画集/ポスター/広告/グラフィック等",\n` +
        `      "musicianEn": "ジャケットデザインした場合、そのアーティストの英語名（例: Tatsuro Yamashita）。ジャケット以外はnull",\n` +
        `      "musicianAlbum": "ジャケットデザインした場合、そのアルバム名の英語表記（例: For You）。ジャケット以外はnull",\n` +
        `      "isbn": "画集・書籍の場合はISBN-13（例: 9784XXXXXXXXX）。不明またはジャケットの場合はnull"\n` +
        `    }\n` +
        `  ],\n`
      : "";

    const prompt =
      `あなたは日本のカルチャー評論家です。${categoryDesc}、知っている限り全ての情報を使って詳しく、以下のJSON形式のみで返してください。説明文は不要です。\n\n` +
      `timelineは必ずデビュー・活動開始から現在まで、重要な出来事を最低8個以上含めてください。\n\n` +
      `{\n` +
      `  "story": "概要・特徴・影響・評価を300字程度で詳しく",\n` +
      `  "category": "${category}",\n` +
      `  "born": "生年月日・出身地",\n` +
      `  "died": "没年月日（存命の場合はnull）",\n` +
      `  "debut": "デビュー年・代表的な最初の仕事",\n` +
      `  "genre": ["メインカテゴリー", "サブカテゴリー1", "サブカテゴリー2"],\n` +
      `  "stat1": {"num": "印象的な数字や記録", "label": "その説明"},\n` +
      `  "stat2": {"num": "印象的な数字や記録", "label": "その説明"},\n` +
      `  "stat3": {"num": "印象的な数字や記録", "label": "その説明"},\n` +
      worksField +
      `  "highlights": [\n` +
      `    "代表的な出来事・エピソード1（100字程度で詳しく）",\n` +
      `    "代表的な出来事・エピソード2（100字程度で詳しく）",\n` +
      `    "代表的な出来事・エピソード3（100字程度で詳しく）"\n` +
      `  ],\n` +
      `  "timeline": [\n` +
      `    {"year": "年", "title": "出来事タイトル", "detail": "詳細説明（50字程度）"}\n` +
      `  ],\n` +
      `  "related": [\n` +
      `    {"name": "関連する人物・アーティスト名JP", "nameEn": "英語名", "role": "関係性", "category": "musician/illustrator/designer等"},\n` +
      `    {"name": "関連する人物・アーティスト名JP", "nameEn": "英語名", "role": "関係性", "category": "musician"}\n` +
      `  ],\n` +
      `  "kana": "名前の最初のひらがな1文字（例：山下達郎なら「や」、永井博なら「な」、EPOなら「え」）"\n` +
      `}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();

    const jsonStart = clean.indexOf('{');
    const jsonEnd = clean.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "No JSON found" }, { status: 500, headers });
    }
    const jsonStr = clean.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data, { headers });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
