export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  thumbnail?: string;
  platform: string;
  sourceType: "tutorial" | "pdf" | "blog";
  isFree: boolean | null;
  rating?: number;
  reviewCount?: number;
}

// Domains to block entirely — social media / aggregators
const BLOCKED_DOMAINS = [
  "pinterest.com", "pinterest.co.uk", "pinterest.ca", "pinterest.fr",
  "instagram.com", "facebook.com", "tiktok.com",
  "twitter.com", "x.com", "reddit.com", "tumblr.com",
];

// Preferred creator names (for ranking boost when they appear in title/snippet)
const PREFERRED_CREATORS = ["vivcrochets", "etmsstudio", "wonder_netting", "smolbearystudio"];

// YouTube tutorial keywords — reject YouTube results that don't match
const TUTORIAL_KEYWORDS = [
  "tutorial", "how to", "how-to", "step by step", "step-by-step",
  "crochet along", "cal ", "beginners", "learn to", "make a", "make your",
  "free pattern", "diy", "pattern tutorial", "crochet pattern",
];

// Known craft pattern platforms
const PLATFORM_MAP: Record<string, { name: string; sourceType: "tutorial" | "pdf" | "blog"; isFree: boolean | null }> = {
  "youtube.com":        { name: "YouTube",        sourceType: "tutorial", isFree: true },
  "youtu.be":           { name: "YouTube",        sourceType: "tutorial", isFree: true },
  "ravelry.com":        { name: "Ravelry",        sourceType: "pdf",      isFree: null },
  "etsy.com":           { name: "Etsy",           sourceType: "pdf",      isFree: false },
  "gumroad.com":        { name: "Gumroad",        sourceType: "pdf",      isFree: null },
  "lovecrafts.com":     { name: "LoveCrafts",     sourceType: "pdf",      isFree: null },
  "yarnspirations.com": { name: "Yarnspirations", sourceType: "pdf",      isFree: true },
  "drops-design.com":   { name: "Drops Design",   sourceType: "pdf",      isFree: true },
  "garnstudio.com":     { name: "Drops Design",   sourceType: "pdf",      isFree: true },
  "craftsy.com":        { name: "Craftsy",        sourceType: "pdf",      isFree: false },
  "purlsoho.com":       { name: "Purl Soho",      sourceType: "pdf",      isFree: true },
  "weareknitters.com":  { name: "We Are Knitters", sourceType: "pdf",     isFree: false },
  "knitpicks.com":      { name: "Knit Picks",     sourceType: "pdf",      isFree: null },
  "wecrochet.com":      { name: "WeCrochet",      sourceType: "pdf",      isFree: null },
  "hobbycraft.co.uk":   { name: "Hobbycraft",     sourceType: "pdf",      isFree: null },
  "ribblr.com":         { name: "Ribblr",          sourceType: "pdf",      isFree: null },
};

function getDomain(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function classifyResult(r: Record<string, unknown>): SerpResult | null {
  const link = String(r.link ?? "");
  const title = String(r.title ?? "");
  const snippet = String(r.snippet ?? "");
  const domain = getDomain(link);

  if (!domain || !title) return null;

  // Block social media
  if (BLOCKED_DOMAINS.some((b) => domain === b || domain.endsWith("." + b))) return null;

  // Block YouTube Shorts and channel pages — only allow full watch URLs
  if (domain === "youtube.com" && !link.includes("/watch")) return null;

  // Block YouTube non-tutorials (reviews, drama, hauls, etc.)
  if (domain === "youtube.com" || domain === "youtu.be") {
    const titleLower = title.toLowerCase();
    if (!TUTORIAL_KEYWORDS.some((k) => titleLower.includes(k))) return null;
  }

  const platform = PLATFORM_MAP[domain];
  const platformName = platform?.name ?? domain.split(".")[0];
  const sourceType = platform?.sourceType ?? "blog";

  // Determine free/paid
  let isFree = platform?.isFree ?? null;
  const textLower = (title + " " + snippet).toLowerCase();
  if (isFree === null) {
    if (textLower.includes("free pattern") || textLower.includes("free crochet") || textLower.includes("free knitting")) {
      isFree = true;
    } else if (textLower.includes("free")) {
      isFree = true;
    }
  }

  // Extract rating/reviews from rich_snippet
  const richSnippet = r.rich_snippet as Record<string, unknown> | undefined;
  const extensions = (richSnippet?.top as Record<string, unknown> | undefined)
    ?.detected_extensions as Record<string, unknown> | undefined;
  const rating = typeof extensions?.rating === "number" ? extensions.rating : undefined;
  const reviewCount = typeof extensions?.reviews === "number" ? extensions.reviews : undefined;

  return {
    title,
    link,
    snippet,
    thumbnail: getThumbnail(r),
    platform: platformName,
    sourceType,
    isFree,
    rating,
    reviewCount,
  };
}

function rankResults(results: SerpResult[]): SerpResult[] {
  const score = (r: SerpResult): number => {
    let s = 0;
    if (r.platform === "YouTube") s += 5;     // YouTube tutorials first
    else if (r.sourceType !== "blog") s += 3; // other known craft platforms
    if (r.rating !== undefined) s += 2;       // has star rating
    if (r.isFree === true) s += 1;            // free pattern
    // Boost preferred creators when their name appears in title/snippet
    const text = (r.title + " " + (r.snippet ?? "")).toLowerCase();
    if (PREFERRED_CREATORS.some((c) => text.includes(c))) s += 3;
    return s;
  };
  const scored = [...results].sort((a, b) => score(b) - score(a));
  // Always show results with thumbnails before those without
  return [
    ...scored.filter((r) => r.thumbnail),
    ...scored.filter((r) => !r.thumbnail),
  ];
}

export async function searchPatterns(
  craftType: string,
  tags: string[]
): Promise<{ results: SerpResult[]; isSimilar: boolean }> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey || apiKey === "your_serp_api_key_here") {
    throw new Error("Invalid API key: SERP_API_KEY not set");
  }

  const exactQuery = `${craftType} free crochet pattern -site:pinterest.com -site:instagram.com`;
  const exactResults = await fetchSerpResults(exactQuery, apiKey);

  if (exactResults.length >= 1) {
    return { results: rankResults(exactResults).slice(0, 6), isSimilar: false };
  }

  const fallbackQuery = `${tags.slice(0, 2).join(" ")} crochet pattern -site:pinterest.com -site:instagram.com`;
  const fallbackResults = await fetchSerpResults(fallbackQuery, apiKey);

  return { results: rankResults(fallbackResults).slice(0, 6), isSimilar: true };
}

async function fetchSerpResults(query: string, apiKey: string): Promise<SerpResult[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");
  url.searchParams.set("google_domain", "google.com");

  const res = await fetch(url.toString());
  if (res.status === 401) throw new Error("Invalid API key: 401 from SerpAPI");
  if (!res.ok) return [];

  const data = await res.json();
  if (data.error) throw new Error(`Invalid API key: ${data.error}`);

  const organic: unknown[] = data.organic_results ?? [];

  return organic
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map(classifyResult)
    .filter((r): r is SerpResult => r !== null);
}

function getThumbnail(result: Record<string, unknown>): string | undefined {
  if (typeof result.thumbnail === "string") return result.thumbnail;
  const pagemap = result.pagemap as Record<string, unknown> | undefined;
  if (pagemap) {
    const thumbnails = pagemap.cse_thumbnail as Array<Record<string, string>> | undefined;
    if (thumbnails?.[0]?.src) return thumbnails[0].src;
  }
  return undefined;
}
