"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAuthWithAccessToken } from "@/lib/auth";
import { uploadAndRegisterImageWithPipeline } from "@/lib/pipeline/client";

export async function createImage(formData: FormData) {
  const { accessToken } = await requireAuthWithAccessToken();
  const admin = createSupabaseAdminClient();

  const url = formData.get("url") as string;
  const image_description = formData.get("image_description") as string;
  const additional_context = formData.get("additional_context") as string;
  const is_public = formData.get("is_public") === "on";
  const is_common_use = formData.get("is_common_use") === "on";

  const fileEntry = formData.get("image_file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  const payload: Record<string, unknown> = {
    image_description: image_description || null,
    additional_context: additional_context || null,
    is_public,
    is_common_use,
  };

  const trimmedUrl = String(url || "").trim();
  if (trimmedUrl) {
    payload.url = trimmedUrl;
  }

  let pipelineImageId: string | null = null;
  if (file) {
    const uploaded = await uploadAndRegisterImageWithPipeline({
      accessToken,
      file,
      isCommonUse: is_common_use,
    });

    payload.url = uploaded.cdnUrl;
    payload.mime_type = uploaded.contentType;
    payload.file_size_bytes = file.size;
    pipelineImageId = uploaded.imageId;
  }

  if (!payload.url) {
    return { error: "Provide an image URL or upload a file." };
  }

  if (pipelineImageId) {
    const { data: updatedRows, error: updateExistingError } = await admin
      .from("images")
      .update(payload)
      .eq("id", pipelineImageId)
      .select("id")
      .limit(1);

    if (updateExistingError) {
      return { error: updateExistingError.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertWithIdError } = await admin
        .from("images")
        .insert({ id: pipelineImageId, ...payload });

      if (insertWithIdError) {
        const { error: fallbackInsertError } = await admin.from("images").insert(payload);
        if (fallbackInsertError) {
          return { error: fallbackInsertError.message };
        }
      }
    }
  } else {
    const { error } = await admin.from("images").insert(payload);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}

export async function updateImage(formData: FormData) {
  const { accessToken } = await requireAuthWithAccessToken();
  const admin = createSupabaseAdminClient();

  const id = formData.get("id") as string;
  const url = formData.get("url") as string;
  const image_description = formData.get("image_description") as string;
  const additional_context = formData.get("additional_context") as string;
  const is_public = formData.get("is_public") === "on";
  const is_common_use = formData.get("is_common_use") === "on";

  const fileEntry = formData.get("image_file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  const payload: Record<string, unknown> = {
    image_description: image_description || null,
    additional_context: additional_context || null,
    is_public,
    is_common_use,
  };

  const trimmedUrl = String(url || "").trim();
  if (trimmedUrl) {
    payload.url = trimmedUrl;
  }

  if (file) {
    const uploaded = await uploadAndRegisterImageWithPipeline({
      accessToken,
      file,
      isCommonUse: is_common_use,
    });

    payload.url = uploaded.cdnUrl;
    payload.mime_type = uploaded.contentType;
    payload.file_size_bytes = file.size;
  }

  const { error } = await admin
    .from("images")
    .update(payload)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}

export async function deleteImage(formData: FormData) {
  await requireAuth();
  const admin = createSupabaseAdminClient();

  const id = formData.get("id") as string;

  const { error } = await admin.from("images").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}
