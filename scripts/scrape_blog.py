#!/usr/bin/env python3
"""
Scrapes all pattern posts from a craft blog and imports them into the coffee. app.

Supports:
  - WordPress blogs (via REST API — fast, structured)
  - Generic HTML blogs (crawls post listing pages)

Uses Claude Haiku to extract structured pattern info from post content.

Usage (run from project root):
    python3 scripts/scrape_blog.py https://example-crochet-blog.com

Output: scripts/output/blog_[domain].json
Then merge with: python3 scripts/merge_imports.py scripts/output/blog_[domain].json
"""

import json, os, re, sys, time, hashlib
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
import anthropic

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_IMG   = os.path.join(PROJECT_ROOT, "public", "patterns", "images")
OUT_DIR      = os.path.join(os.path.dirname(__file__), "output")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

CLAUDE = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── Category inference (reused from import_kaggle.py) ─────────────────────────
CATEGORY_RULES = [
    (["amigurumi", "stuffed", "plushie", "toy", "doll", "puppet"], "amigurumi"),
    (["sweater", "cardigan", "hoodie", "pullover", "jacket", "vest",
      "tunic", "poncho", "coat", "blouse", "shirt", "top"], "clothing"),
    (["hat", "beanie", "beret", "toque", "cap", "ear warmer"], "hats"),
    (["cowl", "scarf", "shawl", "wrap", "stole", "snood"], "scarves & shawls"),
    (["socks", "mitten", "gloves", "wrist", "fingerless", "boot cuff"], "accessories"),
    (["blanket", "throw", "afghan", "quilt"], "blankets"),
    (["bag", "tote", "purse", "pouch", "backpack", "clutch"], "bags"),
    (["basket", "bowl", "storage", "organizer", "pillow", "cushion",
      "coaster", "dishcloth", "washcloth", "rug", "placemat",
      "wall hanging", "wreath", "garland", "mobile", "ornament"], "home decor"),
    (["baby", "infant", "newborn", "toddler"], "baby"),
]
DEFAULT_CATEGORY = "clothing"

ALLOWED_TAGS = [
    "accessories", "amigurumi", "baby", "bags", "beginner", "blankets",
    "cable", "clothing", "colorwork", "granny-square", "hats", "home-decor",
    "intermediate", "lace", "scarves-shawls",
]

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

def get_category(text: str) -> str:
    lowered = text.lower()
    for keywords, category in CATEGORY_RULES:
        for kw in keywords:
            if kw in lowered:
                return category
    return DEFAULT_CATEGORY

def build_tags(text: str, category: str) -> list:
    tags = {category.replace(" & ", "-").replace(" ", "-")}
    lowered = text.lower()
    if "beginner" in lowered or "easy" in lowered:
        tags.add("beginner")
    elif "advanced" in lowered:
        tags.add("advanced")
    elif "intermediate" in lowered:
        tags.add("intermediate")
    for kw in ["baby", "amigurumi", "colorwork", "cable", "lace", "granny square"]:
        if kw in lowered:
            tags.add(kw.replace(" ", "-"))
    return sorted(t for t in tags if t in ALLOWED_TAGS)


# ── WordPress API scraper ─────────────────────────────────────────────────────

