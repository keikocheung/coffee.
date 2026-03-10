/**
 * Pattern scraper — populates data/projects.json with metadata from 6 sources.
 * Run: npx tsx scripts/scrapePatterns.ts
 *
 * Collects: title, creator, sourceUrl, thumbnail, category, tags, isFree, sourceType.
 * Does NOT store pattern content — cards link out to original creator pages.
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import type { Project, Category, SourceType } from "../lib/projects";

// ─── Classification ───────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: { keywords: string[]; category: Category }[] = [
  { keywords: ["amigurumi", "plush", "plushie", "stuffed", "doll", "toy", "teddy", "bear", "bunny", "frog", "cat", "dog", "animal"], category: "amigurumi" },
  { keywords: ["hat", "beanie", "cap", "bonnet", "beret", "bucket hat", "slouch"], category: "hats" },
  { keywords: ["blanket", "afghan", "throw", "quilt"], category: "blankets" },
  { keywords: ["bag", "tote", "purse", "pouch", "backpack", "clutch", "market bag"], category: "bags" },
  { keywords: ["scarf", "shawl", "wrap", "cowl", "poncho"], category: "scarves & shawls" },
  { keywords: ["sweater", "cardigan", "top", "vest", "pullover", "hoodie", "shirt", "blouse", "jacket"], category: "clothing" },
  { keywords: ["baby", "infant", "newborn", "nursery", "onesie", "bootie"], category: "clothing" },
  { keywords: ["coaster", "plant hanger", "wall hanging", "basket", "dishcloth", "trivet", "pot holder", "home", "decor"], category: "home decor" },
];

const ALLOWED_TAGS = [
  "accessories", "amigurumi", "baby", "bags", "beginner", "blankets",
  "cable", "clothing", "colorwork", "granny-square", "hats", "home-decor",
  "intermediate", "lace", "scarves-shawls",
];

function classifyCategory(title: string): Category {
  const lower = title.toLowerCase();
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "accessories";
}

function classifyDifficulty(title: string): "beginner" | "intermediate" | "advanced" {
  const lower = title.toLowerCase();
  if (lower.includes("beginner") || lower.includes("easy") || lower.includes("simple")) return "beginner";
  if (lower.includes("intermediate")) return "intermediate";
  if (lower.includes("advanced") || lower.includes("complex")) return "advanced";
  return "beginner";
}

function extractTags(title: string): string[] {
  const lower = title.toLowerCase();
  return ALLOWED_TAGS.filter((tag) => lower.includes(tag.replace("-", " ")) || lower.includes(tag));
}

function slugify(text: string, index: number): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) +
    `-${index}`
  );
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ─── Scrapers ─────────────────────────────────────────────────────────────────

async function scrapeYarnspirations(pages: number): Promise<Partial<Project>[]> {
  const results: Partial<Project>[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      // Use Shopify's built-in products JSON endpoint — reliable and structured
      const url = `https://www.yarnspirations.com/collections/patterns/products.json?limit=24&page=${page}`;
      console.log(`  Fetching Yarnspirations page ${page}...`);
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { products: Array<{ title: string; handle: string; images: Array<{ src: string }> }> };

      for (const product of data.products ?? []) {
        const img = product.images?.[0]?.src ?? "";
        results.push({
          title: product.title,
          sourceUrl: `https://www.yarnspirations.com/products/${product.handle}`,
          imageFile: img,
          creator: "Yarnspirations",
          sourceType: "PDF" as SourceType,
          isFree: true,
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.warn(`  Yarnspirations page ${page} failed:`, err);
    }
  }
  return results;
}

async function scrapeKofi(): Promise<Partial<Project>[]> {
  const results: Partial<Project>[] = [];
  try {
    console.log("  Fetching Ko-fi shop...");
    const html = await fetchHtml("https://ko-fi.com/Q5Q1D70DZ/shop");
    const $ = cheerio.load(html);

    $(".item-wrapper, .ko-fi-item, .shop-item, [class*='shop']").each((_, el) => {
      const title = $(el).find("[class*='title'], [class*='name'], h3, h2").first().text().trim();
      const href = $(el).find("a").first().attr("href") ?? "";
      const img = $(el).find("img").first().attr("src") ?? "";

      if (title && href) {
        results.push({
          title,
          sourceUrl: href.startsWith("http") ? href : `https://ko-fi.com${href}`,
          imageFile: img,
          creator: "ko-fi shop",
          sourceType: "PDF" as SourceType,
          isFree: false,
        });
      }
    });
  } catch (err) {
    console.warn("  Ko-fi scrape failed:", err);
  }
  return results;
}

async function scrapeWordPressBlog(
  startUrl: string,
  creator: string,
  pages: number
): Promise<Partial<Project>[]> {
  const results: Partial<Project>[] = [];

  // Build page URLs from the starting URL
  const baseUrl = startUrl.replace(/\/page\/\d+\/?$/, "");

  // Extract the starting page number
  const startPageMatch = startUrl.match(/\/page\/(\d+)/);
  const startPage = startPageMatch ? parseInt(startPageMatch[1]) : 1;

  for (let i = 0; i < pages; i++) {
    const pageNum = startPage + i;
    const url = pageNum === 1 ? `${baseUrl}/` : `${baseUrl}/page/${pageNum}/`;

    try {
      console.log(`  Fetching ${creator} page ${pageNum}...`);
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      $("article").each((_, el) => {
        const titleEl = $(el).find(".entry-title a, h2 a, h3 a, .post-title a").first();
        const title = titleEl.text().trim();
        const href = titleEl.attr("href") ?? $(el).find("a").first().attr("href") ?? "";
        const img =
          $(el).find(".post-thumbnail img, .wp-post-image, figure img, .entry-image img").first().attr("src") ??
          $(el).find("img").first().attr("src") ?? "";

        if (title && href) {
          results.push({
            title,
            sourceUrl: href,
            imageFile: img,
            creator,
            sourceType: "Blog" as SourceType,
            isFree: true,
          });
        }
      });

      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.warn(`  ${creator} page ${pageNum} failed:`, err);
    }
  }
  return results;
}

// ─── YouTube tutorial filter ──────────────────────────────────────────────────

const TUTORIAL_KEYWORDS = [
  "tutorial", "how to", "how-to", "pattern", "crochet along", "cal",
  "stitch", "beginner", "easy", "learn", "step by step", "make a", "make an",
  "crochet a", "crochet an", "free pattern", "amigurumi", "granny square",
];

const EXCLUDE_KEYWORDS = [
  "vlog", "haul", "unboxing", "q&a", "qa", "room tour", "my life",
  "favorites", "collection", "update", "organize", "grwm", "day in my",
  "week in my", "shop with me", "come with me",
];

function isTutorialVideo(title: string): boolean {
  const lower = title.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return TUTORIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

async function scrapeYouTubeChannel(channelUrl: string, creatorName: string): Promise<Partial<Project>[]> {
  const results: Partial<Project>[] = [];

  try {
    // Extract channel ID — either it's already a /channel/ID URL or we need to find it from /@handle
    let channelId = "";

    const channelMatch = channelUrl.match(/\/channel\/(UC[\w-]+)/);
    if (channelMatch) {
      channelId = channelMatch[1];
    } else {
      // Fetch the channel page and extract channelId from ytInitialData
      console.log(`  Fetching YouTube channel page for ${creatorName}...`);
      const html = await fetchHtml(channelUrl);
        // Try multiple patterns to find channel ID
      const patterns = [
        /"channelId":"(UC[\w-]+)"/,
        /channel\/(UC[\w-]+)/,
        /"externalId":"(UC[\w-]+)"/,
      ];
      for (const pattern of patterns) {
        const m = html.match(pattern);
        if (m) { channelId = m[1]; break; }
      }
      // Fallback: find all UC IDs and pick the first that has an RSS feed
      if (!channelId) {
        const allIds = [...new Set(html.match(/UC[\w-]{22}/g) ?? [])];
        for (const id of allIds.slice(0, 5)) {
          try {
            const rss = await fetchHtml(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
            if (rss.includes("<feed")) { channelId = id; break; }
          } catch { /* skip */ }
        }
      }
    }

    if (!channelId) {
      console.warn(`  Could not find channelId for ${creatorName}`);
      return results;
    }

    console.log(`  Fetching YouTube RSS for ${creatorName} (${channelId})...`);
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const xml = await fetchHtml(rssUrl);

    // Parse XML entries
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? "";
      const link = entry.match(/<link rel="alternate" href="(.*?)"/)?.[1] ?? "";
      const thumbnail = entry.match(/<media:thumbnail url="(.*?)"/)?.[1] ?? "";
      const channelName = entry.match(/<name>(.*?)<\/name>/)?.[1] ?? creatorName;

      if (title && link && !link.includes("/shorts/") && isTutorialVideo(title)) {
        results.push({
          title,
          sourceUrl: link,
          imageFile: thumbnail,
          creator: channelName || creatorName,
          sourceType: "YouTube" as SourceType,
          isFree: true,
        });
      }
    }

    const filtered = results.length;
    console.log(`  ${creatorName}: kept ${filtered} tutorial videos from RSS feed`);
  } catch (err) {
    console.warn(`  YouTube scrape failed for ${creatorName}:`, err);
  }

  return results;
}

