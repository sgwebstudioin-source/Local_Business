/**
 * Import Chennai businesses from OpenStreetMap via the Overpass API.
 *
 *   node scripts/import-osm.mjs              # fetch -> lib/chennai-businesses.json
 *   node scripts/import-osm.mjs --supabase   # also upsert into Supabase
 *   node scripts/import-osm.mjs --with-website
 *
 * OSM data is ODbL-licensed: free to use and redistribute with attribution.
 * (Google Maps data is not — its terms forbid storing Places results or
 * rendering them on a non-Google map, which is what this app does.)
 */

import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { nearestArea } from "./chennai-areas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Greater Chennai bounding box — must stay in sync with CHENNAI_BOUNDS.
const BBOX = [12.8, 80.05, 13.26, 80.4];

// Rotated through on retry — the public instances are often overloaded.
// Only mirrors verified to work from here; a dead mirror costs a retry cycle
// per query group, which is worse than having fewer to rotate through.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** OSM tag -> our category slug. First match wins. */
const AMENITY_MAP = {
  restaurant: "restaurant",
  fast_food: "restaurant",
  food_court: "restaurant",
  cafe: "restaurant",
  pharmacy: "pharmacy",
};

const SHOP_MAP = {
  bakery: "bakery",
  pastry: "bakery",
  confectionery: "bakery",

  convenience: "grocery",
  supermarket: "grocery",
  greengrocer: "grocery",
  grocery: "grocery",
  general: "grocery",
  kiosk: "grocery",
  butcher: "grocery",
  seafood: "grocery",
  dairy: "grocery",
  spices: "grocery",
  rice: "grocery",

  tailor: "tailor",
  dressmaker: "tailor",
  fabric: "tailor",
  sewing: "tailor",

  hairdresser: "salon",
  beauty: "salon",
  barber: "salon",
  massage: "salon",

  electrical: "electrician",
  lighting: "electrician",

  hardware: "plumber",
  doityourself: "plumber",

  car_repair: "mechanic",
  motorcycle_repair: "mechanic",
  motorcycle: "mechanic",
  bicycle: "mechanic",
  tyres: "mechanic",

  chemist: "pharmacy",
  medical_supply: "pharmacy",

  florist: "flower-shop",
  garden_centre: "flower-shop",

  stationery: "stationery",
  books: "stationery",
  copyshop: "stationery",
  newsagent: "stationery",
  printing: "stationery",
};

const CRAFT_MAP = {
  electrician: "electrician",
  plumber: "plumber",
  tailor: "tailor",
  dressmaker: "tailor",
  shoemaker: "other",
  carpenter: "other",
  painter: "other",
  photographer: "other",
  jeweller: "other",
  key_cutter: "other",
  locksmith: "other",
};

/** Categories where a "menu" section makes sense (mirrors MENU_CATEGORIES). */
const CUISINE_LABEL = {
  indian: "Indian",
  south_indian: "South Indian",
  north_indian: "North Indian",
  chinese: "Chinese",
  biryani: "Biryani",
  vegetarian: "Vegetarian",
  chettinad: "Chettinad",
  seafood: "Seafood",
  pizza: "Pizza",
  burger: "Burger",
  coffee_shop: "Coffee",
  ice_cream: "Ice cream",
};

/**
 * One query per tag group, and big groups split further. Asking Overpass for
 * every shop in Chennai at once reliably 504s, so keep each request small.
 */
function buildQueries() {
  const bbox = BBOX.join(",");
  const chunk = (arr, size) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );

  const queries = [];
  const add = (key, values) => {
    queries.push({
      label: `${key}=${values[0]}…(${values.length})`,
      // nwr = nodes, ways and relations. "out center" gives a point for areas.
      query: `[out:json][timeout:90];
nwr["${key}"~"^(${values.join("|")})$"]["name"](${bbox});
out center tags;`,
    });
  };

  for (const group of chunk(Object.keys(AMENITY_MAP), 3)) add("amenity", group);
  for (const group of chunk(Object.keys(SHOP_MAP), 6)) add("shop", group);
  for (const group of chunk(Object.keys(CRAFT_MAP), 6)) add("craft", group);

  return queries;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function categoryFor(tags) {
  if (tags.amenity && AMENITY_MAP[tags.amenity]) return AMENITY_MAP[tags.amenity];
  if (tags.shop && SHOP_MAP[tags.shop]) return SHOP_MAP[tags.shop];
  if (tags.craft && CRAFT_MAP[tags.craft]) return CRAFT_MAP[tags.craft];
  return null;
}

