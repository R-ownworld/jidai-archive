import { NextRequest, NextResponse } from "next/server";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn") || "";
  const title = searchParams.get("title") || "";
  const author = searchParams.get("author") || "";

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "RAKUTEN_APP_ID not set" }, { status: 500, headers });
  }

  try {
    let url = "";
    if (isbn && isbn !== "null") {
      url = `https://app.rakuten.co.jp/services/api/BooksTotal/Search/20170404?applicationId=${appId}&isbn=${isbn}&hits=1&formatVersion=2`;
    } else if (title) {
      const keyword = encodeURIComponent(title + (author ? " " + author : ""));
      url = `https://app.rakuten.co.jp/services/api/BooksTotal/Search/20170404?applicationId=${appId}&keyword=${keyword}&hits=3&formatVersion=2`;
    } else {
      return NextResponse.json({ error: "isbn or title required" }, { status: 400, headers });
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.Items && data.Items.length > 0) {
      const book = data.Items[0];
      return NextResponse.json({
        imageUrl: book.largeImageUrl || book.mediumImageUrl || null,
        title: book.title || null,
        author: book.author || null,
        rakutenUrl: book.itemUrl || null,
      }, { headers });
    }

    return NextResponse.json({ imageUrl: null }, { headers });
  } catch (e) {
    console.error("Rakuten API error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}
