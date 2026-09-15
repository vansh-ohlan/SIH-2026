"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Citizen Portal" },
  { href: "/officer", label: "Officer Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 plot-border-solid border-t-0 border-l-0 border-r-0 bg-parchment/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full survey-stamp text-sm font-serif font-semibold">
            भू
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold text-ink">
              Bhu-Setu
            </div>
            <div className="text-[11px] tracking-wide text-ink/60">
              Unified Land Record Portal · Punjab
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink text-parchment"
                    : "text-ink/70 hover:text-ink hover:bg-ink/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
