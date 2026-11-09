# ChennaiLocal

A directory of local Chennai businesses that don't have their own website —
tiffin centers, tailors, groceries, salons, electricians and more.

**Stack:** Next.js (App Router) + TypeScript · Supabase (DB, storage) ·
Leaflet + OpenStreetMap · Tailwind CSS. Mobile-first.

## Features

- **Homepage** — search, category filter chips, and a list ⇄ map toggle.
  The map is bounded to greater Chennai (no panning off to the Bay of Bengal).
- **Near me** — "Use my location" asks the browser for GPS; if the user
  declines (or is outside Chennai), they can drop a pin on the map instead.
  Results are then filtered to a radius (1/2/5/10 km or any) and sorted
  nearest-first, with a distance badge on each card and a radius circle plus
  "you are here" marker on the map. The chosen location is kept in
  `localStorage`, so repeat visits skip the prompt. Location never leaves the
  browser — distances are computed client-side.
- **Business profile** — photos, description, address, click-to-call phone,
  OSM directions link, mini-map, and a menu section (item/price list and/or
  menu photos) for restaurants, tiffin centers and bakeries.
- **Suggest a business** — public form with map pin-drop, photo upload and
  optional menu photos. Submissions land in `pending`.
- **Admin** (`/admin`) — password-gated. Approve/reject pending submissions,
  edit or delete any listing.

## Getting started

```bash
npm install
npm run dev
```

Without Supabase configured, the app runs in **demo mode**: it reads listings
from `lib/chennai-businesses.json` (see below), or falls back to a few
hand-written samples if that import hasn't been run. Submissions and the admin
panel need Supabase.

## Loading real Chennai businesses

Listings come from **OpenStreetMap** via the [Overpass API](https://overpass-api.de):

```bash
node scripts/import-osm.mjs
```

This writes `lib/chennai-businesses.json`, which demo mode reads immediately.
Once Supabase is configured, push the same data into the database:

```bash
node scripts/import-osm.mjs --supabase
```

Re-running is safe — rows are upserted on `osm_id`, so edits you make in the
admin panel to *other* fields aren't duplicated into new rows.

Flags:

| Flag | Effect |
| --- | --- |
| `--supabase` | Also upsert into the `businesses` table (needs the service-role key) |
| `--with-website` | Keep businesses that already have their own website (skipped by default) |
| `--refresh` | Ignore the local Overpass response cache and refetch |

Responses are cached per query group under `scripts/.cache/`, so a re-run after
a partial failure only retries the groups that failed. Overpass is a free,
shared service and returns 504/429 under load — the script backs off, retries,
and continues past groups it can't fetch.

### Why OpenStreetMap and not Google Maps

Google's Places API terms prohibit storing their place data in your own
database or displaying it on a non-Google map — both of which this app does —
and it requires a billed API key. OpenStreetMap data is ODbL-licensed: free to
store, redistribute and display, as long as it's attributed (the footer does
this). Scraping Google Maps would violate the same terms as the API.

### What a real run returns

As of the last import, Chennai yielded **2,851 businesses** (3,039 OSM elements
before filtering; 159 skipped for already having a website):

| Category | Count | | Category | Count |
| --- | ---: | --- | --- | ---: |
| Restaurant | 1,051 | | Mechanic | 107 |
| Grocery | 523 | | Tailor | 104 |
| Pharmacy | 285 | | Plumber | 56 |
| Electrician | 163 | | Other | 9 |
| Stationery | 144 | | Flower shop | 6 |
| Bakery | 144 | | | |
| Tiffin center | 141 | | | |
| Salon | 118 | | | |

Field coverage: 98% have an area, 99% an address, 20% a description — but only
**5% have a phone number**. That last figure is the main gap between this
import and a directory people can actually call, and it's why the "Suggest a
business" form matters.

### What the import does and doesn't give you

- It only keeps places tagged with a **name** and a category we map
  (restaurants, bakeries, groceries, tailors, salons, electricians, plumbers,
  mechanics, pharmacies, florists, stationery).
- Businesses that already list a `website` tag are **skipped** — the whole
  point of this directory is shops without one.
- **Phone numbers are often missing in OSM.** `phone` is therefore nullable,
  and the UI hides the call button when there's no number. Expect a large share
  of listings to need a phone added by hand or via a public suggestion.
