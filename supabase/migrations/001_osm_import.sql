-- Run this only if you created the database before the OSM import existed.
-- A fresh run of schema.sql already includes everything here.

-- Imported listings frequently have no phone number on record.
alter table public.businesses alter column phone drop not null;
alter table public.businesses alter column address set default '';

-- Track where a listing came from, and allow re-imports to upsert.
alter table public.businesses
  add column if not exists source text not null default 'user';

alter table public.businesses
  add column if not exists osm_id text;

create unique index if not exists businesses_osm_id_key
  on public.businesses (osm_id)
  where osm_id is not null;
