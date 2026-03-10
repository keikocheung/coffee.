import Anthropic from "@anthropic-ai/sdk";
import type { Category } from "@/lib/projects";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ImageAnalysis {
  craftType: string;
  techniques: string[];
  suggestedTags: string[];
  suggestedCategory: Category | null;
}

const ALLOWED_TAGS = [
  // item types
  "accessories", "amigurumi", "baby", "bags", "blankets", "clothing",
  "hats", "home-decor", "scarves-shawls",
  // plush / stuffed
  "plush", "stuffed-animal", "food-amigurumi",
  // specialty items
  "flowers", "botanical", "holiday", "seasonal",
  "slippers", "shoes", "pet",
  "jewelry", "keychain", "washcloth", "market-bag",
  "baby-blanket", "bootie",
  // techniques / difficulty
  "beginner", "intermediate", "advanced",
  "cable", "colorwork", "granny-square", "lace", "tapestry", "fair-isle",
];

const ALLOWED_CATEGORIES = [
  "clothing", "hats", "scarves & shawls", "blankets", "bags",
  "amigurumi", "home decor", "accessories", "miscellaneous"
];

const PROMPT = `You are a craft pattern expert analyzing a photo of a handmade crochet or knitting project.

Identify what you see and return ONLY a valid JSON object (no markdown, no explanation):
{
  "craftType": "short description of the item, e.g. crocheted plush bunny",
  "techniques": ["list", "of", "visible", "techniques"],
  "suggestedTags": ["2 to 5 tags from the allowed list below"],
  "suggestedCategory": "one category from the allowed list, or null if uncertain"
}

CATEGORY GUIDE — choose the most specific match:
- "clothing" — wearable garments: sweaters, cardigans, tops, dresses, vests, jackets, skirts
- "hats" — any head covering: beanies, bucket hats, berets, sun hats, bonnets
- "scarves & shawls" — scarves, cowls, infinity scarves, shawls, wraps, stoles
- "blankets" — blankets, afghans, throws, lap blankets, baby blankets
- "bags" — bags, totes, purses, backpacks, pouches, market bags, clutches
- "amigurumi" — Japanese-style crochet toys: exaggerated features, big round eyes, chibi/anime aesthetic, kawaii style. If it has big cute eyes and rounded anime proportions, use this.
- "home decor" — home items: pillows, wall hangings, plant hangers, baskets, coasters, dishcloths, rugs, pot holders
- "accessories" — wearable accessories: gloves, mittens, socks, headbands, ear warmers, leg warmers, wrist cuffs, collars
- "miscellaneous" — use for everything that doesn't clearly fit above: baby items (booties, bibs, onesies, loveys), slippers/shoes, flowers/botanicals, holiday/seasonal items, food items, pet accessories, jewelry, keychains, face pads/washcloths, western-style plush/stuffed animals that are NOT amigurumi style

TAG GUIDE for plush vs amigurumi:
- Use "amigurumi" tag + "amigurumi" category for: anime-style, big eyes, kawaii, chibi proportions
- Use "plush" or "stuffed-animal" tag + "miscellaneous" category for: realistic animals, western-style stuffed toys, no exaggerated anime features
- Use "food-amigurumi" tag + "amigurumi" category for: crochet food items made in amigurumi style (sushi, fruit, donuts)

ALLOWED TAGS (use exact strings only, no variations):
${ALLOWED_TAGS.join(", ")}

ALLOWED CATEGORIES (use exact strings only):
${ALLOWED_CATEGORIES.join(", ")}

Do NOT invent tags or categories. Only use the exact strings listed above.`;

export async function analyzeImage(
  imageBase64: string,
  mimeType: string
): Promise<ImageAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  const parse = (raw: string): ImageAnalysis => {
    const parsed = JSON.parse(raw.trim());
    return {
      craftType: parsed.craftType ?? "unknown craft",
      techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.filter((t: string) => ALLOWED_TAGS.includes(t))
        : [],
      suggestedCategory: ALLOWED_CATEGORIES.includes(parsed.suggestedCategory)
        ? (parsed.suggestedCategory as Category)
        : null,
    };
  };

  try {
    return parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return parse(match[0]);
      } catch {
        // fall through
      }
    }
    return { craftType: "unknown craft", techniques: [], suggestedTags: [], suggestedCategory: null };
  }
}
