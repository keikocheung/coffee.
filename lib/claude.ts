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
  "accessories", "amigurumi", "baby", "bags", "beginner", "blankets",
  "cable", "clothing", "colorwork", "granny-square", "hats", "home-decor",
  "intermediate", "lace", "scarves-shawls"
];

const ALLOWED_CATEGORIES = [
  "clothing", "hats", "scarves & shawls", "blankets", "bags",
  "amigurumi", "home decor", "accessories", "baby"
];

const PROMPT = `You are a craft pattern expert analyzing a photo of a handmade crochet or knitting project.

Identify what you see and return ONLY a valid JSON object (no markdown, no explanation):
{
  "craftType": "short description of the item, e.g. crocheted amigurumi bear",
  "techniques": ["list", "of", "visible", "techniques"],
  "suggestedTags": ["2 to 5 tags from the allowed list below"],
  "suggestedCategory": "one category from the allowed list, or null if uncertain"
}

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
