# الاتحاد المصري للكلانات — eFootball League Manager

A production-ready league manager for two 10-clan eFootball divisions
(First Division / الدرجة الأولى and Second Division / الدرجة الثانية):

- **Public pages** (`/league/first`, `/league/second`) — no login required,
  nothing about admin access is shown or linked anywhere on these pages.
  Live standings and fixtures, updating instantly for every visitor the
  moment you save a result (Supabase Realtime).
- **Admin dashboard** (`/admin/dashboard`) — only reachable if you type
  the URL directly; there is no visible link or button to it anywhere in
  the public UI. Protected by Supabase Auth (only your account can sign
  in — there's no public sign-up). From here you manage clans (max
  10/division) with their logos, generate round-robin fixtures, enter
  results, and set the federation's own name and logo.

### Your two public links (share these, nothing else)
- First Division: `https://your-app.vercel.app/league/first`
- Second Division: `https://your-app.vercel.app/league/second`

### Your private admin link (bookmark it, don't share it)
- `https://your-app.vercel.app/admin/login`

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**
(Postgres, Auth, Realtime — free tier is enough to run this).

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any
   name/region, save the database password somewhere safe.
2. Once it's ready, open **SQL Editor → New query**, paste the entire
   contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it.
   This creates the `divisions`, `clans`, and `matches` tables, sets up
   Row Level Security (public read, admin-only write), enables Realtime,
   and seeds the two divisions plus 10 placeholder clans each — rename
   them from the admin dashboard once you have the real clan list.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon` `public` key

## 2. Create your admin account

You (the federation admin) are the only person who should be able to log
in. Create yourself an account:

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Enter your email and a password. Confirm the email automatically
   (toggle "Auto Confirm User") since there's no need for an email flow
   here — this is a private admin login, not public sign-up.
3. That's it — public sign-up is never exposed anywhere in the app.

## 3. Run it locally

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste your Supabase URL + anon key
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/league/first`.
Visit `/admin/login` and sign in with the account you created above.

## 4. Deploy for free (Vercel)

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import
   the repo.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Your public league pages are live at
   `https://your-app.vercel.app/league/first` — share this link with clan
   leaders. Keep `/admin/login` to yourself.

No other config is needed — Vercel's free tier and Supabase's free tier
both comfortably cover a league of this size.

---

## Set your federation logo and name

`schema.sql` already creates a public `logos` storage bucket for you
(public read, admin-only write — no extra dashboard steps needed).

1. Sign in at `/admin/login`.
2. Open any division → **Settings** tab.
3. Upload your federation logo and set the Arabic/English names. Save —
   it appears instantly in the header on every public and admin page.

## Add clans with their logos

Admin dashboard → **Clans** tab, for either division:
- Type the clan name + a short tag (used as a compact badge), optionally
  attach a logo image, then add. Up to 10 per division, enforced both in
  the UI and at the database level.
- Tap the pencil icon on any existing clan to rename it, change its tag,
  or upload/replace its logo at any time — including after fixtures have
  already been generated.

## How it works

### Fixture generation
`lib/fixtures.ts` implements the standard **circle method** for round-robin
scheduling: 10 clans → 9 matchdays for a single round, or 18 matchdays for
a full home-and-away double round. Generating fixtures deletes any
existing matches for that division first (admin gets a confirmation step
in the UI before this happens).

### Standings
`lib/standings.ts` recalculates the table from scratch on every load from
the raw match results — there's no separate "points" column to get out of
sync. Sort order: **Points → Goal Difference → Goals For → name**.
3 points for a win, 1 for a draw, 0 for a loss.

### Access control
- Public pages only ever run `select` queries, allowed by RLS policies
  that grant read access to everyone.
- Write operations (`insert`/`update`/`delete` on clans/matches) are only
  allowed for `authenticated` users via RLS — enforced at the database
  level, not just hidden in the UI.
- `middleware.ts` additionally redirects anonymous visitors away from
  `/admin/dashboard/*` to `/admin/login` before the page even renders.

---

## Project structure

```
app/
├─ layout.tsx                        # root layout + header
├─ page.tsx                          # redirects to /league/first
├─ league/[division]/page.tsx        # public standings + fixtures
├─ admin/
│  ├─ login/page.tsx                 # Supabase Auth sign-in
│  └─ dashboard/
│     ├─ page.tsx                    # redirects to /admin/dashboard/first
│     └─ [division]/page.tsx         # clans / fixtures / results tabs
components/
├─ Header.tsx, DivisionSwitcher.tsx, ui.tsx
├─ StandingsTable.tsx, FixturesList.tsx
├─ ClanManager.tsx, FixtureGenerator.tsx
└─ FederationSettings.tsx            # federation name + logo (admin only)
lib/
├─ types.ts, standings.ts, fixtures.ts, uploadLogo.ts
└─ supabase/{client,server,middleware}.ts
supabase/schema.sql                  # run this once in Supabase SQL Editor
middleware.ts                        # protects /admin/dashboard/*
```

## Customizing

- **Clan names/logos**: rename any clan from Admin → Clans. To add crest
  images, add a `logo_url text` column to `clans` and an `<img>` in
  `StandingsTable.tsx` / `FixturesList.tsx`.
- **Colors**: edit `tailwind.config.ts` (`gold`, `neon`, `electric`,
  `panel`, `base`) — the whole UI is driven from those tokens.
- **More divisions**: insert another row into `divisions` with a new
  `key`, and the `DivisionSwitcher` picks it up automatically.
