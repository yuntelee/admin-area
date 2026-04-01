"use client";

import { FormEvent, useState } from "react";

type FlavorOption = {
  id: string;
  name: string;
  slug: string | null;
};

type Props = {
  flavors: FlavorOption[];
  selectedFlavorId: string;
};

type TestResponse = {
  data?: {
    captions?: string[];
    endpoint?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export default function PromptChainTester({ flavors, selectedFlavorId }: Props) {
  const [flavorId, setFlavorId] = useState(selectedFlavorId);
  const [imageUrl, setImageUrl] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setCaptions([]);
    setEndpoint(null);

    try {
      const response = await fetch("/api/prompt-chain/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          flavorId,
          imageUrl,
          imageDescription,
        }),
      });

      const payload = (await response.json()) as TestResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message || "Caption generation failed.");
      }

      setCaptions(payload.data?.captions ?? []);
      setEndpoint(payload.data?.endpoint ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caption generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold">Test Humor Flavor</h2>
      <p className="mt-1 text-xs text-slate-400">
        Generate captions via api.almostcrackd.ai for quick prompt-chain validation.
      </p>

      <form onSubmit={onSubmit} className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-300">
          Humor Flavor
          <select
            value={flavorId}
            onChange={(event) => setFlavorId(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            required
          >
            {flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.name} {flavor.slug ? `(${flavor.slug})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-slate-300">
          Image URL
          <input
            type="url"
            required
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1 text-xs text-slate-300 lg:col-span-2">
          Optional Image Description
          <textarea
            value={imageDescription}
            onChange={(event) => setImageDescription(event.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="Add extra context for testing"
          />
        </label>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Test Captions"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      {captions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-400">
            Generated via: <span className="text-slate-300">{endpoint}</span>
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200">
            {captions.map((caption, index) => (
              <li key={`${index}-${caption.slice(0, 12)}`}>{caption}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
