import "server-only";

import { generateCaptionsForImage } from "@/lib/pipeline/client";

export type PromptChainGenerateInput = {
  accessToken: string;
  imageId: string;
  flavorId?: string;
};

export type PromptChainGenerateResult = {
  captions: string[];
  endpoint: string;
  raw: unknown;
};

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

export async function generateFlavorCaptionsViaApi(
  input: PromptChainGenerateInput,
): Promise<PromptChainGenerateResult> {
  const raw = await generateCaptionsForImage({
    accessToken: input.accessToken,
    imageId: input.imageId,
    humorFlavorId: input.flavorId,
  });

  const captions = extractCaptions(raw);
  if (captions.length === 0) {
    throw new Error("Pipeline generated no captions.");
  }

  return {
    captions,
    endpoint: `${normalizeBaseUrl(process.env.ALMOSTCRACKD_API_URL || "https://api.almostcrackd.ai")}/pipeline/generate-captions`,
    raw,
  };
}
