"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireSuperadmin, requireSuperadminWithAccessToken } from "@/lib/auth";
import { getResourceByKey } from "@/lib/admin/resources";
import { uploadAndRegisterImageWithPipeline } from "@/lib/pipeline/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function addStatusToPath(path: string, type: "success" | "error", message: string) {
  const encodedMessage = encodeURIComponent(message);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${type}=${encodedMessage}`;
}

function rethrowIfRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

function parsePayload(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    throw new Error("Payload is required.");
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Payload must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

function parseScalarByType(value: string, type: string) {
  if (type === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error(`Invalid boolean value: ${value}`);
  }

  if (type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number value: ${value}`);
    }
    return parsed;
  }

  if (type === "json") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new Error("One of the JSON field values is invalid.");
    }
  }

  return value;
}

function parsePayloadFromStructuredFields(formData: FormData) {
  const payload: Record<string, unknown> = {};

  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith("field__")) {
      continue;
    }

    if (typeof rawValue !== "string") {
      continue;
    }

    const fieldName = key.slice("field__".length);
    const value = rawValue.trim();
    if (!fieldName || value === "") {
      continue;
    }

    const typeEntry = formData.get(`field_type__${fieldName}`);
    const type = typeof typeEntry === "string" ? typeEntry : "string";
    payload[fieldName] = parseScalarByType(value, type);
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("Provide at least one field value or a JSON payload.");
  }

  return payload;
}

function validateDomain(domain: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toOptionalInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  throw new Error("Payload.term_type_id must be an integer or null.");
}

