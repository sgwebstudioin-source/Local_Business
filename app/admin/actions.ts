"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdmin, passwordToken } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MenuItem } from "@/lib/types";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    redirect("/admin?error=1");
  }
  (await cookies()).set(ADMIN_COOKIE, passwordToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

async function requireAdminClient() {
  if (!(await isAdmin())) throw new Error("Not authorized");
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function setStatus(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["approved", "rejected", "pending"].includes(status)) {
    throw new Error("Invalid status");
  }
  const { error } = await supabase
    .from("businesses")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/business/${id}`);
}

export async function deleteBusiness(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
}

/** Parse "Idli (2 pcs) | ₹30" lines into menu items. */
function parseMenuItems(raw: string): MenuItem[] | null {
  const items = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split("|");
      return { name: name.trim(), price: rest.join("|").trim() };
    })
    .filter((i) => i.name);
  return items.length > 0 ? items : null;
}

function parseUrlList(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function updateBusiness(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id"));

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Latitude/longitude must be numbers");
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "other"),
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim(),
      area: String(formData.get("area") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim(),
      lat,
      lng,
      photos: parseUrlList(String(formData.get("photos") ?? "")),
      menu_photos: parseUrlList(String(formData.get("menu_photos") ?? "")),
      menu_items: parseMenuItems(String(formData.get("menu_items") ?? "")),
      status: String(formData.get("status") ?? "pending"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/business/${id}`);
  redirect("/admin");
}
