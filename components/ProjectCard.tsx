"use client";

import { Project } from "@/lib/projects";

const CARD_BG_COLORS = ["#EDE6DA", "#C8D5C0", "#D4C8D4", "#D9CEC0"];

const BADGE_COLORS: Record<string, string> = {
  YouTube: "#FF4444",
  Etsy: "#F56400",
  Gumroad: "#7C5CBF",
  PDF: "#8A8A8A",
  Blog: "#8A8A8A",
};

interface ProjectCardProps {
  project: Project;
  index: number;
  onClick: (project: Project) => void;
}

// Vary image heights like Pinterest: tall, medium, short cycling
const IMAGE_HEIGHTS = [480, 360, 560, 320, 420, 500];

export default function ProjectCard({ project, index, onClick }: ProjectCardProps) {
  const bgColor = CARD_BG_COLORS[index % CARD_BG_COLORS.length];
  const badgeColor = BADGE_COLORS[project.sourceType] ?? "#8A8A8A";
  const imgHeight = IMAGE_HEIGHTS[index % IMAGE_HEIGHTS.length];
  const imageUrl = project.imageFile ?? `https://picsum.photos/seed/${project.id}/600/${imgHeight}`;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer mb-5 break-inside-avoid transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
      style={{ backgroundColor: bgColor, boxShadow: "0 2px 12px rgba(103,63,39,0.10)" }}
      onClick={() => onClick(project)}
    >
      {/* Image — natural height, no fixed aspect ratio */}
      <div className="w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={project.title}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>

      {/* Card content */}
      <div className="p-4 flex flex-col gap-1.5">
        <h3
          className="text-[#673F27] text-base font-semibold leading-snug"
          style={{ fontFamily: "Quicksand, sans-serif" }}
        >
          {project.title}
        </h3>
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
