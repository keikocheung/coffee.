"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { getBookmarkIds } from "@/lib/bookmarks";

const BMC_URL = "https://buymeacoffee.com/keikocheung";

function NavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inSaved = searchParams.get("saved") === "1";
  const [scrolled, setScrolled] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const linkClass = (active: boolean) =>
    `text-sm transition-colors ${active
      ? "text-[#673F27] font-semibold underline underline-offset-4"
      : "text-[#673F27]/60 hover:text-[#673F27]"}`;

  return (
    <nav
      className="sticky top-0 z-50 w-full bg-[#FEFEF0] transition-shadow duration-300"
      style={{ boxShadow: scrolled ? "0 2px 12px rgba(103,63,39,0.12)" : "none" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-[#673F27] hover:opacity-75 transition-opacity"
          style={{ fontFamily: "Pacifico, cursive", fontSize: "1.25rem" }}
        >
          coffee.
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/" className={linkClass(pathname === "/" && !inSaved)} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            home
          </Link>
          <Link href="/find-pattern" className={linkClass(pathname === "/find-pattern")} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            find pattern
          </Link>
          <Link href="/contact" className={linkClass(pathname === "/contact")} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            contact
          </Link>
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
          <Link href="/?saved=1" className="relative flex items-center transition-colors" aria-label="saved patterns">
            <span className="text-base leading-none transition-colors" style={{ color: bookmarkCount > 0 || inSaved ? "#673F27" : "rgba(103,63,39,0.35)", textDecoration: inSaved ? "underline" : "none", textUnderlineOffset: "4px" }}>
              {bookmarkCount > 0 || inSaved ? "♥" : "♡"}
            </span>
            {bookmarkCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#FEFEF0] px-0.5" style={{ backgroundColor: "#673F27", fontFamily: "var(--font-inter), sans-serif" }}>
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile: bookmark + hamburger */}
        <div className="flex sm:hidden items-center gap-3" ref={menuRef}>
          <Link href="/?saved=1" className="relative flex items-center" aria-label="saved patterns">
            <span className="text-base leading-none" style={{ color: bookmarkCount > 0 || inSaved ? "#673F27" : "rgba(103,63,39,0.35)" }}>
              {bookmarkCount > 0 || inSaved ? "♥" : "♡"}
            </span>
            {bookmarkCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#FEFEF0] px-0.5" style={{ backgroundColor: "#673F27", fontFamily: "var(--font-inter), sans-serif" }}>
                {bookmarkCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-[#673F27] text-xl leading-none p-1"
            aria-label="menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute top-full right-0 w-48 rounded-2xl shadow-lg py-2 flex flex-col"
              style={{ backgroundColor: "#FEFEF0", border: "1px solid rgba(103,63,39,0.12)", marginTop: "4px" }}
            >
              <Link href="/" className={`px-5 py-2.5 text-sm ${pathname === "/" && !inSaved ? "text-[#673F27] font-semibold" : "text-[#673F27]/60"}`} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                home
              </Link>
              <Link href="/find-pattern" className={`px-5 py-2.5 text-sm ${pathname === "/find-pattern" ? "text-[#673F27] font-semibold" : "text-[#673F27]/60"}`} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                find pattern
              </Link>
              <Link href="/contact" className={`px-5 py-2.5 text-sm ${pathname === "/contact" ? "text-[#673F27] font-semibold" : "text-[#673F27]/60"}`} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                contact
              </Link>
              <a href={BMC_URL} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 text-sm text-[#673F27]/60 flex items-center gap-1.5" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                <span>☕</span> support me!
              </a>
            </div>
          )}
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
