"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured, PHOTOS_BUCKET } from "@/lib/supabase/client";
import { CATEGORIES, MENU_CATEGORIES } from "@/lib/constants";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-stone-400">
      Loading map…
    </div>
  ),
});

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

async function uploadFiles(files: File[], prefix: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export default function SuggestPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [menuPhotos, setMenuPhotos] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const isMenuCategory = MENU_CATEGORIES.has(category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!location) {
      setError("Please tap the map to pin the shop's location.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("Submissions are not enabled yet (Supabase is not configured).");
      return;
    }

    setState("saving");
    try {
      const photoUrls = await uploadFiles(photos, "photos");
      const menuUrls = isMenuCategory ? await uploadFiles(menuPhotos, "menus") : [];

      const { error: insertError } = await supabase.from("businesses").insert({
        name: name.trim(),
        category,
        phone: phone.trim(),
        address: address.trim(),
        area: area.trim() || null,
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        photos: photoUrls,
        menu_photos: menuUrls,
        status: "pending",
        source: "user",
      });
      if (insertError) throw new Error(insertError.message);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold">Thanks for the suggestion!</h1>
        <p className="mt-2 text-stone-600">
          It&apos;s now pending review. Once approved, it will appear in the
          directory.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-amber-600 text-white font-medium px-6 py-2.5 hover:bg-amber-700"
        >
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold">Suggest a business</h1>
      <p className="mt-1 text-stone-600 text-sm">
        Know a great local shop without a website? Add it here — we&apos;ll
        review it before it goes live.
      </p>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2">
          Demo mode: submissions are disabled until Supabase is configured.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Business name *
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Saravana Tiffin Kadai"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Category *
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Phone number *
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="+91 98400 12345"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Address *
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputCls}
            placeholder="Street, locality, PIN"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Area / neighbourhood
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={inputCls}
            placeholder="e.g. Mylapore"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="What does this shop do well? Timings, specialities…"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium">
          Pin the location * <span className="font-normal text-stone-500">(tap the map)</span>
          <div className="h-64 rounded-xl overflow-hidden border border-stone-300">
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          {location && (
            <p className="text-xs text-stone-500 font-normal">
              Pinned at {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
        </label>

        {isMenuCategory && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Menu photos <span className="font-normal text-stone-500">(optional)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setMenuPhotos(Array.from(e.target.files ?? []))}
              className="text-sm"
            />
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "saving" || !isSupabaseConfigured}
          className="rounded-full bg-amber-600 text-white font-medium px-6 py-3 hover:bg-amber-700 disabled:opacity-50"
        >
          {state === "saving" ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
