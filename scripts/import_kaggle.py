#!/usr/bin/env python3
"""
Converts the Kaggle crochet dataset to data/projects.json and copies images.
Run from project root: python3 scripts/import_kaggle.py
"""

import json, os, re, shutil

DATASET_PATH = os.path.expanduser("~/Downloads/Final Crochet Data")
JSON_FILE    = "final_cleaned_patterns.json"

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_IMG   = os.path.join(PROJECT_ROOT, "public", "patterns", "images")
OUT_JSON     = os.path.join(PROJECT_ROOT, "data", "projects.json")

BRAND_MAP = {
    "BRC": ("Bernat",       "https://www.yarnspirations.com/collections/bernat-patterns"),
    "RHC": ("Red Heart",    "https://www.redheart.com/free-patterns"),
    "CAC": ("Caron",        "https://www.yarnspirations.com/collections/caron-patterns"),
    "ALC": ("Aunt Lydia's", "https://www.yarnspirations.com/collections/aunt-lydias-patterns"),
    "PAC": ("Patons",       "https://www.yarnspirations.com/collections/patons-patterns"),
    "PCS": ("Patons",       "https://www.yarnspirations.com/collections/patons-patterns"),
    "LBC": ("Lion Brand",   "https://www.lionbrand.com/collections/free-patterns"),
}

# ── Category buckets ─────────────────────────────────────────────────────────
# Each entry: (keywords_that_trigger_this_category, category_value)
CATEGORY_RULES = [
    (["amigurumi", "stuffed", "plushie", "toy", "doll", "puppet"], "amigurumi"),
    (["sweater", "cardigan", "hoodie", "pullover", "jacket", "vest", "tunic",
      "poncho", "coat", "blouse", "shirt", "top "], "clothing"),
    (["hat", "beanie", "beret", "toque", "cap", "ear warmer"], "hats"),
    (["cowl", "scarf", "shawl", "wrap", "stole", "snood"], "scarves & shawls"),
    (["socks", "mitten", "gloves", "wrist", "fingerless", "boot cuff"], "accessories"),
    (["blanket", "throw", "afghan", "quilt"], "blankets"),
    (["bag", "tote", "purse", "pouch", "backpack", "clutch"], "bags"),
    (["basket", "bowl", "storage", "organizer"], "home decor"),
    (["pillow", "cushion", "coaster", "dishcloth", "washcloth",
      "rug", "placemat", "table runner", "wall hanging", "wreath",
      "garland", "mobile", "ornament"], "home decor"),
    (["baby", "infant", "newborn", "toddler"], "baby"),
]
DEFAULT_CATEGORY = "clothing"  # fallback

# ── Adjective modifiers that improve titles ───────────────────────────────────
MODIFIERS = [
    "ribbed", "cable", "lacy", "lace", "granny square", "granny",
    "striped", "colorblock", "color block", "textured", "chunky",
    "bulky", "lightweight", "oversized", "cropped", "fitted",
    "hooded", "reversible", "sleeveless", "long sleeve", "short sleeve",
    "baby", "toddler", "girls", "boys", "mens", "womens", "ladies",
    "cozy", "classic", "modern", "simple", "basic", "easy",
]

# Primary project-type keywords (most specific first)
TITLE_KEYWORDS = [
    # Amigurumi / toys
    "amigurumi", "stuffed animal", "plushie", "plush toy", "toy",
    # Garments
    "hoodie", "cardigan", "pullover", "turtleneck", "tunic", "poncho",
    "vest", "sweater", "jacket", "coat", "top",
    # Baby garments
    "baby sweater", "baby jacket", "baby hoodie", "baby blanket",
    # Hats
    "ear warmer", "beret", "toque", "beanie", "hat",
    # Neck / shoulder
    "infinity scarf", "cowl", "snood", "scarf", "shawl", "wrap", "stole",
    # Hands / feet
    "fingerless gloves", "mittens", "gloves", "socks", "boot cuffs",
    # Blankets
    "throw blanket", "baby blanket", "lap blanket", "afghan", "throw", "blanket",
    # Bags
    "backpack", "tote bag", "shoulder bag", "clutch", "purse", "bag",
    # Home
    "basket", "storage bin", "pin cushion", "jar cover", "plant hanger",
    "wall hanging", "wreath", "garland", "mobile",
    "throw pillow", "pillow", "cushion",
    "coaster", "dishcloth", "washcloth", "pot holder", "oven mitt",
    "rug", "table runner", "placemat",
]

def get_category(text: str) -> str:
    lowered = text.lower()
    for keywords, category in CATEGORY_RULES:
        for kw in keywords:
            if kw in lowered:
                return category
    return DEFAULT_CATEGORY

def extract_title(pattern_text: str, creator: str) -> str:
    lowered = pattern_text.lower()

    # Find the best project keyword
    matched_kw = None
    for kw in TITLE_KEYWORDS:
        if kw in lowered:
            matched_kw = kw.title()
            break

    if not matched_kw:
        return f"{creator} Pattern"

    # Look for a modifier in the 100 chars before the first occurrence of the keyword
    idx = lowered.find(matched_kw.lower())
    context = lowered[max(0, idx - 100): idx]

    found_mod = None
    for mod in MODIFIERS:
        if mod in context:
            found_mod = mod.title()
            break

    if found_mod:
        return f"{found_mod} {matched_kw}"
    return matched_kw

def build_tags(pattern_text: str, category: str) -> list:
    tags = {category.replace(" & ", "-").replace(" ", "-")}
    lowered = pattern_text.lower()
    if "beginner" in lowered or "easy" in lowered:
        tags.add("beginner")
    elif "advanced" in lowered:
        tags.add("advanced")
    elif "intermediate" in lowered:
        tags.add("intermediate")
    for kw in ["baby", "amigurumi", "colorwork", "cable", "lace", "granny square"]:
        if kw in lowered:
            tags.add(kw.replace(" ", "-"))
    return sorted(tags)[:8]

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

def main():
    json_path = os.path.join(DATASET_PATH, JSON_FILE)
    print(f"Reading {json_path} ...")
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"  {len(data)} entries")

    os.makedirs(PUBLIC_IMG, exist_ok=True)

    projects = []
    for i, entry in enumerate(data):
        img_rel = entry.get("image", "")
        pattern = entry.get("cleaned_pattern", "")

        img_stem   = os.path.splitext(os.path.basename(img_rel))[0]
        brand_code = img_stem[:3].upper()
        creator, source_url = BRAND_MAP.get(brand_code, ("Unknown", ""))

        category = get_category(pattern)
        title    = extract_title(pattern, creator)

        # Copy image
        src_img = os.path.join(DATASET_PATH, "final_images", img_rel)
        img_filename = os.path.basename(img_rel)
        dst_img = os.path.join(PUBLIC_IMG, img_filename)
        if os.path.exists(src_img) and not os.path.exists(dst_img):
            shutil.copy2(src_img, dst_img)

        projects.append({
            "id":          f"{slugify(title)}-{i}",
            "title":       title,
            "creator":     creator,
            "sourceType":  "PDF",
            "isFree":      True,
            "sourceUrl":   source_url,
            "category":    category,
            "tags":        build_tags(pattern, category),
            "imageFile":   f"/patterns/images/{img_filename}",
            "patternText": pattern.strip(),
        })

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    # Print category breakdown
    from collections import Counter
    cats = Counter(p["category"] for p in projects)
    print("\nCategory breakdown:")
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")
    print(f"\n✓ Wrote {len(projects)} projects to {OUT_JSON}")

if __name__ == "__main__":
    main()
