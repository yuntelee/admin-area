"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STEP_ORDER_CANDIDATES = ["order_by", "step_order", "step_number", "order_index", "sequence", "position"];

function addStatusToPath(path: string, type: "success" | "error", message: string) {
  const encoded = encodeURIComponent(message);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${type}=${encoded}`;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toNullableText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

async function detectStepOrderColumn(admin: ReturnType<typeof createSupabaseAdminClient>) {
  for (const column of STEP_ORDER_CANDIDATES) {
    const { error } = await admin
      .from("humor_flavor_steps")
      .select("*")
      .order(column, { ascending: true })
      .limit(1);

    if (!error) {
      return column;
    }
  }

  return null;
}

function toInt(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isInteger(parsed) ? parsed : null;
}

function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveFirstId(admin: ReturnType<typeof createSupabaseAdminClient>, table: string) {
  const { data, error } = await admin.from(table).select("id").order("id", { ascending: true }).limit(1);

  if (error) {
    throw new Error(`Unable to load ${table}: ${error.message}`);
  }

  const id = data?.[0]?.id;
  const numericId = typeof id === "number" ? id : Number(id);
  if (!Number.isInteger(numericId)) {
    throw new Error(`No rows found in ${table}. Create seed rows before creating humor flavor steps.`);
  }

  return numericId;
}

async function resolveRequiredStepRefs(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  formData: FormData,
) {
  const llmInputTypeId = toInt(formData.get("llmInputTypeId")) ?? (await resolveFirstId(admin, "llm_input_types"));
  const llmOutputTypeId = toInt(formData.get("llmOutputTypeId")) ?? (await resolveFirstId(admin, "llm_output_types"));
  const llmModelId = toInt(formData.get("llmModelId")) ?? (await resolveFirstId(admin, "llm_models"));
  const humorFlavorStepTypeId =
    toInt(formData.get("humorFlavorStepTypeId")) ?? (await resolveFirstId(admin, "humor_flavor_step_types"));

  return {
    llmInputTypeId,
    llmOutputTypeId,
    llmModelId,
    humorFlavorStepTypeId,
  };
}

export async function createHumorFlavor(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    const { user } = await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const name = String(formData.get("name") || formData.get("title") || "").trim();
    const description = toNullableText(formData.get("description"));
    const explicitSlug = String(formData.get("slug") || "").trim();
    const isPinned = formData.get("is_pinned") === "on";
    const slug = normalizeSlug(explicitSlug || name);

    if (!slug) {
      throw new Error("A valid slug is required.");
    }

    const { error } = await admin.from("humor_flavors").insert({
      slug,
      description,
      is_pinned: isPinned,
      created_by_user_id: user.id,
      modified_by_user_id: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Humor flavor created."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create humor flavor.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function updateHumorFlavor(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    const { user } = await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const flavorId = String(formData.get("flavorId") || "").trim();
    const name = String(formData.get("name") || formData.get("title") || "").trim();
    const description = toNullableText(formData.get("description"));
    const explicitSlug = String(formData.get("slug") || "").trim();
    const isPinned = formData.get("is_pinned") === "on";
    const slug = normalizeSlug(explicitSlug || name);

    if (!flavorId) {
      throw new Error("Missing flavor id.");
    }

    if (!slug) {
      throw new Error("A valid slug is required.");
    }

    const { error } = await admin
      .from("humor_flavors")
      .update({
        slug,
        description,
        is_pinned: isPinned,
        modified_by_user_id: user.id,
      })
      .eq("id", flavorId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Humor flavor updated."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update humor flavor.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function deleteHumorFlavor(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const flavorId = String(formData.get("flavorId") || "").trim();
    if (!flavorId) {
      throw new Error("Missing flavor id.");
    }

    const { error } = await admin.from("humor_flavors").delete().eq("id", flavorId);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath("/dashboard/humor-flavors", "success", "Humor flavor deleted."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete humor flavor.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function createHumorFlavorStep(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    const { user } = await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const flavorId = String(formData.get("flavorId") || "").trim();
    const stepName = String(formData.get("stepName") || "").trim();
    const description = toNullableText(formData.get("description"));
    const promptText = toNullableText(formData.get("promptText"));
    const llmTemperature = toNumber(formData.get("llmTemperature"));

    if (!flavorId) {
      throw new Error("Missing flavor id.");
    }

    if (!stepName) {
      throw new Error("Step name is required.");
    }

    const orderColumn = await detectStepOrderColumn(admin);
    let nextOrderValue: number | null = null;

    if (orderColumn) {
      const { data } = await admin
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavorId)
        .order(orderColumn, { ascending: false })
        .limit(1);

      const top = data?.[0] as Record<string, unknown> | undefined;
      const currentMax = typeof top?.[orderColumn] === "number" ? Number(top[orderColumn]) : 0;
      nextOrderValue = currentMax + 1;
    }

    const refs = await resolveRequiredStepRefs(admin, formData);

    const { error } = await admin.from("humor_flavor_steps").insert({
      humor_flavor_id: Number(flavorId),
      order_by: nextOrderValue ?? 1,
      llm_temperature: llmTemperature,
      llm_input_type_id: refs.llmInputTypeId,
      llm_output_type_id: refs.llmOutputTypeId,
      llm_model_id: refs.llmModelId,
      humor_flavor_step_type_id: refs.humorFlavorStepTypeId,
      llm_system_prompt: promptText,
      llm_user_prompt: promptText,
      description: description || stepName,
      created_by_user_id: user.id,
      modified_by_user_id: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Humor flavor step created."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create humor flavor step.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function updateHumorFlavorStep(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    const { user } = await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const stepId = String(formData.get("stepId") || "").trim();
    const stepName = String(formData.get("stepName") || "").trim();
    const description = toNullableText(formData.get("description"));
    const promptText = toNullableText(formData.get("promptText"));
    const llmTemperature = toNumber(formData.get("llmTemperature"));

    if (!stepId) {
      throw new Error("Missing step id.");
    }

    if (!stepName && !description) {
      throw new Error("Step description is required.");
    }

    const payload: Record<string, unknown> = {
      description: description || stepName,
      llm_system_prompt: promptText,
      llm_user_prompt: promptText,
      modified_by_user_id: user.id,
    };

    if (llmTemperature !== null) {
      payload.llm_temperature = llmTemperature;
    }

    const { error } = await admin.from("humor_flavor_steps").update(payload).eq("id", stepId);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Humor flavor step updated."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update humor flavor step.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function deleteHumorFlavorStep(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const stepId = String(formData.get("stepId") || "").trim();
    if (!stepId) {
      throw new Error("Missing step id.");
    }

    const { error } = await admin.from("humor_flavor_steps").delete().eq("id", stepId);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Humor flavor step deleted."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete humor flavor step.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function moveHumorFlavorStep(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    const { user } = await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const stepId = String(formData.get("stepId") || "").trim();
    const flavorId = String(formData.get("flavorId") || "").trim();
    const direction = String(formData.get("direction") || "").trim();

    if (!stepId || !flavorId) {
      throw new Error("Missing step id or flavor id.");
    }

    if (direction !== "up" && direction !== "down") {
      throw new Error("Invalid move direction.");
    }

    const orderColumn = await detectStepOrderColumn(admin);
    if (!orderColumn) {
      throw new Error("Step reordering is unavailable because no order column was detected.");
    }

    const { data, error } = await admin
      .from("humor_flavor_steps")
      .select("*")
      .eq("humor_flavor_id", flavorId)
      .order(orderColumn, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const currentIndex = rows.findIndex((row) => String(row.id) === stepId);

    if (currentIndex < 0) {
      throw new Error("Step not found in selected flavor.");
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      redirect(addStatusToPath(returnPath, "success", "Step already at boundary."));
    }

    const current = rows[currentIndex];
    const target = rows[targetIndex];

    const currentOrder = Number(current[orderColumn]);
    const targetOrder = Number(target[orderColumn]);

    if (!Number.isFinite(currentOrder) || !Number.isFinite(targetOrder)) {
      throw new Error("Unable to reorder because step order values are invalid.");
    }

    const tempOrder = -999999;
    const first = await admin
      .from("humor_flavor_steps")
      .update({ [orderColumn]: tempOrder, modified_by_user_id: user.id })
      .eq("id", current.id);

    if (first.error) {
      throw new Error(first.error.message);
    }

    const second = await admin
      .from("humor_flavor_steps")
      .update({ [orderColumn]: currentOrder, modified_by_user_id: user.id })
      .eq("id", target.id);

    if (second.error) {
      throw new Error(second.error.message);
    }

    const third = await admin
      .from("humor_flavor_steps")
      .update({ [orderColumn]: targetOrder, modified_by_user_id: user.id })
      .eq("id", current.id);

    if (third.error) {
      throw new Error(third.error.message);
    }

    revalidatePath("/dashboard/humor-flavors");
    redirect(addStatusToPath(returnPath, "success", "Step order updated."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder humor flavor step.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}
