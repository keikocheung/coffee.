import projectsData from "@/data/projects.json";

export type SourceType = "YouTube" | "Etsy" | "PDF" | "Blog" | "Gumroad";
export type Category =
  | "clothing"
  | "hats"
  | "scarves & shawls"
  | "blankets"
  | "bags"
  | "amigurumi"
  | "home decor"
  | "accessories"
  | "baby";

export interface Project {
  id: string;
  title: string;
  creator: string;
  sourceType: SourceType;
  isFree: boolean;
  sourceUrl: string;
  category: Category;
  tags: string[];
  imageFile?: string;   // real image from dataset, e.g. /patterns/images/XXX.png
  patternText?: string; // full OCR'd pattern text
  difficulty?: "beginner" | "intermediate" | "advanced";
}

export interface FilterOptions {
  category?: Category | "all";
  source?: SourceType | "all";
  sort?: "newest" | "free-first";
}

export function getAllProjects(filter?: FilterOptions): Project[] {
  let projects = projectsData as Project[];

  if (filter?.category && filter.category !== "all") {
    projects = projects.filter((p) => p.category === filter.category);
  }

  if (filter?.source && filter.source !== "all") {
    projects = projects.filter((p) => p.sourceType === filter.source);
  }

  if (filter?.sort === "free-first") {
    projects = [...projects].sort((a, b) => Number(b.isFree) - Number(a.isFree));
  }

  return projects;
}

export function getProjectById(id: string): Project | undefined {
  return (projectsData as Project[]).find((p) => p.id === id);
}

export function searchByCategory(category: Category, limit = 6): Project[] {
  return (projectsData as Project[])
    .filter((p) => p.category === category)
    .slice(0, limit);
}

export function getSimilarProjects(
  tags: string[],
  excludeId: string | null,
  limit = 3
): Project[] {
  const all = projectsData as Project[];

  return all
    .filter((p) => p.id !== excludeId)
    .map((p) => ({
      project: p,
      score: p.tags.filter((t) => tags.includes(t)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ project }) => project);
}
