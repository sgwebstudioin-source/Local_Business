import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import type { Business } from "@/lib/types";
import { login, logout, setStatus, deleteBusiness } from "./actions";

export const dynamic = "force-dynamic";

const btn = "rounded-full text-sm font-medium px-4 py-1.5 transition-colors";

function LoginForm({ error }: { error: boolean }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-center">Admin</h1>
      {!process.env.ADMIN_PASSWORD && (
        <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2">
          Set <code>ADMIN_PASSWORD</code> in <code>.env.local</code> to enable
          the admin panel.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          Wrong password.
        </p>
      )}
      <form action={login} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button className={`${btn} bg-stone-900 text-white py-2.5 hover:bg-stone-700`}>
          Sign in
        </button>
      </form>
    </div>
  );
}

function Row({ business }: { business: Business }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-xl" aria-hidden>
        {categoryIcon(business.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{business.name}</p>
        <p className="text-sm text-stone-500 truncate">
          {categoryLabel(business.category)}
          {business.area ? ` · ${business.area}` : ""}
          {business.phone ? ` · ${business.phone}` : " · no phone"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {business.status !== "approved" && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={business.id} />
            <input type="hidden" name="status" value="approved" />
            <button className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
              Approve
            </button>
          </form>
        )}
        {business.status !== "rejected" && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={business.id} />
            <input type="hidden" name="status" value="rejected" />
            <button className={`${btn} bg-red-100 text-red-700 hover:bg-red-200`}>
              Reject
            </button>
          </form>
        )}
        <Link
          href={`/admin/edit/${business.id}`}
          className={`${btn} border border-stone-300 hover:bg-stone-50`}
        >
          Edit
        </Link>
        <form action={deleteBusiness}>
          <input type="hidden" name="id" value={business.id} />
          <button className={`${btn} text-stone-400 hover:text-red-600`}>
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  const authed = await isAdmin();
  if (!authed) {
    const sp = await searchParams;
    return <LoginForm error={sp.error === "1"} />;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
          Supabase is not configured — set <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const businesses = (data ?? []) as Business[];
  const pending = businesses.filter((b) => b.status === "pending");
  const approved = businesses.filter((b) => b.status === "approved");
  const rejected = businesses.filter((b) => b.status === "rejected");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <form action={logout}>
          <button className={`${btn} border border-stone-300 hover:bg-stone-50`}>
            Sign out
          </button>
        </form>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Pending review{" "}
          <span className="text-sm font-normal text-stone-500">
            ({pending.length})
          </span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending submissions. 🎉</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((b) => (
              <Row key={b.id} business={b} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Live listings{" "}
          <span className="text-sm font-normal text-stone-500">
            ({approved.length})
          </span>
        </h2>
        <div className="flex flex-col gap-2">
          {approved.map((b) => (
            <Row key={b.id} business={b} />
          ))}
        </div>
      </section>

      {rejected.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Rejected{" "}
            <span className="text-sm font-normal text-stone-500">
              ({rejected.length})
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {rejected.map((b) => (
              <Row key={b.id} business={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
