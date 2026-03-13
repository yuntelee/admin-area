import { NextResponse } from "next/server";

import { requireApiSuperadmin } from "@/lib/admin/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE", message: "file is required." } },
      { status: 422 },
    );
  }

  const bucket = process.env.SUPABASE_IMAGE_BUCKET || "images";
  const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const admin = createSupabaseAdminClient();
  const fileBuffer = new Uint8Array(await fileEntry.arrayBuffer());

  const { error } = await admin.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType: fileEntry.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(storagePath);

  return NextResponse.json({
    data: {
      storage_path: storagePath,
      public_url: data.publicUrl,
      mime_type: fileEntry.type,
      file_size_bytes: fileEntry.size,
    },
  });
}
