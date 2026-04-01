"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STEP_ORDER_CANDIDATES = ["step_order", "step_number", "order_index", "sequence", "position"];
const STEP_NAME_CANDIDATES = ["step_name", "name"];
const STEP_PROMPT_CANDIDATES = ["prompt_template", "prompt_text", "prompt", "instruction"];

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

async function createStepInsertPayloads(
  flavorId: string,
  stepName: string,
  description: string | null,
  promptText: string | null,
  orderColumn: string | null,
  nextOrderValue: number | null,
) {
  const payloads: Record<string, unknown>[] = [];

  for (const stepNameColumn of STEP_NAME_CANDIDATES) {
    for (const promptColumn of [null, ...STEP_PROMPT_CANDIDATES]) {
      const payload: Record<string, unknown> = {
        humor_flavor_id: flavorId,
        [stepNameColumn]: stepName,
        description,
      };

      if (promptColumn && promptText) {
        payload[promptColumn] = promptText;
      }

      if (orderColumn && nextOrderValue !== null) {
        payload[orderColumn] = nextOrderValue;
      }

      payloads.push(payload);
    }
  }

  return payloads;
}

async function createStepUpdatePayloads(stepName: string, description: string | null, promptText: string | null) {
  const payloads: Record<string, unknown>[] = [];

  for (const stepNameColumn of STEP_NAME_CANDIDATES) {
    for (const promptColumn of [null, ...STEP_PROMPT_CANDIDATES]) {
      const payload: Record<string, unknown> = {
        [stepNameColumn]: stepName,
        description,
      };

      if (promptColumn && promptText) {
        payload[promptColumn] = promptText;
      }

      payloads.push(payload);
    }
  }

  return payloads;
}

export async function createHumorFlavor(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const name = String(formData.get("name") || "").trim();
    const description = toNullableText(formData.get("description"));
    const explicitSlug = String(formData.get("slug") || "").trim();
    const slug = normalizeSlug(explicitSlug || name);

    if (!name) {
      throw new Error("Flavor name is required.");
    }

    if (!slug) {
      throw new Error("A valid slug is required.");
    }

    const { error } = await admin.from("humor_flavors").insert({
      name,
      slug,
      description,
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
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const flavorId = String(formData.get("flavorId") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const description = toNullableText(formData.get("description"));
    const explicitSlug = String(formData.get("slug") || "").trim();
    const slug = normalizeSlug(explicitSlug || name);

    if (!flavorId) {
      throw new Error("Missing flavor id.");
    }

    if (!name) {
      throw new Error("Flavor name is required.");
    }

    if (!slug) {
      throw new Error("A valid slug is required.");
    }

    const { error } = await admin
      .from("humor_flavors")
      .update({ name, slug, description })
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
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const flavorId = String(formData.get("flavorId") || "").trim();
    const stepName = String(formData.get("stepName") || "").trim();
    const description = toNullableText(formData.get("description"));
    const promptText = toNullableText(formData.get("promptText"));

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

    const payloads = await createStepInsertPayloads(
      flavorId,
      stepName,
      description,
      promptText,
      orderColumn,
      nextOrderValue,
    );

    let lastError: string | null = null;
    for (const payload of payloads) {
      const { error } = await admin.from("humor_flavor_steps").insert(payload);
      if (!error) {
        revalidatePath("/dashboard/humor-flavors");
        redirect(addStatusToPath(returnPath, "success", "Humor flavor step created."));
      }
      lastError = error.message;
    }

    throw new Error(lastError || "Unable to create step with available schema columns.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create humor flavor step.";
    redirect(addStatusToPath(returnPath, "error", message));
  }
}

export async function updateHumorFlavorStep(formData: FormData) {
  const returnPath = String(formData.get("returnPath") || "/dashboard/humor-flavors");

  try {
    await requireSuperadmin();
    const admin = createSupabaseAdminClient();

    const stepId = String(formData.get("stepId") || "").trim();
    const stepName = String(formData.get("stepName") || "").trim();
    const description = toNullableText(formData.get("description"));
    const promptText = toNullableText(formData.get("promptText"));

    if (!stepId) {
      throw new Error("Missing step id.");
    }

    if (!stepName) {
      throw new Error("Step name is required.");
    }

    const payloads = await createStepUpdatePayloads(stepName, description, promptText);

    let lastError: string | null = null;
    for (const payload of payloads) {
      const { error } = await admin.from("humor_flavor_steps").update(payload).eq("id", stepId);
      if (!error) {
        revalidatePath("/dashboard/humor-flavors");
        redirect(addStatusToPath(returnPath, "success", "Humor flavor step updated."));
      }
      lastError = error.message;
    }

    throw new Error(lastError || "Unable to update step with available schema columns.");
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
    await requireSuperadmin();
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
      .update({ [orderColumn]: tempOrder })
      .eq("id", current.id);

    if (first.error) {
      throw new Error(first.error.message);
    }

    const second = await admin
      .from("humor_flavor_steps")
      .update({ [orderColumn]: currentOrder })
      .eq("id", target.id);

    if (second.error) {
      throw new Error(second.error.message);
    }

    const third = await admin
      .from("humor_flavor_steps")
      .update({ [orderColumn]: targetOrder })
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
