#!/usr/bin/env python3
"""
Imports all videos from a YouTube channel as pattern entries.
Uses YouTube Data API v3 (free, 10,000 units/day).

Usage (run from project root):
    python3 scripts/scrape_youtube.py https://youtube.com/@ChannelName YOUR_API_KEY
    # Or set YOUTUBE_API_KEY env var:
    YOUTUBE_API_KEY=xxx python3 scripts/scrape_youtube.py https://youtube.com/@ChannelName

Output: scripts/output/youtube_[channel].json
Then merge with: python3 scripts/merge_imports.py scripts/output/youtube_[channel].json
"""

import json, os, re, sys, time, hashlib
from urllib.parse import urlparse, parse_qs
import requests

PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_IMG   = os.path.join(PROJECT_ROOT, "public", "patterns", "images")
OUT_DIR      = os.path.join(os.path.dirname(__file__), "output")

YT_API_BASE  = "https://www.googleapis.com/youtube/v3"

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


# ── YouTube API helpers ───────────────────────────────────────────────────────

def resolve_channel_id(channel_input: str, api_key: str) -> tuple[str, str]:
    """
    Resolve a YouTube channel URL to (channel_id, channel_name).
    Handles @handle, /channel/ID, /c/customname formats.
    """
    # Extract handle or ID from URL
    parsed = urlparse(channel_input)
    path = parsed.path.strip("/")

    if path.startswith("channel/"):
        channel_id = path.split("/")[1]
        # Fetch name
        resp = SESSION.get(f"{YT_API_BASE}/channels", params={
            "part": "snippet", "id": channel_id, "key": api_key
        }).json()
        name = resp["items"][0]["snippet"]["title"] if resp.get("items") else channel_id
        return channel_id, name

    # @handle or /c/name — use search API
    handle = path.lstrip("@").split("/")[0]
    if path.startswith("@"):
        resp = SESSION.get(f"{YT_API_BASE}/channels", params={
            "part": "snippet,id", "forHandle": "@" + handle, "key": api_key
        }).json()
    else:
        resp = SESSION.get(f"{YT_API_BASE}/channels", params={
            "part": "snippet,id", "forUsername": handle, "key": api_key
        }).json()

    items = resp.get("items", [])
    if not items:
        # Last resort: search
        resp = SESSION.get(f"{YT_API_BASE}/search", params={
            "part": "snippet", "q": handle, "type": "channel", "maxResults": 1, "key": api_key
        }).json()
        items = resp.get("items", [])
        if items:
            channel_id = items[0]["snippet"]["channelId"]
            name = items[0]["snippet"]["channelTitle"]
            return channel_id, name
        raise ValueError(f"Could not resolve channel: {channel_input}")

    channel_id = items[0]["id"]
    name = items[0]["snippet"]["title"]
    return channel_id, name


def fetch_all_videos(channel_id: str, api_key: str) -> list[dict]:
    """Fetch all video metadata from a channel using search endpoint with pagination."""
    videos = []
    next_page_token = None
    page = 1

    while True:
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "type": "video",
            "maxResults": 50,
            "order": "date",
            "key": api_key,
        }
        if next_page_token:
            params["pageToken"] = next_page_token

        resp = SESSION.get(f"{YT_API_BASE}/search", params=params, timeout=15)
        data = resp.json()

        if "error" in data:
            print(f"  YouTube API error: {data['error']['message']}")
            break

        items = data.get("items", [])
        videos.extend(items)
        print(f"    Page {page}: {len(items)} videos (total: {len(videos)})")

        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break
        page += 1
        time.sleep(0.3)

    return videos


def download_thumbnail(thumbnail_url: str, video_id: str) -> str | None:
    """Download a YouTube thumbnail and return the /patterns/images/ path."""
    if not thumbnail_url:
        return None
    try:
        resp = SESSION.get(thumbnail_url, timeout=15, stream=True)
        resp.raise_for_status()
        filename = f"yt_{video_id}.jpg"
        dst = os.path.join(PUBLIC_IMG, filename)
        if not os.path.exists(dst):
            with open(dst, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
        return f"/patterns/images/{filename}"
    except Exception:
        return None


def is_craft_video(title: str, description: str) -> bool:
    """Filter to crochet/knitting content only."""
    combined = (title + " " + description[:500]).lower()
    craft_terms = [
        "crochet", "knit", "knitting", "yarn", "stitch", "pattern",
        "amigurumi", "granny square", "hook", "needle", "fiber",
    ]
    return any(term in combined for term in craft_terms)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/scrape_youtube.py CHANNEL_URL [API_KEY]")
        print("  Or set YOUTUBE_API_KEY environment variable")
        sys.exit(1)

    channel_input = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        print("Error: YouTube API key required. Pass as argument or set YOUTUBE_API_KEY env var.")
        print("Get a free key at: https://console.cloud.google.com/apis/library/youtube.googleapis.com")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_IMG, exist_ok=True)

    print(f"\nResolving channel: {channel_input}")
    channel_id, channel_name = resolve_channel_id(channel_input, api_key)
    print(f"  Channel: {channel_name} (ID: {channel_id})")

    print(f"\nFetching all videos...")
    raw_videos = fetch_all_videos(channel_id, api_key)
    print(f"  Total videos: {len(raw_videos)}")

    # Filter to craft videos
    craft_videos = [v for v in raw_videos if is_craft_video(
        v["snippet"].get("title", ""),
        v["snippet"].get("description", ""),
    )]
    print(f"  Craft-related videos: {len(craft_videos)}")

    print(f"\nDownloading thumbnails and building entries...")
    projects = []
    channel_slug = slugify(channel_name)

    for i, video in enumerate(craft_videos, 1):
        snippet = video["snippet"]
        video_id = video["id"]["videoId"] if isinstance(video["id"], dict) else video["id"]
        title = snippet.get("title", "Untitled")
        description = snippet.get("description", "")
        combined_text = title + " " + description

        # Best thumbnail
        thumbnails = snippet.get("thumbnails", {})
        thumb_url = (
            thumbnails.get("maxres", {}).get("url")
            or thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
        )

        category = get_category(combined_text)
        tags = build_tags(combined_text, category)

        # Difficulty from title/description
        lowered = combined_text.lower()
        if "beginner" in lowered or "easy" in lowered:
            difficulty = "beginner"
        elif "advanced" in lowered:
            difficulty = "advanced"
        elif "intermediate" in lowered:
            difficulty = "intermediate"
        else:
            difficulty = None

        # Download thumbnail
        img_path = download_thumbnail(thumb_url, video_id)
        print(f"  [{i}/{len(craft_videos)}] {title[:60]} → {category}")

        projects.append({
            "id": f"yt-{channel_slug}-{video_id}",
            "title": title,
            "creator": channel_name,
            "sourceType": "YouTube",
            "isFree": True,
            "sourceUrl": f"https://www.youtube.com/watch?v={video_id}",
            "category": category,
            "tags": tags,
            "imageFile": img_path,
            "patternText": description[:500] if description else None,
            "difficulty": difficulty,
        })

    out_path = os.path.join(OUT_DIR, f"youtube_{channel_slug}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Channel:  {channel_name}")
    print(f"Imported: {len(projects)} craft videos")
    print(f"Skipped:  {len(raw_videos) - len(craft_videos)} non-craft videos")
    print(f"Output:   {out_path}")
    print(f"\nTo add to the app:")
    print(f"  python3 scripts/merge_imports.py {out_path}")


if __name__ == "__main__":
    main()
