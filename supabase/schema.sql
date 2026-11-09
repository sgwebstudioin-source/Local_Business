-- ChennaiLocal — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- ============ Tables ============

create table if not exists public.categories (
  id text primary key,          -- slug, e.g. 'restaurant'
  name text not null,
  icon text not null default '🏪'
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null references public.categories (id),
  description text not null default '',
  -- Nullable: imported listings often have no number on record yet.
  phone text,
  address text not null default '',
  area text,                    -- neighbourhood, e.g. 'T. Nagar'
  lat double precision not null,
  lng double precision not null,
  photos text[] not null default '{}',        -- storage public URLs
  menu_photos text[] not null default '{}',   -- storage public URLs (restaurants)
  menu_items jsonb,                           -- [{ "name": "...", "price": "..." }]
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  source text not null default 'user',   -- 'user' | 'osm'
  osm_id text unique,                    -- e.g. 'node/123456', lets re-imports upsert
  -- keep pins inside greater Chennai
  constraint chennai_lat check (lat between 12.8 and 13.26),
  constraint chennai_lng check (lng between 80.05 and 80.4)
);

create index if not exists businesses_status_idx on public.businesses (status);
create index if not exists businesses_category_idx on public.businesses (category);

-- ============ Row Level Security ============

alter table public.categories enable row level security;
alter table public.businesses enable row level security;

-- Categories: readable by everyone
drop policy if exists "categories are public" on public.categories;
create policy "categories are public"
  on public.categories for select
  using (true);

-- Businesses: anyone can read approved listings
drop policy if exists "approved businesses are public" on public.businesses;
create policy "approved businesses are public"
  on public.businesses for select
  using (status = 'approved');

-- Businesses: anyone can suggest a business, but only as 'pending'
drop policy if exists "anyone can suggest pending" on public.businesses;
create policy "anyone can suggest pending"
  on public.businesses for insert
  with check (status = 'pending');

-- No anon update/delete policies: moderation happens server-side with the
-- service-role key, which bypasses RLS.

-- ============ Storage ============

insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

-- Public read of photos
drop policy if exists "public read business photos" on storage.objects;
create policy "public read business photos"
  on storage.objects for select
  using (bucket_id = 'business-photos');

-- Anyone can upload into the bucket (submission form)
drop policy if exists "anyone can upload business photos" on storage.objects;
create policy "anyone can upload business photos"
  on storage.objects for insert
  with check (bucket_id = 'business-photos');

-- ============ Seed: categories ============

insert into public.categories (id, name, icon) values
  ('restaurant',    'Restaurant',    '🍛'),
  ('tiffin-center', 'Tiffin Center', '🥞'),
  ('bakery',        'Bakery',        '🥖'),
  ('grocery',       'Grocery',       '🛒'),
  ('tailor',        'Tailor',        '🧵'),
  ('salon',         'Salon',         '💇'),
  ('electrician',   'Electrician',   '🔌'),
  ('plumber',       'Plumber',       '🔧'),
  ('mechanic',      'Mechanic',      '🛵'),
  ('pharmacy',      'Pharmacy',      '💊'),
  ('flower-shop',   'Flower Shop',   '🌼'),
  ('stationery',    'Stationery',    '✏️'),
  ('other',         'Other',         '🏪')
on conflict (id) do nothing;