/** Tiffin centers aren't an OSM tag — infer them from name/cuisine. */
function refineCategory(category, tags) {
  if (category !== "restaurant") return category;
  const name = (tags.name ?? "").toLowerCase();
  const cuisine = (tags.cuisine ?? "").toLowerCase();
  if (/tiffin|mess|idli|dosa|udupi/.test(name)) return "tiffin-center";
  if (tags.amenity === "cafe" && /coffee|tea|chai/.test(name)) return "tiffin-center";
  if (cuisine.includes("south_indian") && /mess|tiffin/.test(name)) {
    return "tiffin-center";
  }
  return category;
}

function buildAddress(tags, area) {
  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(", ");

  const parts = [
    street,
    tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? area,
    tags["addr:city"] ?? "Chennai",
    tags["addr:postcode"],
  ].filter(Boolean);

  // Deduplicate repeated locality names ("Mylapore, Mylapore")
  const seen = new Set();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.join(", ");
}

/** Prefer the tagged locality; most POIs have none, so fall back to geography. */
function buildArea(tags, { lat, lng }) {
  const tagged =
    tags["addr:suburb"] ??
    tags["addr:neighbourhood"] ??
    tags["addr:city_district"] ??
    null;
  if (tagged) return tagged.trim();
  return nearestArea(lat, lng);
}

function buildDescription(tags, category) {
  const bits = [];

  const cuisines = (tags.cuisine ?? "")
    .split(";")
    .map((c) => CUISINE_LABEL[c.trim()])
    .filter(Boolean);
  if (cuisines.length) bits.push(`${cuisines.join(", ")} food.`);

  if (tags["diet:vegetarian"] === "only") bits.push("Pure vegetarian.");
  if (tags.opening_hours && tags.opening_hours.length < 40) {
    bits.push(`Open ${tags.opening_hours}.`);
  }
  if (tags.takeaway === "yes") bits.push("Takeaway available.");
  if (tags.delivery === "yes") bits.push("Home delivery.");
  if (tags["payment:upi"] === "yes") bits.push("UPI accepted.");
  if (tags.wheelchair === "yes") bits.push("Wheelchair accessible.");

  if (!bits.length && category) {
    return ""; // let the UI fall back to the category label
  }
  return bits.join(" ");
}

function normalizePhone(tags) {
  const raw = tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"] ?? null;
  if (!raw) return null;
  // Take the first number if several are listed, strip spacing noise.
  const first = raw.split(/[;,]/)[0].trim().replace(/[()\s-]/g, "");
  if (!/^\+?\d{6,15}$/.test(first)) return null;
  return first.startsWith("+") ? first : `+91${first.replace(/^0+/, "")}`;
}

function coordsOf(el) {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function inBbox({ lat, lng }) {
  const [south, west, north, east] = BBOX;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

const REQUEST_TIMEOUT_MS = 60_000;

async function runQuery(query, attempt = 0) {
  const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
  try {
    // Don't sit on a stalled mirror — abort and rotate to the next one.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ChennaiLocal/0.1 (OSM import for a local directory)",
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).elements ?? [];
  } catch (err) {
    if (attempt >= 4) throw err;
    // Overpass is a free shared resource — back off rather than hammer it.
    const wait = 3000 * (attempt + 1);
    process.stdout.write(`${err.message}, retrying in ${wait / 1000}s… `);
    await sleep(wait);
    return runQuery(query, attempt + 1);
  }
}

const CACHE_DIR = join(ROOT, "scripts", ".cache");

/** Overpass is flaky, so keep each group's result and skip it on a re-run. */
function cachePathFor(query) {
  const hash = createHash("sha1").update(query).digest("hex").slice(0, 12);
  return join(CACHE_DIR, `${hash}.json`);
}

async function fetchAll({ refresh }) {
  const queries = buildQueries();
  await mkdir(CACHE_DIR, { recursive: true });

  const elements = [];
  const failed = [];

  for (const [i, { label, query }] of queries.entries()) {
    process.stdout.write(`[${i + 1}/${queries.length}] ${label} … `);
    const cachePath = cachePathFor(query);

    if (!refresh && existsSync(cachePath)) {
      const cached = JSON.parse(readFileSync(cachePath, "utf8"));
      elements.push(...cached);
      console.log(`${cached.length} (cached)`);
      continue;
    }

    try {
      const got = await runQuery(query);
      elements.push(...got);
      await writeFile(cachePath, JSON.stringify(got), "utf8");
      console.log(`${got.length}`);
    } catch (err) {
      // One bad group shouldn't lose the rest of the run.
      console.log(`giving up (${err.message})`);
      failed.push(label);
    }
    await sleep(1200); // be a polite client
  }

  if (failed.length) {
    console.log(
      `\n⚠ ${failed.length} group(s) failed and were skipped: ${failed.join(", ")}` +
        `\n  Re-run the script — cached groups are reused, so it only retries these.`
    );
  }
  return elements;
}

function toBusinesses(elements, { includeWithWebsite }) {
  const byKey = new Map();
  let skippedWebsite = 0;
  let skippedNoCategory = 0;

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name) continue;

    const coords = coordsOf(el);
    if (!coords || !inBbox(coords)) continue;

    let category = categoryFor(tags);
    if (!category) {
      skippedNoCategory++;
      continue;
    }
    category = refineCategory(category, tags);

    // The directory exists for businesses that have no site of their own.
    const website = tags.website ?? tags["contact:website"] ?? null;
    if (website && !includeWithWebsite) {
      skippedWebsite++;
      continue;
    }

    // OSM often holds the same shop as both a node and a building way.
    const key = `${name.toLowerCase()}|${coords.lat.toFixed(3)}|${coords.lng.toFixed(3)}`;
    const existing = byKey.get(key);
    const area = buildArea(tags, coords);

    const business = {
      id: `osm-${el.type}-${el.id}`,
      name,
      category,
      description: buildDescription(tags, category),
      phone: normalizePhone(tags),
      address: buildAddress(tags, area),
      area,
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      photos: [],
      menu_photos: [],
      menu_items: null,
      status: "approved",
      source: "osm",
      osm_id: `${el.type}/${el.id}`,
      created_at: new Date().toISOString(),
    };

    // Prefer the richer record when duplicated.
    if (!existing || score(business) > score(existing)) byKey.set(key, business);
  }

  return {
    businesses: [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name)),
    skippedWebsite,
    skippedNoCategory,
  };
}

