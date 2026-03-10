"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CafeAwning from "@/components/CafeAwning";
import MasonryGrid from "@/components/MasonryGrid";
import ProjectModal from "@/components/ProjectModal";
import { getAllProjects, searchProjects, Project, Category } from "@/lib/projects";
import { getBookmarkIds, toggleBookmark } from "@/lib/bookmarks";

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
  { label: "miscellaneous", value: "miscellaneous" },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "free-first" | "paid-only" | "videos-only">("newest");
  const [creator, setCreator] = useState("all");

  const allCreators = useMemo(
    () => [...new Set(getAllProjects().map((p) => p.creator))].sort(),
    []
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync showBookmarksOnly with URL param (handles client-side nav)
  useEffect(() => {
    setShowBookmarksOnly(searchParams.get("saved") === "1");
  }, [searchParams]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    setBookmarkIds(getBookmarkIds());
  }, []);

  // Keep bookmarkIds in sync when localStorage changes (e.g. Navbar link)
  useEffect(() => {
    const onUpdate = () => setBookmarkIds(getBookmarkIds());
    window.addEventListener("bookmarks-updated", onUpdate);
    return () => window.removeEventListener("bookmarks-updated", onUpdate);
  }, []);

  // Press "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projects = useMemo(() => {
    let base = searchQuery
      ? searchProjects(searchQuery, { category: activeCategory, sort })
      : getAllProjects({ category: activeCategory, sort });
    if (creator !== "all") base = base.filter((p) => p.creator === creator);
    if (showBookmarksOnly) base = base.filter((p) => bookmarkIds.includes(p.id));
    return base;
  }, [activeCategory, sort, creator, searchQuery, showBookmarksOnly, bookmarkIds]);

  function handleBookmarkToggle(id: string) {
    toggleBookmark(id);
    setBookmarkIds(getBookmarkIds());
  }

  return (
    <main>
      <CafeAwning size="full" />

      {/* Filter bar */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        {/* Left: search + button */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search patterns..."
              className="w-full text-sm px-3 py-1.5 rounded-2xl border border-[#673F27]/30 bg-[#FEFEF0] text-[#673F27] placeholder-[#673F27]/40 outline-none focus:border-[#673F27]/60 pr-8"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#673F27]/40 hover:text-[#673F27] text-base leading-none"
                aria-label="clear search"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={() => searchRef.current?.focus()}
            className="text-sm px-3 py-1.5 rounded-2xl hover:opacity-80 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: "#673F27", color: "#FEFEF0", fontFamily: "var(--font-inter), sans-serif" }}
          >
            search
          </button>
        </div>

        {/* Right: labeled filters */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#673F27]/40 pl-1" style={{ fontFamily: "var(--font-inter), sans-serif" }}>filter</span>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as Category | "all")}
              className="text-sm px-3 py-1.5 rounded-xl border border-[#673F27]/30 bg-[#FEFEF0] text-[#673F27] cursor-pointer"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#673F27]/40 pl-1" style={{ fontFamily: "var(--font-inter), sans-serif" }}>sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="text-sm px-3 py-1.5 rounded-xl border border-[#673F27]/30 bg-[#FEFEF0] text-[#673F27] cursor-pointer"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
              <option value="free-first">free first</option>
              <option value="paid-only">paid only</option>
              <option value="videos-only">videos only</option>
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#673F27]/40 pl-1" style={{ fontFamily: "var(--font-inter), sans-serif" }}>creator</span>
            <select
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl border border-[#673F27]/30 bg-[#FEFEF0] text-[#673F27] cursor-pointer max-w-[140px]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              <option value="all">all creators</option>
              {allCreators.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result count (when searching) */}
      {searchQuery && (
        <div className="max-w-7xl mx-auto px-6 -mt-2 pb-2">
          <span
            className="text-xs text-[#673F27]/50"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {projects.length} pattern{projects.length !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <MasonryGrid
          projects={projects}
          onCardClick={setSelectedProject}
          bookmarkIds={bookmarkIds}
          onBookmarkToggle={handleBookmarkToggle}
        />
      </div>

      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onProjectClick={setSelectedProject}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