- Coverage of the true long tail (one-person tailors, small tiffin centers) is
  thinner than for restaurants. The "Suggest a business" form exists to fill
  that gap.

## Going live with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the Dashboard → **SQL Editor**, paste and run
   [`supabase/schema.sql`](supabase/schema.sql). This creates the
   `businesses` and `categories` tables, RLS policies, the public
   `business-photos` storage bucket, and seeds the categories.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (same page — **server-only**, used by the
     admin panel; never exposed to the browser)
   - `ADMIN_PASSWORD` — the password for `/admin`
4. Restart `npm run dev`.

### Security model

- The browser only ever uses the anon key. RLS allows the public to **read
  approved** listings and **insert pending** ones — nothing else.
- Approve/reject/edit/delete run in server actions using the service-role
  key, behind the admin password (httpOnly cookie holding a SHA-256 token).

## Data model

- `businesses`: id, name, category, description, phone (nullable), address,
  area, lat/lng (constrained to Chennai bounds), `photos` text[],
  `menu_photos` text[], `menu_items` jsonb, status
  (`pending`/`approved`/`rejected`), created_at, `source` (`user` | `osm`),
  `osm_id` (unique, lets re-imports upsert)
- `categories`: id (slug), name, icon (emoji)

If you created the database before the OSM import existed, apply
[`supabase/migrations/001_osm_import.sql`](supabase/migrations/001_osm_import.sql)
rather than re-running the whole schema.

## Project layout

- `app/page.tsx` — homepage (server-fetched listings → client directory view)
- `app/business/[id]/page.tsx` — profile page
- `app/suggest/page.tsx` — public submission form
- `app/admin/` — admin panel + server actions
- `components/` — map views, cards, gallery, location picker, location bar
- `lib/` — types, category constants, Supabase clients, data access,
  distance math (`geo.ts`) and the saved-location store (`use-origin.ts`)
- `scripts/import-osm.mjs` — OpenStreetMap importer

### Performance notes

With thousands of listings the directory stays responsive by:

- rendering the list 48 cards at a time behind a "Show more" button, and
- drawing only the map markers inside the current viewport, capped at 300,
  with a "zoom in for more" hint when there are more nearby.

Demo mode still ships the whole JSON dataset to the browser. Once you're on
Supabase and the dataset grows, move filtering server-side (a bounding-box
query, or PostGIS/`earthdistance` for radius search) instead of loading every
listing up front.
- `supabase/schema.sql` — full schema + RLS + seed

## Deploying to Cloudflare

The app is deployed to **Cloudflare Workers** via the
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter. Workers
(not Pages) is the supported target — this app needs server actions, dynamic
rendering and `node:crypto`, so a static export won't do.

### Version requirement

`@opennextjs/cloudflare` supports `next >=15.5.29 <16 || >=16.4.5`. Next
**16.3.5 falls in the unsupported gap**, so the project must be on **16.4.5+**:

```powershell
npm install next@16.4.5 eslint-config-next@16.4.5
npm run build
```

### One-time setup

```powershell
npm install --save-dev @opennextjs/cloudflare@latest wrangler@latest
npx wrangler login
```

`wrangler.jsonc` and `open-next.config.ts` are already committed.
`nodejs_compat` is enabled there because `lib/admin-auth.ts` uses
`node:crypto` and `Buffer`.

### Environment variables — two different kinds

| Variable | When it's needed | Where it goes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Build time** (inlined into the client bundle) | `.env.local`, or a build variable in the dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Build time** | same |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime (server only) | `wrangler secret put` |
| `ADMIN_PASSWORD` | Runtime (server only) | `wrangler secret put` |

Getting this wrong is the usual cause of a deployed site showing demo data: the
`NEXT_PUBLIC_*` pair must exist **at build time** or they are compiled out.

```powershell
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ADMIN_PASSWORD
```

Never put those two in `wrangler.jsonc` — that file is committed.

### Preview locally, then deploy

```powershell
npm run cf:preview   # builds and runs in the real workerd runtime
npm run cf:deploy    # builds and publishes
```

`npm run dev` uses Node, so always smoke-test with `cf:preview` before
deploying — runtime differences show up there, not in `next dev`.

### ISR note

`open-next.config.ts` runs at defaults, so pages with
`export const revalidate = 60` are rendered on demand rather than served from a
persisted cache. For real ISR, create an R2 bucket and add the
`r2IncrementalCache` override to `open-next.config.ts`.