function score(b) {
  return (
    (b.phone ? 2 : 0) + (b.address ? 1 : 0) + (b.description ? 1 : 0) + (b.area ? 1 : 0)
  );
}

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function pushToSupabase(businesses) {
  const env = { ...loadEnv(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT")) {
    console.error(
      "\n✗ Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local first."
    );
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const CHUNK = 500;
  let done = 0;
  for (let i = 0; i < businesses.length; i += CHUNK) {
    // `id` is a uuid column in Supabase, so drop our "osm-node-123" key and
    // let the database generate one; osm_id is what re-imports match on.
    const chunk = businesses.slice(i, i + CHUNK).map((b) => ({
      name: b.name,
      category: b.category,
      description: b.description,
      phone: b.phone,
      address: b.address,
      area: b.area,
      lat: b.lat,
      lng: b.lng,
      photos: b.photos,
      menu_photos: b.menu_photos,
      menu_items: b.menu_items,
      status: b.status,
      source: b.source,
      osm_id: b.osm_id,
    }));
    const { error } = await supabase
      .from("businesses")
      .upsert(chunk, { onConflict: "osm_id" });
    if (error) {
      console.error(`\n✗ Upsert failed at row ${i}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    done += chunk.length;
    process.stdout.write(`\rUpserted ${done}/${businesses.length}…`);
  }
  console.log(`\n✓ Upserted ${done} businesses into Supabase.`);
}

async function main() {
  const args = process.argv.slice(2);
  const includeWithWebsite = args.includes("--with-website");
  const toSupabase = args.includes("--supabase");
  const refresh = args.includes("--refresh");

  const elements = await fetchAll({ refresh });
  console.log(`\nFetched ${elements.length} OSM elements.`);

  const { businesses, skippedWebsite, skippedNoCategory } = toBusinesses(
    elements,
    { includeWithWebsite }
  );

  const counts = {};
  let withPhone = 0;
  for (const b of businesses) {
    counts[b.category] = (counts[b.category] ?? 0) + 1;
    if (b.phone) withPhone++;
  }

  console.log(`\n${businesses.length} businesses after filtering`);
  console.log(`  skipped (already have a website): ${skippedWebsite}`);
  console.log(`  skipped (unmapped category):      ${skippedNoCategory}`);
  console.log(
    `  with a phone number:              ${withPhone} ` +
      `(${Math.round((withPhone / businesses.length) * 100)}%)`
  );
  console.log("\nBy category:");
  for (const [cat, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(14)} ${n}`);
  }

  const outPath = join(ROOT, "lib", "chennai-businesses.json");
  await writeFile(outPath, JSON.stringify(businesses), "utf8");
  console.log(`\n✓ Wrote ${outPath}`);

  if (toSupabase) await pushToSupabase(businesses);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