async function validateTermsForeignKeys(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  payload: Record<string, unknown>,
) {
  const termTypeId = toOptionalInt(payload.term_type_id);
  payload.term_type_id = termTypeId;

  if (termTypeId === null) {
    return;
  }

  const { data, error } = await admin
    .from("term_types")
    .select("id")
    .eq("id", termTypeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate term_type_id: ${error.message}`);
  }

  if (!data) {
    throw new Error(`term_type_id ${termTypeId} does not exist in term_types.`);
  }
}

function normalizeCaptionExamplesPayload(payload: Record<string, unknown>) {
  const text = [payload.caption, payload.example_text, payload.content, payload.text, payload.example]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;

  if (!text) {
    throw new Error("Payload.caption is required for caption examples.");
  }

  const explanation = [payload.explanation, payload.notes, payload.note, payload.context]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;

  payload.caption = text.trim();
  if (explanation) {
    payload.explanation = explanation.trim();
  }

  if (payload.image_description !== undefined && payload.image_description !== null) {
    payload.image_description = String(payload.image_description).trim();
  }

  if (payload.priority !== undefined && payload.priority !== null && payload.priority !== "") {
    const parsedPriority = Number(payload.priority);
    if (!Number.isInteger(parsedPriority)) {
      throw new Error("Payload.priority must be an integer.");
    }
    payload.priority = parsedPriority;
  }

  if (payload.image_id !== undefined && payload.image_id !== null && payload.image_id !== "") {
    payload.image_id = String(payload.image_id).trim();
  }

  delete payload.id;
  delete payload.created_datetime_utc;
  delete payload.modified_datetime_utc;
  delete payload.created_by_user_id;
  delete payload.modified_by_user_id;
  delete payload.example_text;
  delete payload.content;
  delete payload.text;
  delete payload.example;
  delete payload.notes;
  delete payload.note;
  delete payload.context;
  delete payload.is_active;
}

function validateResourcePayload(resourceKey: string, payload: Record<string, unknown>) {
  if (resourceKey === "humor-flavors") {
    const title = typeof payload.title === "string" ? payload.title : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const slug = typeof payload.slug === "string" ? payload.slug : "";

    const normalizedSlug = normalizeSlug(slug || name || title);
    if (!normalizedSlug) {
      throw new Error("Payload.slug is required for humor flavors.");
    }

    payload.slug = normalizedSlug;
    if (typeof payload.is_pinned !== "boolean") {
      payload.is_pinned = false;
    }

    delete payload.title;
    delete payload.name;
  }

  if (resourceKey === "terms") {
    const term = String(payload.term ?? "").trim();
    const definition = String(payload.definition ?? "").trim();
    const example = String(payload.example ?? "").trim();

    if (!term || !definition || !example) {
      throw new Error("Payload.term, payload.definition, and payload.example are required for terms.");
    }

    payload.term = term;
    payload.definition = definition;
    payload.example = example;
    payload.term_type_id = toOptionalInt(payload.term_type_id);
    delete payload.id;
    delete payload.created_datetime_utc;
    delete payload.modified_datetime_utc;
    delete payload.created_by_user_id;
    delete payload.modified_by_user_id;
    delete payload.category;
  }

  if (resourceKey === "allowed-signup-domains") {
    const domain = String(payload.domain ?? "").trim().toLowerCase();
    if (!domain || !validateDomain(domain)) {
      throw new Error("Payload.domain must be a valid domain, for example: example.com");
    }
    payload.domain = domain;
  }

  if (resourceKey === "whitelisted-email-addresses") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    if (!email || !validateEmail(email)) {
      throw new Error("Payload.email must be a valid email address.");
    }
    payload.email = email;
  }
}

export async function createGenericRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin");

  try {
    const { user } = await requireSuperadmin();
    const resourceKey = String(formData.get("resourceKey") ?? "");
    const resource = getResourceByKey(resourceKey);

    if (!resource || (resource.mode !== "crud" && resource.mode !== "images-crud")) {
      throw new Error("Resource is not createable.");
    }

    const rawPayload = formData.get("payload");
    const payload =
      typeof rawPayload === "string" && rawPayload.trim()
        ? parsePayload(rawPayload)
        : parsePayloadFromStructuredFields(formData);
    validateResourcePayload(resourceKey, payload);

    if (resourceKey === "terms") {
      payload.created_by_user_id = user.id;
      payload.modified_by_user_id = user.id;
    }
    if (resourceKey === "caption-examples") {
      payload.created_by_user_id = user.id;
      payload.modified_by_user_id = user.id;
    }

    const admin = createSupabaseAdminClient();
    if (resourceKey === "terms") {
      await validateTermsForeignKeys(admin, payload);
    }
    if (resourceKey === "caption-examples") {
      normalizeCaptionExamplesPayload(payload);
    }
    const { error } = await admin.from(resource.table).insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Record created."));
  } catch (error) {
    rethrowIfRedirect(error);
    const message = error instanceof Error ? error.message : "Unable to create record.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function updateGenericRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin");

  try {
    const { user } = await requireSuperadmin();
    const resourceKey = String(formData.get("resourceKey") ?? "");
    const rowId = String(formData.get("rowId") ?? "");
    const resource = getResourceByKey(resourceKey);

    if (!resource || (resource.mode !== "crud" && resource.mode !== "read-update" && resource.mode !== "images-crud")) {
      throw new Error("Resource is not updatable.");
    }

    if (!rowId) {
      throw new Error("Missing row id.");
    }

    const payload = parsePayload(formData.get("payload"));
    validateResourcePayload(resourceKey, payload);

    if (resourceKey === "terms") {
      payload.modified_by_user_id = user.id;
    }
    if (resourceKey === "caption-examples") {
      payload.modified_by_user_id = user.id;
    }

    const admin = createSupabaseAdminClient();
    if (resourceKey === "terms") {
      await validateTermsForeignKeys(admin, payload);
    }
    if (resourceKey === "caption-examples") {
      normalizeCaptionExamplesPayload(payload);
    }
    const { error } = await admin.from(resource.table).update(payload).eq("id", rowId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Record updated."));
  } catch (error) {
    rethrowIfRedirect(error);
    const message = error instanceof Error ? error.message : "Unable to update record.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function deleteGenericRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin");

  try {
    await requireSuperadmin();
    const resourceKey = String(formData.get("resourceKey") ?? "");
    const rowId = String(formData.get("rowId") ?? "");
    const resource = getResourceByKey(resourceKey);

    if (!resource || (resource.mode !== "crud" && resource.mode !== "images-crud")) {
      throw new Error("Resource is not deletable.");
    }

    if (!rowId) {
      throw new Error("Missing row id.");
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from(resource.table).delete().eq("id", rowId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Record deleted."));
  } catch (error) {
    rethrowIfRedirect(error);
    const message = error instanceof Error ? error.message : "Unable to delete record.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function createOrUpdateImageRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin/images");

  try {
    const { user, accessToken } = await requireSuperadminWithAccessToken();
    const mode = String(formData.get("mode") ?? "create");
    const rowId = String(formData.get("rowId") ?? "");

    const url = String(formData.get("url") ?? "").trim();
    const imageDescription = String(formData.get("image_description") ?? "").trim();
    const additionalContext = String(formData.get("additional_context") ?? "").trim();
    const isPublic = formData.get("is_public") === "on";
    const isCommonUse = formData.get("is_common_use") === "on";

    const payload: Record<string, unknown> = {
      image_description: imageDescription || null,
      additional_context: additionalContext || null,
      is_public: isPublic,
      is_common_use: isCommonUse,
    };

    if (mode === "update") {
      payload.modified_by_user_id = user.id;
    } else {
      payload.profile_id = user.id;
      payload.created_by_user_id = user.id;
      payload.modified_by_user_id = user.id;
    }

    if (url) {
      payload.url = url;
    }

    const fileEntry = formData.get("image_file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
    let pipelineImageId: string | null = null;

    if (file) {
      const uploaded = await uploadAndRegisterImageWithPipeline({
        accessToken,
        file,
        isCommonUse,
      });

      payload.url = uploaded.cdnUrl;
      pipelineImageId = uploaded.imageId;
    }

    if (!payload.url && mode === "create") {
      throw new Error("Provide an image URL or upload a file.");
    }

    const admin = createSupabaseAdminClient();

    if (mode === "update") {
      if (!rowId) {
        throw new Error("Missing image id.");
      }
      const { error } = await admin.from("images").update(payload).eq("id", rowId);
      if (error) {
        throw new Error(error.message);
      }
      revalidatePath("/admin");
      revalidatePath(returnPath);
      redirect(addStatusToPath(returnPath, "success", "Image updated."));
    }

    if (pipelineImageId) {
      const { data: updatedRows, error: updateExistingError } = await admin
        .from("images")
        .update(payload)
        .eq("id", pipelineImageId)
        .select("id")
        .limit(1);

      if (updateExistingError) {
        throw new Error(updateExistingError.message);
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertWithIdError } = await admin
          .from("images")
          .insert({ id: pipelineImageId, ...payload });

        if (insertWithIdError) {
          const { error: fallbackInsertError } = await admin.from("images").insert(payload);
          if (fallbackInsertError) {
            throw new Error(fallbackInsertError.message);
          }
        }
      }
    } else {
      const { error } = await admin.from("images").insert(payload);
      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Image created."));
  } catch (error) {
    rethrowIfRedirect(error);
    const message = error instanceof Error ? error.message : "Unable to save image.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}
