import "server-only";

const DEFAULT_API_BASE = "https://api.almostcrackd.ai";

export const SUPPORTED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
] as const;

export type SupportedImageContentType = (typeof SUPPORTED_IMAGE_CONTENT_TYPES)[number];

type PresignedUrlResponse = {
  presignedUrl: string;
  cdnUrl: string;
};

type RegisterImageResponse = {
  imageId: string;
  now?: number;
};

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
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

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  const obj = toObject(payload);
  if (!obj) {
    return null;
  }

  if (typeof obj.message === "string") {
    return obj.message;
  }

  const nestedError = toObject(obj.error);
  if (nestedError && typeof nestedError.message === "string") {
    return nestedError.message;
  }

  return null;
}

function ensureSupportedContentType(contentType: string): SupportedImageContentType {
  const normalized = contentType.trim().toLowerCase();
  const matched = SUPPORTED_IMAGE_CONTENT_TYPES.find((supported) => supported === normalized);

  if (!matched) {
    throw new Error(
      `Unsupported image content type: ${contentType || "(empty)"}. Supported types: ${SUPPORTED_IMAGE_CONTENT_TYPES.join(", ")}`,
    );
  }

  return matched;
}

function inferTypeFromFileName(fileName: string): SupportedImageContentType | null {
  const lowered = fileName.trim().toLowerCase();
  if (lowered.endsWith(".jpg") || lowered.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowered.endsWith(".png")) {
    return "image/png";
  }
  if (lowered.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowered.endsWith(".gif")) {
    return "image/gif";
  }
  if (lowered.endsWith(".heic")) {
    return "image/heic";
  }
  return null;
}

export function resolvePipelineContentType(file: File): SupportedImageContentType {
  const browserType = file.type?.trim();
  if (browserType) {
    return ensureSupportedContentType(browserType);
  }

  const inferred = inferTypeFromFileName(file.name);
  if (inferred) {
    return inferred;
  }

  throw new Error(
    `Unable to determine file content type for ${file.name || "uploaded file"}. Please upload a supported image type.`,
  );
}

async function callPipelineJson<T>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const base = normalizeBaseUrl(process.env.ALMOSTCRACKD_API_URL || DEFAULT_API_BASE);
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const details = extractErrorMessage(payload) || `HTTP ${response.status}`;
    throw new Error(`Pipeline request failed (${path}): ${details}`);
  }

  return payload as T;
}

export async function generatePresignedUploadUrl(params: {
  accessToken: string;
  contentType: SupportedImageContentType;
}): Promise<PresignedUrlResponse> {
  const payload = await callPipelineJson<unknown>(
    "/pipeline/generate-presigned-url",
    params.accessToken,
    { contentType: params.contentType },
  );

  const obj = toObject(payload);
  const presignedUrl = typeof obj?.presignedUrl === "string" ? obj.presignedUrl : "";
  const cdnUrl = typeof obj?.cdnUrl === "string" ? obj.cdnUrl : "";

  if (!presignedUrl || !cdnUrl) {
    throw new Error("Pipeline response is missing presignedUrl or cdnUrl.");
  }

  return { presignedUrl, cdnUrl };
}

export async function uploadImageBytesToPresignedUrl(params: {
  presignedUrl: string;
  file: File;
  contentType: SupportedImageContentType;
}): Promise<void> {
  const uploadResponse = await fetch(params.presignedUrl, {
    method: "PUT",
    headers: {
      "content-type": params.contentType,
    },
    body: params.file,
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    throw new Error(`Presigned upload failed with HTTP ${uploadResponse.status}.`);
  }
}

export async function registerImageUrlWithPipeline(params: {
  accessToken: string;
  imageUrl: string;
  isCommonUse: boolean;
}): Promise<RegisterImageResponse> {
  const payload = await callPipelineJson<unknown>(
    "/pipeline/upload-image-from-url",
    params.accessToken,
    {
      imageUrl: params.imageUrl,
      isCommonUse: params.isCommonUse,
    },
  );

  const obj = toObject(payload);
  const imageId = typeof obj?.imageId === "string" ? obj.imageId : "";

  if (!imageId) {
    throw new Error("Pipeline response is missing imageId.");
  }

  const now = typeof obj?.now === "number" ? obj.now : undefined;
  return { imageId, now };
}

export async function generateCaptionsForImage(params: {
  accessToken: string;
  imageId: string;
  humorFlavorId?: string;
}): Promise<unknown> {
  const body: Record<string, unknown> = { imageId: params.imageId };
  if (params.humorFlavorId) {
    body.humorFlavorId = params.humorFlavorId;
  }

  return callPipelineJson<unknown>("/pipeline/generate-captions", params.accessToken, body);
}

export async function uploadAndRegisterImageWithPipeline(params: {
  accessToken: string;
  file: File;
  isCommonUse: boolean;
}): Promise<{ imageId: string; cdnUrl: string; contentType: SupportedImageContentType; now?: number }> {
  const contentType = resolvePipelineContentType(params.file);
  const generated = await generatePresignedUploadUrl({
    accessToken: params.accessToken,
    contentType,
  });

  await uploadImageBytesToPresignedUrl({
    presignedUrl: generated.presignedUrl,
    file: params.file,
    contentType,
  });

  const registered = await registerImageUrlWithPipeline({
    accessToken: params.accessToken,
    imageUrl: generated.cdnUrl,
    isCommonUse: params.isCommonUse,
  });

  return {
    imageId: registered.imageId,
    cdnUrl: generated.cdnUrl,
    contentType,
    now: registered.now,
  };
}
