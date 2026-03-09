"use client";

import { useState, useMemo } from "react";
import CafeAwning from "@/components/CafeAwning";
import MasonryGrid from "@/components/MasonryGrid";
import ProjectModal from "@/components/ProjectModal";
import { getAllProjects, Project, Category } from "@/lib/projects";

const CATEGORIES: { label: string; value: Category | "all" }[] = [
  { label: "all", value: "all" },
  { label: "clothing", value: "clothing" },
  { label: "hats", value: "hats" },
  { label: "scarves & shawls", value: "scarves & shawls" },
  { label: "blankets", value: "blankets" },
  { label: "bags", value: "bags" },
  { label: "amigurumi", value: "amigurumi" },
  { label: "home decor", value: "home decor" },
  { label: "accessories", value: "accessories" },
  { label: "baby", value: "baby" },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<"newest" | "free-first">("newest");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projects = useMemo(
    () => getAllProjects({ category: activeCategory, sort }),
    [activeCategory, sort]
  );

  return (
    <main>
      <CafeAwning size="full" />

      {/* Filter bar */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className="px-4 py-1.5 rounded-full text-sm transition-all"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                backgroundColor: activeCategory === cat.value ? "#673F27" : "transparent",
                color: activeCategory === cat.value ? "#FEFEF0" : "#673F27",
                border: "1.5px solid #673F27",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-sm px-3 py-1.5 rounded-xl border border-[#673F27]/30 bg-[#FEFEF0] text-[#673F27] cursor-pointer"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            <option value="newest">sort: newest</option>
            <option value="free-first">sort: free first</option>
          </select>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <MasonryGrid projects={projects} onCardClick={setSelectedProject} />
      </div>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} onProjectClick={setSelectedProject} />
    </main>
  );
}
