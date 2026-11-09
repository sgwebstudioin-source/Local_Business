import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CATEGORIES } from "@/lib/constants";
import type { Business } from "@/lib/types";
import { updateBusiness } from "../../actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

export default async function EditPage({
  params,
}: PageProps<"/admin/edit/[id]">) {
  if (!(await isAdmin())) redirect("/admin");

  const supabase = getSupabaseAdmin();
  if (!supabase) redirect("/admin");

  const { id } = await params;
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const b = data as Business;

  const menuItemsText = (b.menu_items ?? [])
    .map((i) => `${i.name} | ${i.price}`)
    .join("\n");

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to admin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit listing</h1>

      <form action={updateBusiness} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="id" value={b.id} />

        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input name="name" required defaultValue={b.name} className={inputCls} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Category
            <select name="category" defaultValue={b.category} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Status
            <select name="status" defaultValue={b.status} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Phone <span className="font-normal text-stone-500">(may be blank)</span>
          <input name="phone" defaultValue={b.phone ?? ""} className={inputCls} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Address
          <input name="address" required defaultValue={b.address} className={inputCls} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Area
          <input name="area" defaultValue={b.area ?? ""} className={inputCls} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={b.description}
            className={inputCls}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Latitude
            <input name="lat" required defaultValue={b.lat} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Longitude
            <input name="lng" required defaultValue={b.lng} className={inputCls} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Photo URLs <span className="font-normal text-stone-500">(one per line)</span>
          <textarea
            name="photos"
            rows={3}
            defaultValue={b.photos.join("\n")}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Menu photo URLs <span className="font-normal text-stone-500">(one per line)</span>
          <textarea
            name="menu_photos"
            rows={2}
            defaultValue={b.menu_photos.join("\n")}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Menu items{" "}
          <span className="font-normal text-stone-500">
            (one per line: Item name | ₹price)
          </span>
          <textarea
            name="menu_items"
            rows={4}
            defaultValue={menuItemsText}
            className={inputCls}
            placeholder={"Idli (2 pcs) | ₹30\nFilter Coffee | ₹25"}
          />
        </label>

        <button className="rounded-full bg-stone-900 text-white font-medium px-6 py-3 hover:bg-stone-700">
          Save changes
        </button>
      </form>
    </div>
  );
}
