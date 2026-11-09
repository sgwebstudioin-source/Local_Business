import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChennaiLocal — find local businesses in Chennai",
    template: "%s | ChennaiLocal",
  },
  description:
    "A directory of local Chennai businesses — tiffin centers, tailors, groceries, salons, electricians and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span aria-hidden>🛺</span>
              <span>
                Chennai<span className="text-amber-600">Local</span>
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/suggest"
                className="rounded-full bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700 transition-colors"
              >
                + Suggest a business
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-stone-500 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p>ChennaiLocal — helping small Chennai businesses get found.</p>
              <p className="text-xs">
                Listing and map data ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-700"
                >
                  OpenStreetMap
                </a>{" "}
                contributors, available under the ODbL.
              </p>
            </div>
            <Link href="/admin" className="hover:text-stone-700">
              Admin
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
