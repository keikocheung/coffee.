#!/usr/bin/env python3
"""
Looks up Yarnspirations patterns by product code (from imageFile),
using the public search + Shopify product JSON endpoints — no API key needed.

Flow per pattern:
  1. GET yarnspirations.com/search?q={code}  → parse searchResultsView JS → handle
  2. GET yarnspirations.com/products/{handle}.json → title, tags, description

Run from project root:
    python3 scripts/scrape_yarnspirations_sample.py

Output: scripts/output/yarnspirations_sample.json
"""

import json, os, re, time, random, html
from typing import Optional
import requests

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
DATA_JSON    = os.path.join(PROJECT_ROOT, "data", "projects.json")
OUT_DIR      = os.path.join(os.path.dirname(__file__), "output")
OUT_JSON     = os.path.join(OUT_DIR, "yarnspirations_sample.json")

YARNSPIRATIONS_CREATORS = {"Bernat", "Caron", "Patons", "Aunt Lydia's"}
SAMPLE_SIZE = 50
BASE_URL    = "https://www.yarnspirations.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# Keyword → category mapping (checked against title + tags + body)
CATEGORY_KEYWORDS = [
    (["blanket", "afghan", "throw"],               "blanket"),
    (["hat", "beanie", "toque", "cap"],            "hat"),
    (["scarf"],                                    "scarf"),
    (["cowl"],                                     "cowl"),
    (["shawl", "wrap"],                            "shawl"),
    (["sweater", "pullover", "jumper"],            "sweater"),
    (["cardigan", "jacket"],                       "cardigan"),
    (["vest"],                                     "vest"),
    (["top", "shirt", "tunic"],                    "top"),
    (["poncho"],                                   "poncho"),
    (["sock", "stocking"],                         "socks"),
    (["mitten", "glove"],                          "mittens"),
    (["slipper", "bootie", "boot"],                "footwear"),
    (["bag", "purse", "tote", "backpack"],         "bag"),
    (["pillow", "cushion", "dishcloth",
      "washcloth", "basket", "rug", "pot holder"], "home-decor"),
    (["toy", "monster", "amigurumi", "doll",
      "stuffed", "animal", "puppet"],              "toys"),
    (["baby", "bib", "lovey", "bunny"],            "baby"),
    (["headband", "ear warmer"],                   "headband"),
]

DIFFICULTY_KEYWORDS = {
    "super easy": "beginner",
    "easy":       "beginner",
    "beginner":   "beginner",
    "intermediate": "intermediate",
    "advanced":   "advanced",
    "experienced": "advanced",
}


def product_code_from_image(image_file: str) -> str:
    """'/patterns/images/BRC0229-009698M.png' → 'BRC0229-009698M'"""
    return os.path.splitext(os.path.basename(image_file))[0]


def get_handle_from_search(product_code: str) -> Optional[str]:
    """
    Fetch the search page for a product code and extract the Shopify handle
    from the embedded searchResultsView JS object.
    """
    url = f"{BASE_URL}/search?q={product_code}"
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[search error] {e}")
        return None

    # searchResultsView:{..., items:[{..., "handle":"some-slug", ...}]}
    m = re.search(r'"handle"\s*:\s*"([a-z0-9][a-z0-9\-]*)"', resp.text)
    return m.group(1) if m else None


def get_product_json(handle: str) -> Optional[dict]:
    """
    Fetch /products/{handle}.json — Shopify public endpoint, no auth needed.
    Returns the 'product' object or None.
    """
    url = f"{BASE_URL}/products/{handle}.json"
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json().get("product")
    except (requests.RequestException, ValueError) as e:
        print(f"[json error] {e}")
        return None


def classify(title: str, tags: list, body_html: str) -> tuple:
    """Return (category, difficulty) derived from pattern metadata."""
    text = " ".join([title, " ".join(tags), body_html]).lower()
    # Strip HTML tags from body
    text = re.sub(r"<[^>]+>", " ", text)

    category = None
    for keywords, cat in CATEGORY_KEYWORDS:
        if any(kw in text for kw in keywords):
            category = cat
            break

    difficulty = None
    for kw, level in DIFFICULTY_KEYWORDS.items():
        if kw in text:
            difficulty = level
            break

    return category, difficulty


def lookup_pattern(product_code: str) -> Optional[dict]:
    handle = get_handle_from_search(product_code)
    if not handle:
        return None

    product = get_product_json(handle)
    if not product:
        return None

    title     = product.get("title", "")
    tags      = product.get("tags", [])
    body_html = product.get("body_html", "")
    vendor    = product.get("vendor", "")

    category, difficulty = classify(title, tags, body_html)

    return {
        "handle":     handle,
        "title":      title,
        "vendor":     vendor,
        "url":        f"{BASE_URL}/products/{handle}",
        "tags":       tags,
        "category":   category,
        "difficulty": difficulty,
    }


def main():
    print(f"Loading {DATA_JSON} ...")
    with open(DATA_JSON, encoding="utf-8") as f:
        projects = json.load(f)

    ysp_projects = [
        p for p in projects
        if p.get("creator") in YARNSPIRATIONS_CREATORS and p.get("imageFile")
    ]
    print(f"  {len(ysp_projects)} Yarnspirations projects found")

    sample = random.sample(ysp_projects, min(SAMPLE_SIZE, len(ysp_projects)))
    print(f"  Sampling {len(sample)} patterns...\n")

    os.makedirs(OUT_DIR, exist_ok=True)
    results = []
    found = 0

    for i, project in enumerate(sample, 1):
        code = product_code_from_image(project["imageFile"])
        print(f"[{i:2d}/{len(sample)}] {code} ({project['creator']}) ...", end=" ", flush=True)

        info = lookup_pattern(code)
        time.sleep(1.0)

        if info:
            found += 1
            result = {
                "id":           project["id"],
                "oldTitle":     project["title"],
                "creator":      project["creator"],
                "productCode":  code,
                "newTitle":     info["title"],
                "newSourceUrl": info["url"],
                "difficulty":   info["difficulty"],
                "category":     info["category"],
                "tags":         info["tags"],
            }
            results.append(result)
            print(f'✓  {info["title"][:60]}')
        else:
            results.append({
                "id":           project["id"],
                "oldTitle":     project["title"],
                "creator":      project["creator"],
                "productCode":  code,
                "newTitle":     None,
                "newSourceUrl": None,
                "difficulty":   None,
                "category":     None,
                "tags":         [],
            })
            print("✗  not found")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    pct = found / len(sample) * 100
    print(f"\n{'='*60}")
    print(f"Results: {found}/{len(sample)} patterns found ({pct:.0f}%)")
    print(f"Output:  {OUT_JSON}")

    print(f"\n{'OLD TITLE':<28} {'NEW TITLE':<45} {'CATEGORY':<14} DIFFICULTY")
    print("-" * 105)
    for r in results[:20]:
        print(
            f"{(r['oldTitle'] or '—')[:27]:<28} "
            f"{(r['newTitle'] or '—')[:44]:<45} "
            f"{(r['category'] or '—')[:13]:<14} "
            f"{r['difficulty'] or '—'}"
        )

    print(f"\nOnce satisfied, run the full merge script to update projects.json.")


if __name__ == "__main__":
    main()
