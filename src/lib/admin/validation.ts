export function validateDomain(domain: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function validatePayload(resourceKey: string, payload: Record<string, unknown>) {
  if (resourceKey === "humor-flavors") {
    const title = typeof payload.title === "string" ? payload.title : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const slug = typeof payload.slug === "string" ? payload.slug : "";

    const normalizedSlug = normalizeSlug(slug || name || title);
    if (!normalizedSlug) {
      throw new Error("Payload.slug is required for humor flavors.");
    }

    payload.slug = normalizedSlug;
    if (typeof payload.is_pinned !== "boolean") {
      payload.is_pinned = false;
    }

    delete payload.title;
    delete payload.name;
  }

  if (resourceKey === "terms") {
    const term = String(payload.term ?? "").trim();
    const definition = String(payload.definition ?? "").trim();
    const example = String(payload.example ?? "").trim();

    if (!term || !definition || !example) {
      throw new Error("Payload.term, payload.definition, and payload.example are required for terms.");
    }

    payload.term = term;
    payload.definition = definition;
    payload.example = example;
    delete payload.id;
    delete payload.created_datetime_utc;
    delete payload.modified_datetime_utc;
    delete payload.created_by_user_id;
    delete payload.modified_by_user_id;
    delete payload.category;
  }

  if (resourceKey === "caption-examples") {
    const text = [payload.caption, payload.example_text, payload.content, payload.text, payload.example]
      .find((value) => typeof value === "string" && value.trim()) as string | undefined;

    if (!text) {
      throw new Error("Payload.caption is required for caption examples.");
    }

    const explanation = [payload.explanation, payload.notes, payload.note, payload.context]
      .find((value) => typeof value === "string" && value.trim()) as string | undefined;

    payload.caption = text.trim();
    if (explanation) {
      payload.explanation = explanation.trim();
    }

    if (payload.priority !== undefined && payload.priority !== null && payload.priority !== "") {
      const parsedPriority = Number(payload.priority);
      if (!Number.isInteger(parsedPriority)) {
        throw new Error("Payload.priority must be an integer.");
      }
      payload.priority = parsedPriority;
    }

    if (payload.image_id !== undefined && payload.image_id !== null && payload.image_id !== "") {
      payload.image_id = String(payload.image_id).trim();
    }

    delete payload.id;
    delete payload.created_datetime_utc;
    delete payload.modified_datetime_utc;
    delete payload.created_by_user_id;
    delete payload.modified_by_user_id;
    delete payload.example_text;
    delete payload.content;
    delete payload.text;
    delete payload.example;
    delete payload.notes;
    delete payload.note;
    delete payload.context;
    delete payload.is_active;
  }

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
