import { NextRequest, NextResponse } from "next/server";
import { getSimilarProjects } from "@/lib/projects";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags") ?? "";
  const exclude = searchParams.get("exclude") ?? "";

  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const results = getSimilarProjects(tags, exclude, 3);

  return NextResponse.json({ results });
}
