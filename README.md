# Admin Area

Secure admin panel built with Next.js App Router, Supabase, and Google OAuth.

## Security Model

- All `admin` routes are protected by authentication checks.
- Admin access requires `profiles.is_superadmin = true`.
- Admin API endpoints enforce the same requirement server-side.
- No Supabase RLS policy changes are required.

## Admin Features

The admin area provides dashboard metrics and data management for:

- Users/Profiles: read
- Images: create/read/update/delete + file upload
- Humor system:
	- Humor flavors: read
	- Humor flavor steps: read
	- Humor mix: read/update
- Terms: create/read/update/delete
- Captions:
	- Captions: read
	- Caption requests: read
	- Caption examples: create/read/update/delete
- LLM management:
	- LLM providers: create/read/update/delete
	- LLM models: create/read/update/delete
	- LLM prompt chains: read
	- LLM responses: read
- Access control:
	- Allowed signup domains: create/read/update/delete
	- Whitelisted email addresses: create/read/update/delete

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_IMAGE_BUCKET` (optional, defaults to `images`)
- `ALMOSTCRACKD_API_URL` (optional)

```bash
cp .env.example .env.local
```

## Google OAuth Setup

1. In Supabase, open Authentication > Providers > Google.
2. Enable Google provider and set OAuth client ID/secret.
3. Add callback URLs:
	 - `http://localhost:3000/auth/callback`
	 - `https://YOUR-VERCEL-PROJECT.vercel.app/auth/callback`

## Secure Initial Superadmin Bootstrap

When no superadmin exists yet, use the one-time script:

```bash
npm run bootstrap:superadmin -- --email your-email@example.com --confirm
```

Notes:

- This uses `SUPABASE_SERVICE_ROLE_KEY` on the server side.
- The target user must have signed in at least once so a `profiles` row exists.
- Revoke access if needed:

```bash
npm run bootstrap:superadmin -- --email your-email@example.com --revoke --confirm
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with Google, then access `/admin`.

## Deploy to Vercel

1. Push to GitHub and import project in Vercel.
2. Configure environment variables in Vercel.
3. In Vercel project settings, disable Deployment Protection (or any authentication gate) so incognito testing works.
4. Redeploy and verify Google callback URLs are configured in Supabase.

To produce commit-specific links for submission:

1. Deploy the commit for caption creation/rating and copy that deployment URL.
2. Deploy the commit for the admin area and copy that deployment URL.

## Key Files

- Landing page: [src/app/page.tsx](src/app/page.tsx)
- Middleware auth wall: [middleware.ts](middleware.ts)
- Admin layout and navigation: [src/app/admin/layout.tsx](src/app/admin/layout.tsx)
- Admin dashboard: [src/app/admin/page.tsx](src/app/admin/page.tsx)
- Generic admin actions: [src/app/admin/actions.ts](src/app/admin/actions.ts)
- Generic admin APIs: [src/app/api/admin/[resource]/route.ts](src/app/api/admin/[resource]/route.ts)
- Secure bootstrap script: [scripts/bootstrap-superadmin.mjs](scripts/bootstrap-superadmin.mjs)
