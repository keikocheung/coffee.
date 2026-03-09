import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/claude";
import { getSimilarProjects, searchByCategory } from "@/lib/projects";

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

    // Phase 1: Claude Vision analyzes the image → extracts tags
    const analysis = await analyzeImage(base64, mimeType);

    // Phase 2: Match tags against real database
    let results = getSimilarProjects(analysis.suggestedTags, null, 6);
    let fallback = false;

    // Fallback: if no tag matches, show patterns from the same category
    if (results.length === 0 && analysis.suggestedCategory) {
      results = searchByCategory(analysis.suggestedCategory, 6);
      fallback = true;
    }

    return NextResponse.json({ analysis, results, fallback });
  } catch (err) {
    console.error("find-pattern error:", err);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
