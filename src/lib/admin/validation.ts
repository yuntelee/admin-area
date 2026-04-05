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
    delete payload.category;
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
