"use client";

import { useActionState, useState } from "react";
import { createImage, updateImage, deleteImage } from "./actions";

/* ---------- types ---------- */
type Image = {
  id: string;
  url: string | null;
  image_description: string | null;
  additional_context: string | null;
  is_public: boolean | null;
  is_common_use: boolean | null;
  created_datetime_utc: string | null;
  profile_id: string | null;
};

/* ---------- Create / Edit form ---------- */
function ImageForm({
  image,
  onClose,
}: {
  image?: Image;
  onClose: () => void;
}) {
  const action = image ? updateImage : createImage;

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) => {
      const res = await action(fd);
      if (res?.success) onClose();
      return res ?? null;
    },
    null,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        action={formAction}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6"
      >
        <h2 className="text-lg font-bold">
          {image ? "Edit Image" : "New Image"}
        </h2>

        {image && <input type="hidden" name="id" value={image.id} />}

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">URL *</span>
          <input
            name="url"
            required
            defaultValue={image?.url ?? ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400"
            placeholder="https://…"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Description</span>
          <textarea
            name="image_description"
            rows={2}
            defaultValue={image?.image_description ?? ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Additional Context</span>
          <textarea
            name="additional_context"
            rows={2}
            defaultValue={image?.additional_context ?? ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400"
          />
        </label>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked={image?.is_public ?? true}
              className="rounded"
            />
            Public
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="is_common_use"
              defaultChecked={image?.is_common_use ?? false}
              className="rounded"
            />
            Common Use
          </label>
        </div>

        {state?.error && (
          <p className="text-sm text-rose-400">{state.error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : image ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Delete button ---------- */
function DeleteButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, fd: FormData) => {
      return (await deleteImage(fd)) ?? null;
    },
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this image? This cannot be undone."))
            e.preventDefault();
        }}
        className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
      {state?.error && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
    </form>
  );
}

/* ---------- Main client wrapper ---------- */
export default function ImagesClient({ images }: { images: Image[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editImage, setEditImage] = useState<Image | undefined>();

  function openCreate() {
    setEditImage(undefined);
    setShowForm(true);
  }
  function openEdit(img: Image) {
    setEditImage(img);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditImage(undefined);
  }

  return (
    <>
      {showForm && <ImageForm image={editImage} onClose={closeForm} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Images</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage images ({images.length})
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          + New Image
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Public</th>
              <th className="px-4 py-3 text-center">Common Use</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {images.map((img) => (
              <tr key={img.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs text-slate-500">
                      N/A
                    </div>
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-300">
                  {img.image_description ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      img.is_public
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {img.is_public ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      img.is_common_use
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {img.is_common_use ? "Yes" : "No"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                  {img.created_datetime_utc
                    ? new Date(img.created_datetime_utc).toLocaleDateString()
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(img)}
                      className="text-xs text-sky-400 hover:text-sky-300"
                    >
                      Edit
                    </button>
                    <DeleteButton id={img.id} />
                  </div>
                </td>
              </tr>
            ))}
            {images.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No images found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
