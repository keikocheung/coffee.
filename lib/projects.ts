import projectsData from "@/data/projects.json";

export type SourceType = "YouTube" | "Etsy" | "PDF" | "Blog" | "Gumroad" | "Ribblr";
export type Category =
  | "clothing"
  | "hats"
  | "scarves & shawls"
  | "blankets"
  | "bags"
  | "amigurumi"
  | "home decor"
  | "accessories"
  | "miscellaneous";

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
  sort?: "newest" | "oldest" | "free-first" | "paid-only" | "videos-only";
}

export function getAllProjects(filter?: FilterOptions): Project[] {
  let projects = (projectsData as Project[]).filter((p) => p.imageFile && !p.imageFile.startsWith("data:"));

  if (filter?.category && filter.category !== "all") {
    projects = projects.filter((p) => p.category === filter.category);
  }

  if (filter?.source && filter.source !== "all") {
    projects = projects.filter((p) => p.sourceType === filter.source);
  }

  if (filter?.sort === "free-first") {
    projects = [...projects].sort((a, b) => Number(b.isFree) - Number(a.isFree));
  }

  if (filter?.sort === "oldest") {
    projects = [...projects].reverse();
  }

  if (filter?.sort === "paid-only") {
    projects = projects.filter((p) => !p.isFree);
  }

  if (filter?.sort === "videos-only") {
    projects = projects.filter((p) => p.sourceType === "YouTube");
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

const CATEGORY_SYNONYMS: Record<string, Category[]> = {
  scarf: ["scarves & shawls"],
  scarves: ["scarves & shawls"],
  wrap: ["scarves & shawls"],
  shawl: ["scarves & shawls"],
  shawls: ["scarves & shawls"],
  cowl: ["scarves & shawls"],
  hat: ["hats"],
  hats: ["hats"],
  beanie: ["hats"],
  cap: ["hats"],
  toque: ["hats"],
  beret: ["hats"],
  bonnet: ["hats"],
  blanket: ["blankets"],
  blankets: ["blankets"],
  throw: ["blankets"],
  afghan: ["blankets"],
  quilt: ["blankets"],
  bag: ["bags"],
  bags: ["bags"],
  tote: ["bags"],
  purse: ["bags"],
  pouch: ["bags"],
  backpack: ["bags"],
  clutch: ["bags"],
  amigurumi: ["amigurumi"],
  plushie: ["amigurumi"],
  stuffed: ["amigurumi"],
  toy: ["amigurumi"],
  doll: ["amigurumi"],
  plush: ["amigurumi"],
  stuffie: ["amigurumi"],
  sweater: ["clothing"],
  cardigan: ["clothing"],
  top: ["clothing"],
  vest: ["clothing"],
  shirt: ["clothing"],
  jacket: ["clothing"],
  dress: ["clothing"],
  skirt: ["clothing"],
  pillow: ["home decor"],
  basket: ["home decor"],
  coaster: ["home decor"],
  rug: ["home decor"],
  curtain: ["home decor"],
  headband: ["accessories"],
  collar: ["accessories"],
  belt: ["accessories"],
  bracelet: ["accessories"],
  gloves: ["accessories"],
  mittens: ["accessories"],
  socks: ["accessories"],
  // → miscellaneous
  baby: ["miscellaneous"],
  infant: ["miscellaneous"],
  newborn: ["miscellaneous"],
  nursery: ["miscellaneous"],
  bootie: ["miscellaneous"],
  booties: ["miscellaneous"],
  bib: ["miscellaneous"],
  onesie: ["miscellaneous"],
  lovey: ["miscellaneous"],
  slipper: ["miscellaneous"],
  slippers: ["miscellaneous"],
  shoe: ["miscellaneous"],
  shoes: ["miscellaneous"],
  moccasin: ["miscellaneous"],
  flower: ["miscellaneous"],
  flowers: ["miscellaneous"],
  bouquet: ["miscellaneous"],
  botanical: ["miscellaneous"],
  plant: ["miscellaneous"],
  succulent: ["miscellaneous"],
  wreath: ["miscellaneous"],
  holiday: ["miscellaneous"],
  christmas: ["miscellaneous"],
  halloween: ["miscellaneous"],
  easter: ["miscellaneous"],
  pumpkin: ["miscellaneous"],
  ornament: ["miscellaneous"],
  seasonal: ["miscellaneous"],
  food: ["miscellaneous"],
  fruit: ["miscellaneous"],
  vegetable: ["miscellaneous"],
  sushi: ["miscellaneous"],
  donut: ["miscellaneous"],
  strawberry: ["miscellaneous"],
  pet: ["miscellaneous"],
  dog: ["miscellaneous"],
  cat: ["miscellaneous"],
  puppy: ["miscellaneous"],
  kitten: ["miscellaneous"],
  jewelry: ["miscellaneous"],
  earring: ["miscellaneous"],
  earrings: ["miscellaneous"],
  necklace: ["miscellaneous"],
  ring: ["miscellaneous"],
  keychain: ["miscellaneous"],
  charm: ["miscellaneous"],
  washcloth: ["miscellaneous"],
  dishcloth: ["miscellaneous"],
};

export function searchProjects(query: string, filter?: FilterOptions): Project[] {
  const q = query.trim().toLowerCase();
  if (!q) return getAllProjects(filter);

  const tokens = q.split(/\s+/);
  const expandedCategories = new Set<Category>();
  for (const token of tokens) {
    const cats = CATEGORY_SYNONYMS[token];
    if (cats) cats.forEach((c) => expandedCategories.add(c));
  }

  return getAllProjects(filter).filter((p) => {
    if (expandedCategories.has(p.category)) return true;
    const searchable = [
      p.title.toLowerCase(),
      p.creator.toLowerCase(),
      ...p.tags.map((t) => t.toLowerCase()),
    ];
    return tokens.some((token) => searchable.some((s) => s.includes(token)));
  });
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
