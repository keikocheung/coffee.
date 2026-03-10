"use client";

import { Project } from "@/lib/projects";

const BADGE_COLORS: Record<string, string> = {
  YouTube: "#FF4444",
  Etsy: "#F56400",
  Gumroad: "#7C5CBF",
  PDF: "#673F27",
  Blog: "#69AFD7",
  Ribblr: "#E85D75",
};

interface ProjectCardProps {
  project: Project;
  index?: number;
  onClick: (project: Project) => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
}

export default function ProjectCard({ project, onClick, isBookmarked = false, onBookmarkToggle }: ProjectCardProps) {
  const bgColor = "#FEFEF0";
  const badgeColor = BADGE_COLORS[project.sourceType] ?? "#8A8A8A";

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer mb-5 break-inside-avoid transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      style={{ backgroundColor: bgColor, border: "1px solid rgba(103,63,39,0.10)", boxShadow: "0 2px 12px rgba(103,63,39,0.08)" }}
      onClick={() => onClick(project)}
    >
      {/* Image — only render when imageFile is present */}
      {project.imageFile && (
        <div className="w-full overflow-hidden relative">
          <img
            src={project.imageFile}
            alt={project.title}
            className="w-full h-auto block"
            loading="lazy"
          />
          {onBookmarkToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onBookmarkToggle(project.id); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(254,254,240,0.88)" }}
              aria-label={isBookmarked ? "remove bookmark" : "save pattern"}
            >
              <span style={{ fontSize: "1rem", color: isBookmarked ? "#69AFD7" : "rgba(103,63,39,0.4)" }}>
                {isBookmarked ? "♥" : "♡"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Card content */}
      <div className="p-4 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-[#673F27] text-base font-semibold leading-snug flex-1"
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            {project.title}
          </h3>
          {/* Bookmark button when no image */}
          {!project.imageFile && onBookmarkToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onBookmarkToggle(project.id); }}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: "rgba(103,63,39,0.06)" }}
              aria-label={isBookmarked ? "remove bookmark" : "save pattern"}
            >
              <span style={{ fontSize: "0.9rem", color: isBookmarked ? "#69AFD7" : "rgba(103,63,39,0.4)" }}>
                {isBookmarked ? "♥" : "♡"}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span
            className="text-[#673F27]/60 text-sm truncate"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            by {project.creator}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {project.isFree && (
              <span
                className="text-xs px-2 py-0.5 rounded-full border border-[#673F27]/30 text-[#673F27]/60"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                free
              </span>
            )}
            <span
              className="text-xs px-2.5 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: badgeColor, fontFamily: "var(--font-inter), sans-serif" }}
            >
              {project.sourceType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