def try_wordpress_api(base_url: str) -> list[dict] | None:
    """Try fetching posts via WordPress REST API. Returns list of post dicts or None."""
    api_url = base_url.rstrip("/") + "/wp-json/wp/v2/posts"
    try:
        resp = SESSION.get(api_url, params={"per_page": 1}, timeout=10)
        if resp.status_code != 200:
            return None
        # Check it's actually JSON
        resp.json()
    except Exception:
        return None

    print(f"  WordPress API detected at {api_url}")
    posts = []
    page = 1
    while True:
        resp = SESSION.get(api_url, params={"per_page": 100, "page": page, "_embed": 1}, timeout=15)
        if resp.status_code == 400:
            break
        batch = resp.json()
        if not batch:
            break
        posts.extend(batch)
        print(f"    Fetched page {page} ({len(posts)} posts so far)")
        page += 1
        time.sleep(0.5)

    # Filter to likely pattern posts
    pattern_posts = []
    for post in posts:
        title = post.get("title", {}).get("rendered", "")
        content = BeautifulSoup(post.get("content", {}).get("rendered", ""), "html.parser").get_text()
        tags_raw = [t.get("name", "") for t in post.get("_embedded", {}).get("wp:term", [[]])[0] if isinstance(t, dict)]
        categories_raw = [c.get("name", "") for c in post.get("_embedded", {}).get("wp:term", [[], []])[1] if isinstance(c, dict)]
        combined = (title + " " + " ".join(tags_raw) + " " + " ".join(categories_raw)).lower()

        craft_terms = ["crochet", "knit", "pattern", "yarn", "stitch", "amigurumi", "hook", "needle"]
        if any(term in combined for term in craft_terms):
            # Find first image
            image_url = None
            featured = post.get("_embedded", {}).get("wp:featuredmedia", [])
            if featured:
                image_url = featured[0].get("source_url")
            if not image_url:
                img_tag = BeautifulSoup(post.get("content", {}).get("rendered", ""), "html.parser").find("img")
                if img_tag:
                    image_url = img_tag.get("src")

            pattern_posts.append({
                "title": BeautifulSoup(title, "html.parser").get_text(),
                "url": post.get("link", ""),
                "content": content[:3000],
                "image_url": image_url,
            })

    return pattern_posts


def crawl_blog_html(base_url: str) -> list[dict]:
    """Crawl a generic blog by following pagination and post links."""
    domain = urlparse(base_url).netloc
    print(f"  HTML crawling {base_url} ...")
    visited = set()
    post_urls = []
    to_visit = [base_url]

    # Collect post URLs (max 5 listing pages)
    listing_pages_visited = 0
    while to_visit and listing_pages_visited < 5:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)
        listing_pages_visited += 1

        try:
            resp = SESSION.get(url, timeout=15)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception:
            continue

        # Collect article/post links
        for a in soup.find_all("a", href=True):
            href = urljoin(url, a["href"])
            if urlparse(href).netloc != domain:
                continue
            if href in visited or href in post_urls:
                continue
            # Heuristic: post URLs often have /year/month/day/ or are under /blog/ /posts/
            path = urlparse(href).path
            if re.search(r"/\d{4}/\d{2}/|/p/|/post/|/blog/|/pattern/", path):
                post_urls.append(href)

        # Find next page link
        next_link = soup.find("a", string=re.compile(r"next|older|→|»", re.I))
        if next_link:
            next_url = urljoin(url, next_link["href"])
            if next_url not in visited:
                to_visit.append(next_url)

        time.sleep(0.5)

    print(f"    Found {len(post_urls)} potential post URLs")

    # Fetch each post
    posts = []
    for i, post_url in enumerate(post_urls[:200], 1):
        print(f"    [{i}/{min(len(post_urls), 200)}] {post_url[:80]}")
        try:
            resp = SESSION.get(post_url, timeout=15)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception:
            continue

        title_tag = soup.find("h1") or soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""

        # Get main content (try common selectors)
        content_el = (
            soup.find("article")
            or soup.find(class_=re.compile(r"post-content|entry-content|article-content"))
            or soup.find("main")
        )
        content = content_el.get_text(" ", strip=True)[:3000] if content_el else ""

        # Check if craft related
        craft_terms = ["crochet", "knit", "pattern", "yarn", "stitch", "hook", "needle", "amigurumi"]
        if not any(t in (title + content).lower() for t in craft_terms):
            continue

        # First image
        img_tag = soup.find("img", src=re.compile(r"\.(jpg|jpeg|png|webp)", re.I))
        image_url = img_tag.get("src") if img_tag else None
        if image_url and image_url.startswith("//"):
            image_url = "https:" + image_url
        elif image_url and image_url.startswith("/"):
            image_url = urljoin(post_url, image_url)

        posts.append({"title": title, "url": post_url, "content": content, "image_url": image_url})
        time.sleep(0.3)

    return posts


