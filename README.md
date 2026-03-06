# Admin Area

Next.js 16 starter app secured with Supabase Auth and Google sign-in, ready to deploy on Vercel.

## Stack

- Next.js App Router
- Supabase Auth
- Google OAuth
- Vercel deployment target
- Tailwind CSS

## Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Local example:

```bash
cp .env.example .env.local
```

## Supabase setup

1. Create a Supabase project.
2. In Supabase, go to Authentication → Providers → Google.
3. Enable Google and add your Google OAuth client ID and secret.
4. Add these redirect URLs in Supabase:
	- `http://localhost:3000/auth/callback`
	- `https://YOUR-VERCEL-PROJECT.vercel.app/auth/callback`
5. Add your Supabase project URL and anon key to `.env.local`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with Google. Authenticated users are redirected to `/dashboard`.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Add your Vercel production callback URL to Supabase Google provider settings.
5. Redeploy.

## Important routes

- Landing page: [/](src/app/page.tsx)
- Protected page: [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)
- OAuth callback: [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)
- Session middleware: [middleware.ts](middleware.ts)
