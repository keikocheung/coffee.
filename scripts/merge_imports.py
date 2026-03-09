#!/usr/bin/env python3
"""
Validates and merges an import JSON file into data/projects.json.
Deduplicates by sourceUrl. Validates required fields before writing.

Usage (run from project root):
    python3 scripts/merge_imports.py scripts/output/youtube_channel.json
    python3 scripts/merge_imports.py scripts/output/blog_example.json
    python3 scripts/merge_imports.py scripts/output/etsy_shop.json
"""

import json, os, re, sys
from collections import Counter

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
DATA_JSON    = os.path.join(PROJECT_ROOT, "data", "projects.json")

REQUIRED_FIELDS = {"id", "title", "creator", "sourceType", "sourceUrl", "category"}
VALID_SOURCE_TYPES = {"YouTube", "Etsy", "PDF", "Blog", "Gumroad"}
VALID_CATEGORIES = {
    "clothing", "hats", "scarves & shawls", "blankets", "bags",
    "amigurumi", "home decor", "accessories", "baby",
}

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def validate_entry(entry: dict, i: int) -> list[str]:
    """Return a list of validation errors for an entry."""
    errors = []
    for field in REQUIRED_FIELDS:
        if not entry.get(field):
            errors.append(f"  Entry {i}: missing required field '{field}'")
    if entry.get("sourceType") and entry["sourceType"] not in VALID_SOURCE_TYPES:
        errors.append(f"  Entry {i}: invalid sourceType '{entry['sourceType']}' (must be one of {VALID_SOURCE_TYPES})")
    if entry.get("category") and entry["category"] not in VALID_CATEGORIES:
        errors.append(f"  Entry {i}: invalid category '{entry['category']}' (must be one of {VALID_CATEGORIES})")
    return errors


def ensure_unique_id(entry: dict, existing_ids: set) -> str:
    """Generate a unique ID if the entry's ID already exists."""
    base_id = entry.get("id") or slugify(entry.get("title", "entry"))
    candidate = base_id
    suffix = 1
    while candidate in existing_ids:
        candidate = f"{base_id}-{suffix}"
        suffix += 1
    return candidate


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/merge_imports.py PATH_TO_IMPORT.json")
        sys.exit(1)

    import_path = sys.argv[1]
    if not os.path.exists(import_path):
        print(f"Error: File not found: {import_path}")
        sys.exit(1)

    # Load import file
    print(f"Loading import file: {import_path}")
    with open(import_path, encoding="utf-8") as f:
        new_entries = json.load(f)

    if not isinstance(new_entries, list):
        print("Error: Import file must be a JSON array")
        sys.exit(1)
    print(f"  {len(new_entries)} entries in import file")

    # Validate
    print("\nValidating entries...")
    all_errors = []
    for i, entry in enumerate(new_entries):
        all_errors.extend(validate_entry(entry, i))

    if all_errors:
        print(f"  {len(all_errors)} validation error(s) found:")
        for err in all_errors[:20]:
            print(err)
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more")
        answer = input("\nContinue anyway, skipping invalid entries? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            sys.exit(1)
        # Remove invalid entries
        new_entries = [e for i, e in enumerate(new_entries) if not validate_entry(e, i)]
        print(f"  Proceeding with {len(new_entries)} valid entries")
    else:
        print(f"  ✓ All entries valid")

    # Load existing data
    print(f"\nLoading existing data: {DATA_JSON}")
    with open(DATA_JSON, encoding="utf-8") as f:
        existing = json.load(f)
    print(f"  {len(existing)} existing entries")

    # Build dedup indexes
    existing_urls = {e.get("sourceUrl", "").strip() for e in existing if e.get("sourceUrl")}
    existing_ids  = {e.get("id", "") for e in existing}

    # Filter duplicates and assign unique IDs
    added = []
    skipped_dupes = 0

    for entry in new_entries:
        url = (entry.get("sourceUrl") or "").strip()
        if url and url in existing_urls:
            skipped_dupes += 1
            continue

        entry["id"] = ensure_unique_id(entry, existing_ids)
        existing_ids.add(entry["id"])
        if url:
            existing_urls.add(url)

        # Set defaults for optional fields
        entry.setdefault("isFree", True)
        entry.setdefault("tags", [])

        added.append(entry)

    if not added:
        print(f"\nNothing to add — all {skipped_dupes} entries were duplicates.")
        sys.exit(0)

    # Category breakdown of new entries
    cats = Counter(e.get("category", "unknown") for e in added)

    # Write
    print(f"\nWriting {DATA_JSON}...")
    merged = existing + added
    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    # Summary
    print(f"\n{'='*60}")
    print(f"Added:    {len(added)} new entries")
    print(f"Skipped:  {skipped_dupes} duplicates (same sourceUrl)")
    print(f"Total:    {len(merged)} entries in database")
    print(f"\nNew entries by category:")
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")
    print(f"\n✓ {DATA_JSON} updated")


if __name__ == "__main__":
    main()
