"use client";

import { Project } from "@/lib/projects";
import ProjectCard from "./ProjectCard";

interface MasonryGridProps {
  projects: Project[];
  onCardClick: (project: Project) => void;
  bookmarkIds?: string[];
  onBookmarkToggle?: (id: string) => void;
}

export default function MasonryGrid({ projects, onCardClick, bookmarkIds, onBookmarkToggle }: MasonryGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-[#673F27]/50">
        <p style={{ fontFamily: "Quicksand, sans-serif" }}>no projects found.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <style>{`
        @media (max-width: 1280px) { .masonry { column-count: 4 !important; } }
        @media (max-width: 1024px) { .masonry { column-count: 3 !important; } }
        @media (max-width: 640px)  { .masonry { column-count: 2 !important; column-gap: 0.5rem !important; } }
        @media (max-width: 400px)  { .masonry { column-count: 1 !important; } }
      `}</style>
      <div
        className="masonry w-full"
        style={{ columnCount: 5, columnGap: "1rem" }}
      >
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            onClick={onCardClick}
            isBookmarked={bookmarkIds?.includes(project.id)}
            onBookmarkToggle={onBookmarkToggle}
          />
        ))}
      </div>
    </div>
  );
}
