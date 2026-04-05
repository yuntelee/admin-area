export type ResourceMode = "read" | "crud" | "read-update" | "images-crud";

export type AdminResource = {
  key: string;
  label: string;
  table: string;
  mode: ResourceMode;
  section: "Users" | "Content" | "Humor" | "AI" | "Access";
  description: string;
  searchColumns?: string[];
  orderBy?: string;
  orderAscending?: boolean;
  samplePayload?: Record<string, unknown>;
};

export const ADMIN_RESOURCES: AdminResource[] = [
  {
    key: "users",
    label: "Users / Profiles",
    table: "profiles",
    mode: "read",
    section: "Users",
    description: "Read-only profiles table.",
    searchColumns: ["email", "first_name", "last_name"],
    orderBy: "created_datetime_utc",
  },
  {
    key: "images",
    label: "Images",
    table: "images",
    mode: "images-crud",
    section: "Content",
    description: "Create/read/update/delete images with optional file upload.",
    searchColumns: ["url", "image_description", "additional_context"],
    orderBy: "created_datetime_utc",
  },
  {
    key: "humor-flavors",
    label: "Humor Flavors",
    table: "humor_flavors",
    mode: "read",
    section: "Humor",
    description: "Read-only humor flavors.",
    searchColumns: ["slug", "description"],
    orderBy: "id",
  },
  {
    key: "humor-flavor-steps",
    label: "Humor Flavor Steps",
    table: "humor_flavor_steps",
    mode: "read",
    section: "Humor",
    description: "Read-only humor flavor steps.",
    searchColumns: ["description", "llm_user_prompt", "llm_system_prompt"],
    orderBy: "id",
  },
  {
    key: "humor-mix",
    label: "Humor Flavor Mix",
    table: "humor_flavor_mix",
    mode: "read-update",
    section: "Humor",
    description: "Read and update humor flavor mix records.",
    orderBy: "id",
    samplePayload: {
      humor_flavor_id: 1,
      caption_count: 3,
    },
  },
  {
    key: "terms",
    label: "Terms",
    table: "terms",
    mode: "crud",
    section: "Content",
    description: "Create/read/update/delete terms.",
    searchColumns: ["term", "definition", "example"],
    orderBy: "id",
    samplePayload: {
      term: "setup",
      definition: "A phrase or concept used in generated humor.",
      example: "When production works on Friday night.",
      priority: 0,
      term_type_id: null,
    },
  },
  {
    key: "captions",
    label: "Captions",
    table: "captions",
    mode: "read",
    section: "Content",
    description: "Read-only captions.",
    searchColumns: ["content"],
    orderBy: "created_datetime_utc",
  },
  {
    key: "caption-requests",
    label: "Caption Requests",
    table: "caption_requests",
    mode: "read",
    section: "Content",
    description: "Read-only caption generation requests.",
    searchColumns: ["status", "request_text"],
    orderBy: "created_datetime_utc",
  },
  {
    key: "caption-examples",
    label: "Caption Examples",
    table: "caption_examples",
    mode: "crud",
    section: "Content",
    description: "Create/read/update/delete caption examples.",
    orderBy: "id",
  },
  {
    key: "llm-models",
    label: "LLM Models",
    table: "llm_models",
    mode: "crud",
    section: "AI",
    description: "Create/read/update/delete LLM models.",
    searchColumns: ["name", "provider_model_id"],
    orderBy: "id",
    samplePayload: {
      name: "gpt-4.1",
      llm_provider_id: 1,
      provider_model_id: "gpt-4.1",
      is_temperature_supported: true,
    },
  },
  {
    key: "llm-providers",
    label: "LLM Providers",
    table: "llm_providers",
    mode: "crud",
    section: "AI",
    description: "Create/read/update/delete LLM providers.",
    searchColumns: ["name", "api_base_url"],
    orderBy: "id",
    samplePayload: {
      name: "openai",
      api_base_url: "https://api.openai.com/v1",
      is_active: true,
    },
  },
  {
    key: "llm-prompt-chains",
    label: "LLM Prompt Chains",
    table: "llm_prompt_chains",
    mode: "read",
    section: "AI",
    description: "Read-only prompt chains.",
    searchColumns: ["name"],
    orderBy: "id",
  },
  {
    key: "llm-responses",
    label: "LLM Responses",
    table: "llm_responses",
    mode: "read",
    section: "AI",
    description: "Read-only model responses.",
    searchColumns: ["response_text"],
    orderBy: "created_datetime_utc",
  },
  {
    key: "allowed-signup-domains",
    label: "Allowed Signup Domains",
    table: "allowed_signup_domains",
    mode: "crud",
    section: "Access",
    description: "Create/read/update/delete allowed domains.",
    searchColumns: ["domain"],
    orderBy: "id",
    samplePayload: {
      domain: "example.com",
      is_active: true,
    },
  },
  {
    key: "whitelisted-email-addresses",
    label: "Whitelisted Email Addresses",
    table: "whitelisted_email_addresses",
    mode: "crud",
    section: "Access",
    description: "Create/read/update/delete whitelisted emails.",
    searchColumns: ["email"],
    orderBy: "id",
    samplePayload: {
      email: "user@example.com",
      is_active: true,
    },
  },
];

export function getResourceByKey(resourceKey: string) {
  return ADMIN_RESOURCES.find((resource) => resource.key === resourceKey);
}

export function getResourceSections() {
  const sections: Record<string, AdminResource[]> = {};

  for (const resource of ADMIN_RESOURCES) {
    if (!sections[resource.section]) {
      sections[resource.section] = [];
    }
    sections[resource.section].push(resource);
  }

  return sections;
}
