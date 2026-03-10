import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/claude";
import { searchPatterns } from "@/lib/serp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "no image provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Phase 1: Claude Vision analyzes the image
    let analysis;
    try {
      analysis = await analyzeImage(base64, mimeType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Claude API error:", msg);
      if (msg.includes("401") || msg.includes("auth") || msg.includes("API key")) {
        return NextResponse.json({ error: "claude_auth" }, { status: 401 });
      }
      throw err;
    }

    // Phase 2: SerpAPI searches the web for real patterns
    let results, isSimilar;
    try {
      ({ results, isSimilar } = await searchPatterns(analysis.craftType, analysis.suggestedTags));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("SerpAPI error:", msg);
      if (msg.includes("401") || msg.includes("Invalid API key") || msg.includes("SERP_API_KEY")) {
        return NextResponse.json({ error: "serp_auth" }, { status: 401 });
      }
      throw err;
    }

    return NextResponse.json({ analysis, results, isSimilar });
  } catch (err) {
    console.error("find-pattern error:", err);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
