"use client";

import type { Project } from "@/lib/projects";

const BADGE_COLORS: Record<string, string> = {
  YouTube: "#FF4444",
  Etsy: "#F56400",
  Gumroad: "#7C5CBF",
  PDF: "#8A8A8A",
  Blog: "#8A8A8A",
};

const CARD_BG_COLORS = ["#EDE6DA", "#C8D5C0", "#D4C8D4", "#D9CEC0"];

interface PatternResultProps {
  result: Project;
  index: number;
}

export default function PatternResult({ result, index }: PatternResultProps) {
  const bgColor = CARD_BG_COLORS[index % CARD_BG_COLORS.length];
  const badgeColor = BADGE_COLORS[result.sourceType] ?? "#8A8A8A";

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: bgColor, boxShadow: "0 2px 10px rgba(103,63,39,0.08)" }}
    >
      <div>
        <h3
          className="text-[#673F27] text-base font-semibold"
          style={{ fontFamily: "Quicksand, sans-serif" }}
        >
          {result.title}
        </h3>
        <p
          className="text-[#673F27]/60 text-sm mt-0.5"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          by {result.creator}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-[11px] px-2.5 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: badgeColor }}
        >
          {result.sourceType}
        </span>
        <span
          className="text-[11px] px-2.5 py-0.5 rounded-full border border-[#673F27]/20 text-[#673F27]/70"
        >
          {result.isFree ? "free" : "paid"}
        </span>
      </div>

      <a
        href={result.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#c6dbe4] hover:underline font-medium"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        view pattern →
      </a>
    </div>
  );
}