// ─── Ribblr ───────────────────────────────────────────────────────────────────

async function scrapeRibblr(shopUrl: string, creatorName: string): Promise<Partial<Project>[]> {
  const results: Partial<Project>[] = [];
  try {
    console.log(`  Fetching Ribblr shop: ${shopUrl}...`);
    const html = await fetchHtml(shopUrl);

    // Ribblr is a Next.js app — try __NEXT_DATA__ first
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData?.props?.pageProps ?? {};
        const patterns: unknown[] =
          props.patterns ?? props.shop?.patterns ?? props.items ?? props.craftList ?? [];

        for (const p of patterns as Record<string, unknown>[]) {
          const title = (p.title ?? p.name ?? "") as string;
          const slug = (p.slug ?? p.handle ?? p.id ?? "") as string;
          const img =
            ((p.coverImage as Record<string, string>)?.url ?? p.image ?? p.thumbnail ?? p.cover ?? "") as string;
          const price = (p.price ?? p.cost ?? 0) as number;
          const isFree = price === 0 || !!(p.isFree);

          if (title) {
            results.push({
              title,
              sourceUrl: slug
                ? `https://www.ribblr.com/pattern/${slug}`
                : shopUrl,
              imageFile: img,
              creator: creatorName,
              sourceType: "Ribblr" as SourceType,
              isFree,
            });
          }
        }
      } catch { /* JSON parse failed — fall through to HTML */ }
    }

    // Fallback: cheerio HTML parsing
    if (results.length === 0) {
      const $ = cheerio.load(html);
      $("a[href*='/pattern/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const title = $(el).find("h3, h2, p, [class*='title'], [class*='name']").first().text().trim()
          || $(el).attr("aria-label")?.trim() || "";
        const img = $(el).find("img").first().attr("src") ?? "";
        const priceText = $(el).find("[class*='price'], [class*='cost']").first().text().toLowerCase();
        const isFree = priceText.includes("free") || priceText === "$0" || priceText === "0";

        if (title) {
          results.push({
            title,
            sourceUrl: href.startsWith("http") ? href : `https://www.ribblr.com${href}`,
            imageFile: img,
            creator: creatorName,
            sourceType: "Ribblr" as SourceType,
            isFree,
          });
        }
      });
    }

    console.log(`  ${creatorName}: found ${results.length} Ribblr patterns`);
  } catch (err) {
    console.warn(`  Ribblr scrape failed:`, err);
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting pattern scraper...\n");

  const allRaw: Partial<Project>[] = [];

  // Yarnspirations
  console.log("Scraping Yarnspirations...");
  allRaw.push(...(await scrapeYarnspirations(3)));

  // Ko-fi
  console.log("Scraping Ko-fi shop...");
  allRaw.push(...(await scrapeKofi()));

  // Chubbies by Ash
  console.log("Scraping Chubbies by Ash...");
  allRaw.push(...(await scrapeWordPressBlog("https://chubbiesbyash.com/free-crochet-pattern/page/2/", "Chubbies by Ash", 2)));

  // The Friendly Red Fox
  console.log("Scraping The Friendly Red Fox...");
  allRaw.push(...(await scrapeWordPressBlog("https://www.thefriendlyredfox.com/category/amigurumi/page/4/", "The Friendly Red Fox", 2)));

  // YouTube: by.ananyaa
  console.log("Scraping YouTube: by.ananyaa...");
  allRaw.push(...(await scrapeYouTubeChannel("https://www.youtube.com/@by.ananyaa", "by.ananyaa")));

  // YouTube: UCMatR...
  console.log("Scraping YouTube: UCMatRWidE6WTpV5TPWSIjqA...");
  allRaw.push(...(await scrapeYouTubeChannel("https://www.youtube.com/channel/UCMatRWidE6WTpV5TPWSIjqA", "YouTube Channel")));

  // YouTube: VivCrochets
  console.log("Scraping YouTube: VivCrochets...");
  allRaw.push(...(await scrapeYouTubeChannel("https://www.youtube.com/@VivCrochets", "VivCrochets")));

  // YouTube: etmsstudio
  console.log("Scraping YouTube: etmsstudio...");
  allRaw.push(...(await scrapeYouTubeChannel("https://www.youtube.com/@etmsstudio", "etmsstudio")));

  // YouTube: wonder_netting
  console.log("Scraping YouTube: wonder_netting...");
  allRaw.push(...(await scrapeYouTubeChannel("https://www.youtube.com/@wonder_netting", "wonder_netting")));

  // Ribblr: SmolbearyStudio
  console.log("Scraping Ribblr: SmolbearyStudio...");
  allRaw.push(...(await scrapeRibblr("https://www.ribblr.com/shop/smolbearystudio", "SmolbearyStudio")));

  console.log(`\nRaw items collected: ${allRaw.length}`);

  // Build full Project objects
  const projects: Project[] = allRaw
    .filter((r) => r.title && r.sourceUrl)
    .map((r, i) => {
      const title = r.title!;
      const category = classifyCategory(title);
      const tags = extractTags(title);
      // Ensure at least one tag matching the category
      const categoryTag = category.replace(" & ", "-").replace(/\s+/g, "-").replace("scarves-shawls", "scarves-shawls");
      if (ALLOWED_TAGS.includes(categoryTag) && !tags.includes(categoryTag)) {
        tags.push(categoryTag);
      }

      return {
        id: slugify(title, i),
        title,
        creator: r.creator ?? "Unknown",
        sourceType: r.sourceType ?? "Blog",
        isFree: r.isFree ?? true,
        sourceUrl: r.sourceUrl!,
        category,
        tags,
        imageFile: r.imageFile ?? "",
        difficulty: classifyDifficulty(title),
      } satisfies Project;
    });

  // Deduplicate by sourceUrl
  const seen = new Set<string>();
  const unique = projects.filter((p) => {
    if (seen.has(p.sourceUrl)) return false;
    seen.add(p.sourceUrl);
    return true;
  });

  console.log(`Unique patterns after dedup: ${unique.length}`);

  // Write to data/projects.json
  const outputPath = path.join(process.cwd(), "data", "projects.json");
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2));
  console.log(`\nWrote ${unique.length} patterns to data/projects.json`);

  // Summary by category
  const byCat: Record<string, number> = {};
  for (const p of unique) {
    byCat[p.category] = (byCat[p.category] ?? 0) + 1;
  }
  console.log("\nBy category:");
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