# ── Claude extraction ─────────────────────────────────────────────────────────

EXTRACT_PROMPT = """You are analyzing a crochet/knitting blog post to extract structured pattern information.

Post title: {title}
Post URL: {url}
Post content (truncated):
{content}

Return ONLY a valid JSON object (no markdown):
{{
  "title": "clean pattern name, e.g. Granny Square Bag",
  "isFree": true or false (true if no purchase required),
  "difficulty": "beginner" | "intermediate" | "advanced" | null,
  "materials": "brief yarn/hook info if mentioned, else null",
  "isPattern": true or false (true if this is actually a crochet/knit pattern post, false if it's a roundup/review/news)
}}"""

def extract_with_claude(post: dict) -> dict | None:
    """Use Claude Haiku to extract structured info from a blog post."""
    prompt = EXTRACT_PROMPT.format(
        title=post["title"],
        url=post["url"],
        content=post["content"][:2000],
    )
    try:
        resp = CLAUDE.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text if resp.content else ""
        parsed = json.loads(text.strip())
        if not parsed.get("isPattern"):
            return None
        return parsed
    except Exception:
        return None


# ── Image download ────────────────────────────────────────────────────────────

def download_image(image_url: str, prefix: str) -> str | None:
    """Download an image and return the /patterns/images/ relative path."""
    if not image_url:
        return None
    try:
        resp = SESSION.get(image_url, timeout=15, stream=True)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "")
        ext = ".jpg" if "jpeg" in content_type or "jpg" in content_type else ".png"
        h = hashlib.md5(image_url.encode()).hexdigest()[:10]
        filename = f"{prefix}_{h}{ext}"
        dst = os.path.join(PUBLIC_IMG, filename)
        if not os.path.exists(dst):
            with open(dst, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
        return f"/patterns/images/{filename}"
    except Exception:
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/scrape_blog.py https://example-blog.com")
        sys.exit(1)

    base_url = sys.argv[1].rstrip("/")
    domain = urlparse(base_url).netloc.replace("www.", "")
    domain_slug = slugify(domain)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_IMG, exist_ok=True)

    print(f"\nScraping blog: {base_url}")

    # Try WordPress API first, fall back to HTML crawl
    posts = try_wordpress_api(base_url)
    if posts is None:
        posts = crawl_blog_html(base_url)

    print(f"\nFound {len(posts)} potential pattern posts")
    print("Extracting pattern info with Claude Haiku...\n")

    projects = []
    skipped = 0

    for i, post in enumerate(posts, 1):
        print(f"[{i}/{len(posts)}] {post['title'][:60]}")
        extracted = extract_with_claude(post)
        time.sleep(0.2)  # rate limit

        if not extracted:
            skipped += 1
            print("  → skipped (not a pattern post)")
            continue

        title = extracted.get("title") or post["title"]
        category = get_category(post["title"] + " " + post["content"])
        tags = build_tags(post["title"] + " " + post["content"], category)

        # Download image
        img_path = None
        if post.get("image_url"):
            img_path = download_image(post["image_url"], f"blog_{domain_slug}")

        uid = f"blog-{domain_slug}-{slugify(title)}-{i}"
        projects.append({
            "id": uid,
            "title": title,
            "creator": domain,
            "sourceType": "Blog",
            "isFree": extracted.get("isFree", True),
            "sourceUrl": post["url"],
            "category": category,
            "tags": tags,
            "imageFile": img_path,
            "patternText": post["content"][:500] if post["content"] else None,
            "difficulty": extracted.get("difficulty"),
            "materials": extracted.get("materials"),
        })
        print(f"  → ✓ {title} ({category}, {extracted.get('difficulty') or 'no difficulty'})")

    out_path = os.path.join(OUT_DIR, f"blog_{domain_slug}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Imported: {len(projects)} patterns")
    print(f"Skipped:  {skipped} (non-pattern posts)")
    print(f"Output:   {out_path}")
    print(f"\nTo add to the app:")
    print(f"  python3 scripts/merge_imports.py {out_path}")


if __name__ == "__main__":
    main()
