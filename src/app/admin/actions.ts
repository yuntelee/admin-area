"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth";
import { getResourceByKey } from "@/lib/admin/resources";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function addStatusToPath(path: string, type: "success" | "error", message: string) {
  const encodedMessage = encodeURIComponent(message);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${type}=${encodedMessage}`;
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

function validateDomain(domain: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateResourcePayload(resourceKey: string, payload: Record<string, unknown>) {
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
    await requireSuperadmin();
    const resourceKey = String(formData.get("resourceKey") ?? "");
    const resource = getResourceByKey(resourceKey);

    if (!resource || (resource.mode !== "crud" && resource.mode !== "images-crud")) {
      throw new Error("Resource is not createable.");
    }

    const payload = parsePayload(formData.get("payload"));
    validateResourcePayload(resourceKey, payload);

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from(resource.table).insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Record created."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create record.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function updateGenericRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin");

  try {
    await requireSuperadmin();
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

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from(resource.table).update(payload).eq("id", rowId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Record updated."));
  } catch (error) {
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
    const message = error instanceof Error ? error.message : "Unable to delete record.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function createOrUpdateImageRecord(formData: FormData) {
  const returnPath = String(formData.get("returnPath") ?? "/admin/images");

  try {
    await requireSuperadmin();
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

    if (url) {
      payload.url = url;
    }

    const fileEntry = formData.get("image_file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    if (file) {
      const admin = createSupabaseAdminClient();
      const bucket = process.env.SUPABASE_IMAGE_BUCKET || "images";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const fileBuffer = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(storagePath);
      payload.url = publicUrlData.publicUrl;
      payload.storage_path = storagePath;
      payload.mime_type = file.type || null;
      payload.file_size_bytes = file.size;
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
      redirect(addStatusToPath(returnPath, "success", "Image updated."));
    }

    const { error } = await admin.from("images").insert(payload);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath(returnPath);
    redirect(addStatusToPath(returnPath, "success", "Image created."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save image.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}
