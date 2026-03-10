"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getBookmarkIds } from "@/lib/bookmarks";

// ── Replace YOUR_USERNAME with your buymeacoffee.com username once set up ──────
const BMC_URL = "https://buymeacoffee.com/keikocheung";
// ─────────────────────────────────────────────────────────────────────────────

function NavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inSaved = searchParams.get("saved") === "1";
  const [scrolled, setScrolled] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setBookmarkCount(getBookmarkIds().length);
    const onUpdate = () => setBookmarkCount(getBookmarkIds().length);
    window.addEventListener("bookmarks-updated", onUpdate);
    return () => window.removeEventListener("bookmarks-updated", onUpdate);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 w-full bg-[#FEFEF0] transition-shadow duration-300"
      style={{ boxShadow: scrolled ? "0 2px 12px rgba(103,63,39,0.12)" : "none" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-[#673F27] hover:opacity-75 transition-opacity"
          style={{ fontFamily: "Pacifico, cursive", fontSize: "1.25rem" }}
        >
          coffee.
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm transition-colors ${
              pathname === "/" && !inSaved
                ? "text-[#673F27] font-semibold underline underline-offset-4"
                : "text-[#673F27]/60 hover:text-[#673F27]"
            }`}
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            home
          </Link>
          <Link
            href="/find-pattern"
            className={`text-sm transition-colors ${
              pathname === "/find-pattern"
                ? "text-[#673F27] font-semibold underline underline-offset-4"
                : "text-[#673F27]/60 hover:text-[#673F27]"
            }`}
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            find pattern
          </Link>
          <Link
            href="/contact"
            className={`text-sm transition-colors ${
              pathname === "/contact"
                ? "text-[#673F27] font-semibold underline underline-offset-4"
                : "text-[#673F27]/60 hover:text-[#673F27]"
            }`}
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            contact
          </Link>

          {/* Buy Me a Coffee */}
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#673F27]/60 hover:text-[#673F27] transition-colors"
            aria-label="buy me a coffee"
          >
            <span className="text-base leading-none">☕</span>
            <span className="text-sm" style={{ fontFamily: "var(--font-inter), sans-serif" }}>support me!</span>
          </a>

          {/* Bookmark heart */}
          <Link
            href="/?saved=1"
            className="relative flex items-center transition-colors"
            aria-label="saved patterns"
          >
            <span
              className="text-base leading-none transition-colors"
              style={{
                color: bookmarkCount > 0 || inSaved ? "#673F27" : "rgba(103,63,39,0.35)",
                textDecoration: inSaved ? "underline" : "none",
                textUnderlineOffset: "4px",
              }}
            >
              {bookmarkCount > 0 || inSaved ? "♥" : "♡"}
            </span>
            {bookmarkCount > 0 && (
              <span
                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#FEFEF0] px-0.5"
                style={{ backgroundColor: "#673F27", fontFamily: "var(--font-inter), sans-serif" }}
              >
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense>
      <NavbarInner />
    </Suspense>
  );
}
