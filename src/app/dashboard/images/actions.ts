"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth";

export async function createImage(formData: FormData) {
  await requireSuperadmin();
  const admin = createSupabaseAdminClient();

  const url = formData.get("url") as string;
  const image_description = formData.get("image_description") as string;
  const additional_context = formData.get("additional_context") as string;
  const is_public = formData.get("is_public") === "on";
  const is_common_use = formData.get("is_common_use") === "on";

  const { error } = await admin.from("images").insert({
    url,
    image_description: image_description || null,
    additional_context: additional_context || null,
    is_public,
    is_common_use,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}

export async function updateImage(formData: FormData) {
  await requireSuperadmin();
  const admin = createSupabaseAdminClient();

  const id = formData.get("id") as string;
  const url = formData.get("url") as string;
  const image_description = formData.get("image_description") as string;
  const additional_context = formData.get("additional_context") as string;
  const is_public = formData.get("is_public") === "on";
  const is_common_use = formData.get("is_common_use") === "on";

  const { error } = await admin
    .from("images")
    .update({
      url,
      image_description: image_description || null,
      additional_context: additional_context || null,
      is_public,
      is_common_use,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}

export async function deleteImage(formData: FormData) {
  await requireSuperadmin();
  const admin = createSupabaseAdminClient();

  const id = formData.get("id") as string;

  const { error } = await admin.from("images").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/images");
  return { success: true };
}
