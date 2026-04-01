import "server-only";

export type PromptChainGenerateInput = {
  flavorId: string;
  imageUrl: string;
  imageDescription?: string;
  flavor?: Record<string, unknown> | null;
  steps?: Record<string, unknown>[];
};

export type PromptChainGenerateResult = {
  captions: string[];
  endpoint: string;
  raw: unknown;
};

const DEFAULT_API_BASE = "https://api.almostcrackd.ai";
const ENDPOINT_CANDIDATES = [
  "/captions/generate",
  "/generate-captions",
  "/api/captions/generate",
];

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const text =
          (typeof obj.caption === "string" && obj.caption) ||
          (typeof obj.content === "string" && obj.content) ||
          (typeof obj.text === "string" && obj.text) ||
          "";
        return text.trim();
      }
      return "";
    })
    .filter(Boolean);
}

function extractCaptions(payload: unknown): string[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return toStringArray(payload);
  }

  if (typeof payload === "string") {
    return payload.trim() ? [payload.trim()] : [];
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const directKeys = [
    "captions",
    "generated_captions",
    "results",
    "output",
    "data",
    "items",
  ];

  for (const key of directKeys) {
    const direct = toStringArray(obj[key]);
    if (direct.length > 0) {
      return direct;
    }

    const nested = extractCaptions(obj[key]);
    if (nested.length > 0) {
      return nested;
    }
  }

  const fallbackSingle =
    (typeof obj.caption === "string" && obj.caption.trim()) ||
    (typeof obj.content === "string" && obj.content.trim()) ||
    (typeof obj.text === "string" && obj.text.trim()) ||
    "";

  return fallbackSingle ? [fallbackSingle] : [];
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export async function generateFlavorCaptionsViaApi(
  input: PromptChainGenerateInput,
): Promise<PromptChainGenerateResult> {
  const base = normalizeBaseUrl(process.env.ALMOSTCRACKD_API_URL || DEFAULT_API_BASE);

  const requestBody = {
    image_url: input.imageUrl,
    imageUrl: input.imageUrl,
    image_description: input.imageDescription ?? null,
    imageDescription: input.imageDescription ?? null,
    humor_flavor_id: input.flavorId,
    humorFlavorId: input.flavorId,
    flavor: input.flavor ?? null,
    steps: input.steps ?? [],
  };

  const errors: string[] = [];

  for (const endpoint of ENDPOINT_CANDIDATES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${base}${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        cache: "no-store",
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        const message = asObject(payload)?.message;
        errors.push(
          `${endpoint}: ${typeof message === "string" ? message : `HTTP ${response.status}`}`,
        );
        continue;
      }

      const captions = extractCaptions(payload);
      if (captions.length === 0) {
        errors.push(`${endpoint}: no captions returned in response body`);
        continue;
      }

      return {
        captions,
        endpoint: `${base}${endpoint}`,
        raw: payload,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown request error";
      errors.push(`${endpoint}: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Caption generation failed. Tried endpoints: ${errors.join(" | ")}`);
}
