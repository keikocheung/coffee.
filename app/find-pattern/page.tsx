"use client";

import { useState } from "react";
import CafeAwning from "@/components/CafeAwning";
import UploadZone from "@/components/UploadZone";
import PatternResult from "@/components/PatternResult";
import type { Project } from "@/lib/projects";
import type { ImageAnalysis } from "@/lib/claude";

type Status = "idle" | "loading" | "done" | "error";

export default function FindPatternPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<Project[]>([]);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults([]);
    setAnalysis(null);
    setFallback(false);
    setStatus("idle");
  };

  const handleSearch = async () => {
    if (!file) return;
    setStatus("loading");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/find-pattern", { method: "POST", body: formData });
      if (!res.ok) throw new Error("api error");

      const data = await res.json();
      setAnalysis(data.analysis ?? null);
      setResults(data.results ?? []);
      setFallback(data.fallback ?? false);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <CafeAwning size="small" tagline="find your next project." />

      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col items-center gap-6">
        <div className="text-center">
          <h2
            className="text-[#673F27] text-2xl font-semibold"
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            ai pattern finder
          </h2>
          <p
            className="text-[#673F27]/60 text-sm mt-1"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            upload a photo of a craft and we'll find matching patterns for you.
          </p>
        </div>

        <UploadZone onFile={handleFile} preview={preview} />

        {file && status !== "loading" && (
          <button
            onClick={handleSearch}
            className="px-8 py-2.5 rounded-2xl text-[#FEFEF0] text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#673F27", fontFamily: "Quicksand, sans-serif" }}
          >
            find patterns
          </button>
        )}

        {status === "loading" && (
          <p
            className="text-[#673F27]/60 text-sm animate-pulse"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            brewing your results...
          </p>
        )}

        {status === "error" && (
          <p
            className="text-[#FF4444] text-sm"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            something went wrong — please try again.
          </p>
        )}

        {/* Analysis summary — what Claude detected */}
        {status === "done" && analysis && (
          <div
            className="w-full rounded-2xl p-4 flex flex-col gap-2"
            style={{ backgroundColor: "#FEFEF0", border: "1px solid rgba(103,63,39,0.12)" }}
          >
            <p
              className="text-[#673F27]/50 text-xs uppercase tracking-widest"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              detected
            </p>
            <p
              className="text-[#673F27] text-sm"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {analysis.craftType}
            </p>
            {analysis.suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {analysis.suggestedTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "#69AFD7", color: "#FEFEF0" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {fallback && analysis.suggestedCategory && (
              <p
                className="text-[#673F27]/50 text-xs mt-1"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                no exact matches — showing similar {analysis.suggestedCategory} patterns
              </p>
            )}
          </div>
        )}

        {status === "done" && results.length === 0 && (
          <p
            className="text-[#673F27]/50 text-sm text-center"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            we couldn't find a matching pattern — try a clearer photo!
          </p>
        )}

        {results.length > 0 && (
          <div className="w-full flex flex-col gap-3">
            <p
              className="text-[#673F27]/50 text-xs uppercase tracking-widest"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {results.length} patterns found
            </p>
            {results.map((r, i) => (
              <PatternResult key={r.id} result={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
