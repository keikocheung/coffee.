#!/usr/bin/env python3
"""
Imports pattern listings from an Etsy shop using the Etsy Open API v3.

Usage (run from project root):
    python3 scripts/scrape_etsy.py SHOP_NAME YOUR_ETSY_API_KEY
    # Or set ETSY_API_KEY env var:
    ETSY_API_KEY=xxx python3 scripts/scrape_etsy.py SHOP_NAME

Getting an Etsy API key (free):
    1. Go to https://www.etsy.com/developers/register
    2. Create an app — API key is shown immediately
    3. No OAuth needed for reading public shop listings

Output: scripts/output/etsy_[shop].json
Then merge with: python3 scripts/merge_imports.py scripts/output/etsy_[shop].json
"""

import json, os, re, sys, time
import requests

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_IMG   = os.path.join(PROJECT_ROOT, "public", "patterns", "images")
OUT_DIR      = os.path.join(os.path.dirname(__file__), "output")

ETSY_API_BASE = "https://openapi.etsy.com/v3/application"

SESSION = requests.Session()

# ── Category inference (same as import_kaggle.py) ────────────────────────────
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
      "wall hanging", "wreath", "garland", "ornament"], "home decor"),
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

def build_tags(text: str, category: str, etsy_tags: list = None) -> list:
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
    # Also check Etsy tags
    if etsy_tags:
        for tag in etsy_tags:
            tag_lower = tag.lower()
            for allowed in ALLOWED_TAGS:
                if allowed.replace("-", " ") in tag_lower or tag_lower in allowed.replace("-", " "):
                    tags.add(allowed)
    return sorted(t for t in tags if t in ALLOWED_TAGS)


# ── Etsy API helpers ──────────────────────────────────────────────────────────

def get_shop_id(shop_name: str, api_key: str) -> int:
    """Look up Etsy shop_id from shop name."""
    resp = SESSION.get(
        f"{ETSY_API_BASE}/shops/{shop_name}",
        headers={"x-api-key": api_key},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["shop_id"], data.get("shop_name", shop_name)


def fetch_all_listings(shop_id: int, api_key: str) -> list[dict]:
    """Fetch all active listings from an Etsy shop, paginated."""
    listings = []
    offset = 0
    limit = 100

    while True:
        resp = SESSION.get(
            f"{ETSY_API_BASE}/shops/{shop_id}/listings/active",
            headers={"x-api-key": api_key},
            params={"limit": limit, "offset": offset, "includes": ["Images"]},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])
        if not batch:
            break
        listings.extend(batch)
        print(f"  Fetched {len(listings)}/{data.get('count', '?')} listings")
        if len(listings) >= data.get("count", 0):
            break
        offset += limit
        time.sleep(0.5)

    return listings


def is_pattern_listing(listing: dict) -> bool:
    """Check if a listing is a crochet/knitting pattern (not physical yarn/supplies)."""
    title = listing.get("title", "").lower()
    description = listing.get("description", "")[:300].lower()
    tags = [t.lower() for t in listing.get("tags", [])]
    combined = title + " " + description + " " + " ".join(tags)

    craft_terms = [
        "crochet", "knit", "knitting", "pattern", "amigurumi",
        "granny square", "stitch", "yarn craft",
    ]
    # Must mention a craft term
    if not any(term in combined for term in craft_terms):
        return False

    # Must be a pattern (PDF/digital), not physical yarn or supplies
    physical_terms = ["skein", "yarn bundle", "yarn lot", "supplies", "hook set", "needle set"]
    if any(term in combined for term in physical_terms):
        return False

    return True


def download_image(image_url: str, listing_id: int) -> str | None:
    """Download a listing image and return the /patterns/images/ path."""
    if not image_url:
        return None
    try:
        resp = SESSION.get(image_url, timeout=15, stream=True)
        resp.raise_for_status()
        ext = ".jpg" if image_url.lower().endswith((".jpg", ".jpeg")) else ".png"
        filename = f"etsy_{listing_id}{ext}"
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
        print("Usage: python3 scripts/scrape_etsy.py SHOP_NAME [API_KEY]")
        print("  Or set ETSY_API_KEY environment variable")
        print("\nGet a free Etsy API key at: https://www.etsy.com/developers/register")
        sys.exit(1)

    shop_name = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("ETSY_API_KEY", "")
    if not api_key:
        print("Error: Etsy API key required. Pass as argument or set ETSY_API_KEY env var.")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_IMG, exist_ok=True)

    print(f"\nLooking up Etsy shop: {shop_name}")
    try:
        shop_id, resolved_name = get_shop_id(shop_name, api_key)
    except requests.HTTPError as e:
        print(f"Error fetching shop: {e}")
        sys.exit(1)
    print(f"  Shop: {resolved_name} (ID: {shop_id})")

    print(f"\nFetching all active listings...")
    all_listings = fetch_all_listings(shop_id, api_key)
    print(f"  Total listings: {len(all_listings)}")

    # Filter to patterns
    pattern_listings = [l for l in all_listings if is_pattern_listing(l)]
    print(f"  Pattern listings: {len(pattern_listings)}")
    skipped = len(all_listings) - len(pattern_listings)

    print(f"\nProcessing {len(pattern_listings)} patterns...")
    projects = []
    shop_slug = slugify(resolved_name)

    for i, listing in enumerate(pattern_listings, 1):
        listing_id = listing["listing_id"]
        title = listing.get("title", "Untitled")
        description = listing.get("description", "")
        etsy_tags = listing.get("tags", [])

        # Price → isFree
        price = listing.get("price", {})
        amount = float(price.get("amount", 1)) / max(price.get("divisor", 100), 1)
        is_free = amount == 0.0

        # Source URL
        source_url = listing.get("url") or f"https://www.etsy.com/listing/{listing_id}"

        # First image
        images = listing.get("images", [])
        image_url = images[0].get("url_fullxfull") if images else None
        img_path = download_image(image_url, listing_id)

        combined_text = title + " " + description[:500] + " " + " ".join(etsy_tags)
        category = get_category(combined_text)
        tags = build_tags(combined_text, category, etsy_tags)

        # Difficulty
        lowered = combined_text.lower()
        if "beginner" in lowered or "easy" in lowered:
            difficulty = "beginner"
        elif "advanced" in lowered:
            difficulty = "advanced"
        elif "intermediate" in lowered:
            difficulty = "intermediate"
        else:
            difficulty = None

        print(f"  [{i}/{len(pattern_listings)}] {title[:55]} | {'free' if is_free else f'${amount:.2f}'} | {category}")

        projects.append({
            "id": f"etsy-{shop_slug}-{listing_id}",
            "title": title,
            "creator": resolved_name,
            "sourceType": "Etsy",
            "isFree": is_free,
            "sourceUrl": source_url,
            "category": category,
            "tags": tags,
            "imageFile": img_path,
            "patternText": description[:500] if description else None,
            "difficulty": difficulty,
        })

    out_path = os.path.join(OUT_DIR, f"etsy_{shop_slug}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Shop:     {resolved_name}")
    print(f"Imported: {len(projects)} pattern listings")
    print(f"Skipped:  {skipped} (non-pattern listings)")
    print(f"Output:   {out_path}")
    print(f"\nTo add to the app:")
    print(f"  python3 scripts/merge_imports.py {out_path}")


if __name__ == "__main__":
    main()
