import Link from "next/link";

import {
  createHumorFlavor,
  createHumorFlavorStep,
  deleteHumorFlavor,
  deleteHumorFlavorStep,
  moveHumorFlavorStep,
  updateHumorFlavor,
  updateHumorFlavorStep,
} from "./actions";
import PromptChainTester from "./prompt-chain-tester";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STEP_ORDER_CANDIDATES = ["step_order", "step_number", "order_index", "sequence", "position"];
const STEP_NAME_CANDIDATES = ["step_name", "name"];
const STEP_PROMPT_CANDIDATES = ["prompt_template", "prompt_text", "prompt", "instruction"];

type Flavor = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
};

type StepRecord = Record<string, unknown>;

type PageProps = {
  searchParams?: Promise<{
    flavor?: string;
    success?: string;
    error?: string;
  }>;
};

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
}

function getOrderValue(step: StepRecord, fallback: number) {
  for (const key of STEP_ORDER_CANDIDATES) {
    const value = step[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

async function loadSteps(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  flavorId: string,
): Promise<{ steps: StepRecord[]; orderColumn: string | null; error: string | null }> {
  for (const column of STEP_ORDER_CANDIDATES) {
    const { data, error } = await admin
      .from("humor_flavor_steps")
      .select("*")
      .eq("humor_flavor_id", flavorId)
      .order(column, { ascending: true });

    if (!error) {
      return {
        steps: (data ?? []) as StepRecord[],
        orderColumn: column,
        error: null,
      };
    }
  }

  const { data, error } = await admin
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId);

  const sorted = ((data ?? []) as StepRecord[]).sort((a, b) => {
    return getOrderValue(a, 0) - getOrderValue(b, 0);
  });

  return {
    steps: sorted,
    orderColumn: null,
    error: error?.message || null,
  };
}

export default async function HumorFlavorsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const admin = createSupabaseAdminClient();

  const { data: flavorsData, error: flavorsError } = await admin
    .from("humor_flavors")
    .select("id, name, slug, description")
    .order("id", { ascending: true })
    .limit(200);

  const flavors = (flavorsData ?? []) as Flavor[];
  const selectedFlavorId =
    resolved?.flavor && flavors.some((flavor) => String(flavor.id) === resolved.flavor)
      ? resolved.flavor
      : String(flavors[0]?.id ?? "");

  const selectedFlavor = flavors.find((flavor) => String(flavor.id) === selectedFlavorId) ?? null;

  const stepLoad = selectedFlavorId
    ? await loadSteps(admin, selectedFlavorId)
    : { steps: [] as StepRecord[], orderColumn: null, error: null };

  const steps = stepLoad.steps;

  const { data: captionData, error: captionsError } = selectedFlavorId
    ? await admin
        .from("captions")
        .select("id, content, created_datetime_utc, profiles(email)")
        .eq("humor_flavor_id", selectedFlavorId)
        .order("created_datetime_utc", { ascending: false })
        .limit(25)
    : { data: [], error: null };

  const captions = (captionData ?? []) as Array<{
    id: string;
    content: string | null;
    created_datetime_utc: string | null;
    profiles: { email?: string | null } | null;
  }>;

  const currentPath = selectedFlavorId
    ? `/dashboard/humor-flavors?flavor=${encodeURIComponent(selectedFlavorId)}`
    : "/dashboard/humor-flavors";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Prompt Chain Tool</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create, edit, delete, and reorder humor flavors and humor flavor steps.
        </p>
      </header>

      {resolved?.success ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {resolved.success}
        </p>
      ) : null}

      {resolved?.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {resolved.error}
        </p>
      ) : null}

      {flavorsError ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Error loading humor flavors: {flavorsError.message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <h2 className="text-lg font-semibold">Humor Flavors</h2>
            <p className="mt-1 text-xs text-slate-400">Select a flavor to manage its steps.</p>
          </div>

          <div className="space-y-2">
            {flavors.map((flavor) => {
              const isActive = String(flavor.id) === selectedFlavorId;
              return (
                <Link
                  key={flavor.id}
                  href={`/dashboard/humor-flavors?flavor=${encodeURIComponent(String(flavor.id))}`}
                  className={`block rounded-lg border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <p className="font-medium">{flavor.name}</p>
                  <p className="text-xs text-slate-400">{flavor.slug || "no-slug"}</p>
                </Link>
              );
            })}

            {flavors.length === 0 ? <p className="text-sm text-slate-500">No flavors found.</p> : null}
          </div>

          <section className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
            <h3 className="text-sm font-semibold">Create Flavor</h3>
            <form action={createHumorFlavor} className="mt-2 space-y-2">
              <input type="hidden" name="returnPath" value={currentPath} />
              <input
                name="name"
                required
                placeholder="Flavor name"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <input
                name="slug"
                placeholder="optional-slug"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <textarea
                name="description"
                rows={2}
                placeholder="Optional description"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Create Flavor
              </button>
            </form>
          </section>
        </aside>

        <section className="space-y-6">
          {selectedFlavor ? (
            <>
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-semibold">Selected Flavor</h2>
                <form action={updateHumorFlavor} className="mt-3 grid gap-3 lg:grid-cols-2">
                  <input type="hidden" name="flavorId" value={selectedFlavor.id} />
                  <input type="hidden" name="returnPath" value={currentPath} />

                  <label className="space-y-1 text-xs text-slate-300">
                    Name
                    <input
                      name="name"
                      required
                      defaultValue={selectedFlavor.name}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-slate-300">
                    Slug
                    <input
                      name="slug"
                      defaultValue={selectedFlavor.slug ?? ""}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-slate-300 lg:col-span-2">
                    Description
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={selectedFlavor.description ?? ""}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <div className="flex gap-2 lg:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg border border-sky-300/40 px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
                    >
                      Update Flavor
                    </button>
                  </div>
                </form>

                <form action={deleteHumorFlavor} className="mt-3">
                  <input type="hidden" name="flavorId" value={selectedFlavor.id} />
                  <input type="hidden" name="returnPath" value={currentPath} />
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
                  >
                    Delete Flavor
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-semibold">Humor Flavor Steps</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Reorder works by swapping adjacent steps.
                  {stepLoad.orderColumn ? ` Using order column: ${stepLoad.orderColumn}.` : ""}
                </p>
                {stepLoad.error ? (
                  <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {stepLoad.error}
                  </p>
                ) : null}

                <form action={createHumorFlavorStep} className="mt-3 grid gap-3 lg:grid-cols-2">
                  <input type="hidden" name="flavorId" value={selectedFlavor.id} />
                  <input type="hidden" name="returnPath" value={currentPath} />

                  <label className="space-y-1 text-xs text-slate-300">
                    Step Name
                    <input
                      name="stepName"
                      required
                      placeholder="Describe image"
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-slate-300 lg:col-span-2">
                    Prompt / Instruction
                    <textarea
                      name="promptText"
                      rows={2}
                      placeholder="Prompt text for this step"
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-slate-300 lg:col-span-2">
                    Description
                    <textarea
                      name="description"
                      rows={2}
                      placeholder="Optional step notes"
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
                    >
                      Add Step
                    </button>
                  </div>
                </form>

                <div className="mt-4 space-y-3">
                  {steps.map((step, index) => {
                    const stepId = String(step.id);
                    const orderValue = getOrderValue(step, index + 1);
                    const stepName = getString(step, STEP_NAME_CANDIDATES);
                    const stepDescription = getString(step, ["description"]);
                    const stepPrompt = getString(step, STEP_PROMPT_CANDIDATES);

                    return (
                      <article key={stepId} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-200">Step {orderValue}</p>
                          <div className="flex gap-2">
                            <form action={moveHumorFlavorStep}>
                              <input type="hidden" name="stepId" value={stepId} />
                              <input type="hidden" name="flavorId" value={selectedFlavor.id} />
                              <input type="hidden" name="direction" value="up" />
                              <input type="hidden" name="returnPath" value={currentPath} />
                              <button
                                type="submit"
                                className="rounded border border-white/15 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                              >
                                Move Up
                              </button>
                            </form>
                            <form action={moveHumorFlavorStep}>
                              <input type="hidden" name="stepId" value={stepId} />
                              <input type="hidden" name="flavorId" value={selectedFlavor.id} />
                              <input type="hidden" name="direction" value="down" />
                              <input type="hidden" name="returnPath" value={currentPath} />
                              <button
                                type="submit"
                                className="rounded border border-white/15 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                              >
                                Move Down
                              </button>
                            </form>
                          </div>
                        </div>

                        <form action={updateHumorFlavorStep} className="grid gap-2 lg:grid-cols-2">
                          <input type="hidden" name="stepId" value={stepId} />
                          <input type="hidden" name="returnPath" value={currentPath} />

                          <input
                            name="stepName"
                            required
                            defaultValue={stepName}
                            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                          />

                          <textarea
                            name="description"
                            rows={2}
                            defaultValue={stepDescription}
                            placeholder="Description"
                            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white lg:col-span-2"
                          />

                          <textarea
                            name="promptText"
                            rows={3}
                            defaultValue={stepPrompt}
                            placeholder="Prompt / instruction"
                            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white lg:col-span-2"
                          />

                          <div className="flex gap-2 lg:col-span-2">
                            <button
                              type="submit"
                              className="rounded-lg border border-sky-300/40 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
                            >
                              Update Step
                            </button>
                          </div>
                        </form>

                        <form action={deleteHumorFlavorStep} className="mt-2">
                          <input type="hidden" name="stepId" value={stepId} />
                          <input type="hidden" name="returnPath" value={currentPath} />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                          >
                            Delete Step
                          </button>
                        </form>
                      </article>
                    );
                  })}

                  {steps.length === 0 ? (
                    <p className="text-sm text-slate-500">No steps found for this flavor yet.</p>
                  ) : null}
                </div>
              </section>

              <PromptChainTester
                flavors={flavors.map((flavor) => ({ id: String(flavor.id), name: flavor.name, slug: flavor.slug }))}
                selectedFlavorId={selectedFlavorId}
              />

              <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-semibold">Captions for Selected Flavor</h2>
                <p className="mt-1 text-xs text-slate-400">Recent captions tied to this humor flavor id.</p>

                {captionsError ? (
                  <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    Error loading captions: {captionsError.message}
                  </p>
                ) : null}

                <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Caption</th>
                        <th className="px-3 py-2">Author</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {captions.map((caption) => (
                        <tr key={caption.id} className="hover:bg-white/5">
                          <td className="max-w-xl px-3 py-2 text-slate-200">{caption.content || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                            {caption.profiles?.email || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                            {caption.created_datetime_utc
                              ? new Date(caption.created_datetime_utc).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                      {captions.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={3}>
                            No captions found for this humor flavor.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
              Create your first humor flavor in the left panel to begin managing prompt steps.
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
