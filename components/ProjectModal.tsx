"use client";

import { useEffect, useState } from "react";
import { Project, getSimilarProjects } from "@/lib/projects";

const BADGE_COLORS: Record<string, string> = {
  YouTube: "#FF4444",
  Etsy: "#F56400",
  Gumroad: "#7C5CBF",
  PDF: "#8A8A8A",
  Blog: "#8A8A8A",
};

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onProjectClick?: (project: Project) => void;
}

export default function ProjectModal({ project, onClose, onProjectClick }: ProjectModalProps) {
  const [similar, setSimilar] = useState<Project[]>([]);

  useEffect(() => {
    if (project) {
      setSimilar(getSimilarProjects(project.tags, project.id, 3));
    }
  }, [project]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!project) return null;

  const badgeColor = BADGE_COLORS[project.sourceType] ?? "#8A8A8A";
  const imageUrl = project.imageFile ?? `https://picsum.photos/seed/${project.id}/800/600`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(103,63,39,0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#FEFEF0] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 8px 40px rgba(103,63,39,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="w-full aspect-[4/3] overflow-hidden rounded-t-2xl">
          <img
            src={imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-[#673F27] text-xl font-semibold"
                style={{ fontFamily: "Pacifico, cursive" }}
              >
                {project.title}
              </h2>
              <p
                className="text-[#673F27]/60 text-sm mt-0.5"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                by {project.creator}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#673F27]/40 hover:text-[#673F27] text-xl leading-none flex-shrink-0 mt-1"
            >
              ✕
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
              style={{ backgroundColor: badgeColor }}
            >
              {project.sourceType}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border border-[#673F27]/20 text-[#673F27]/70">
              {project.isFree ? "free" : "paid"}
            </span>
          </div>

          {/* CTA */}
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-2xl text-[#FEFEF0] text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#673F27", fontFamily: "Pacifico, cursive" }}
          >
            visit original creator →
          </a>

          {/* Pattern text */}
          {project.patternText && (
            <div>
              <h3
                className="text-[#673F27]/60 text-xs uppercase tracking-widest mb-3"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                pattern
              </h3>
              <pre
                className="text-[#673F27] text-xs leading-relaxed whitespace-pre-wrap bg-[#673F27]/5 rounded-xl p-4 max-h-72 overflow-y-auto"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {project.patternText}
              </pre>
            </div>
          )}

          {/* Similar Projects */}
          {similar.length > 0 && (
            <div>
              <h3
                className="text-[#673F27]/60 text-xs uppercase tracking-widest mb-3"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                similar projects
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {similar.map((s) => {
                  const sImg = s.imageFile ?? `https://picsum.photos/seed/${s.id}/300/240`;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onProjectClick?.(s)}
                      className="rounded-xl overflow-hidden text-left transition-all hover:scale-[1.03] hover:shadow-md"
                      style={{ backgroundColor: "rgba(103,63,39,0.05)" }}
                    >
                      <img
                        src={sImg}
                        alt={s.title}
                        className="w-full h-auto block"
                      />
                      <div className="p-2" style={{ backgroundColor: "rgba(103,63,39,0.05)" }}>
                        <p
                          className="text-[#673F27] text-xs font-semibold leading-tight truncate"
                          style={{ fontFamily: "Pacifico, cursive" }}
                        >
                          {s.title}
                        </p>
                        <p
                          className="text-[#673F27]/50 text-[10px] truncate mt-0.5"
                          style={{ fontFamily: "var(--font-inter), sans-serif" }}
                        >
                          by {s.creator}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
