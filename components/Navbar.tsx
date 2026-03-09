"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
              pathname === "/"
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
        </div>
      </div>
    </nav>
  );
}
