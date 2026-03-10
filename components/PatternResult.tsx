"use client";

import type { SerpResult } from "@/lib/serp";

const SOURCE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  tutorial: { label: "tutorial", bg: "#69AFD7", color: "#FEFEF0" },
  pdf:      { label: "pdf",      bg: "#673F27", color: "#FEFEF0" },
  blog:     { label: "blog",     bg: "rgba(103,63,39,0.12)", color: "#673F27" },
};

interface PatternResultProps {
  result: SerpResult;
  index: number;
}

export default function PatternResult({ result }: PatternResultProps) {
  const badge = SOURCE_BADGE[result.sourceType] ?? SOURCE_BADGE.blog;

  return (
    <div
      className="rounded-2xl p-4 flex gap-4 items-start"
      style={{
        backgroundColor: "#FEFEF0",
        border: "1px solid rgba(103,63,39,0.12)",
        boxShadow: "0 2px 10px rgba(103,63,39,0.06)",
      }}
    >
      {result.thumbnail ? (
        <img
          src={result.thumbnail}
          alt={result.title}
          className="rounded-xl w-16 h-16 object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="rounded-xl w-16 h-16 flex-shrink-0 flex items-center justify-center text-xl"
          style={{ backgroundColor: "rgba(103,63,39,0.07)", border: "1px solid rgba(103,63,39,0.12)" }}
        >
          🧶
        </div>
      )}

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Title */}
        <h3
          className="text-[#673F27] text-base font-semibold leading-snug line-clamp-2"
          style={{ fontFamily: "Quicksand, sans-serif" }}
        >
          {result.title}
        </h3>

        {/* Snippet */}
        {result.snippet && (
          <p
            className="text-[#673F27]/60 text-sm line-clamp-2"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {result.snippet}
          </p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {/* source type */}
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>

          {/* free / paid */}
          {result.isFree === true && (
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "rgba(105,175,215,0.18)", color: "#3a8ab5" }}
            >
              free
            </span>
          )}
          {result.isFree === false && (
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full border"
              style={{ borderColor: "rgba(103,63,39,0.2)", color: "#673F27", opacity: 0.6 }}
            >
              paid
            </span>
          )}

          {/* rating */}
          {result.rating !== undefined && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ color: "#673F27/70", fontFamily: "var(--font-inter), sans-serif" }}
            >
              ★ {result.rating.toFixed(1)}{result.reviewCount ? ` · ${result.reviewCount.toLocaleString()}` : ""}
            </span>
          )}
        </div>

        {/* Platform + link */}
        <div
          className="flex items-center gap-2 mt-0.5"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          <span className="text-[#673F27]/40 text-xs">{result.platform}</span>
          <span className="text-[#673F27]/20 text-xs">·</span>
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
            style={{ color: "#69AFD7" }}
            onClick={(e) => e.stopPropagation()}
          >
            view pattern →
          </a>
        </div>
      </div>
    </div>
  );
}
