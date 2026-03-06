import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import ImagesClient from "./images-client";

export default async function ImagesPage() {
  const admin = createSupabaseAdminClient();

  const { data: images } = await admin
    .from("images")
    .select(
      "id, url, image_description, additional_context, is_public, is_common_use, created_datetime_utc, profile_id"
    )
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return <ImagesClient images={images ?? []} />;
}
