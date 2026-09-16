"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { checkBackendConnection } from "@/lib/api";
import { 
  Compass, 
  Layers, 
  ShieldAlert, 
  FileCheck2, 
  UserCheck, 
  LogOut, 
  LogIn,
  Search,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, isAuthenticated, logout } = useAuth();
  const [isBackendLive, setIsBackendLive] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkBackendConnection().then((live) => {
      if (isMounted) setIsBackendLive(live);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { href: "/citizen", label: "Citizen Portal", icon: Search },
    { href: "/map", label: "GIS Map", icon: Layers },
    { href: "/officer", label: "Officer Hub", icon: Compass },
    { href: "/officer/conflicts", label: "Conflicts", icon: ShieldAlert },
    { href: "/officer/mutations", label: "Mutations", icon: FileCheck2 },
  ];

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    citizen: { label: "Citizen", badgeClass: "bg-ink/10 text-ink" },
    revenue_officer: { label: "Revenue Officer", badgeClass: "bg-ochre/25 text-ochre-dark font-bold" },
    registrar: { label: "Sub-Registrar", badgeClass: "bg-land/25 text-land font-bold" },
    admin: { label: "Administrator", badgeClass: "bg-brick/25 text-brick font-bold" },
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.citizen;

  return (
    <header className="sticky top-0 z-40 plot-border-solid border-t-0 border-l-0 border-r-0 bg-parchment/95 backdrop-blur shadow-sm">
      {/* Top Global Status Bar */}
      <div className="bg-ink text-parchment/80 text-[11px] px-4 sm:px-6 py-1 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-ochre animate-pulse" />
            <span className="font-semibold text-parchment">Bhu-Setu Prototype</span>
          </span>
          <span className="hidden sm:inline text-parchment/30">|</span>
          <span className="flex items-center gap-1.5">
            {isBackendLive === true ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-semibold">PostGIS Connected</span>
              </>
            ) : isBackendLive === false ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300">Demo Mode</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                <span className="text-parchment/60">Checking API…</span>
              </>
            )}
          </span>
          <span className="hidden md:inline text-parchment/30">|</span>
          <span className="hidden md:inline text-ochre-light">SIH 2026</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline bg-ochre-dark/30 px-2 py-0.5 rounded text-[10px] text-ochre-light border border-ochre/30 font-semibold">
            Prototype / Demo Dataset
          </span>
          <span className="hidden lg:inline text-parchment/50">EPSG:4326 · SRID 4326</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-parchment font-serif text-lg font-bold shadow-sm transition-transform group-hover:scale-105">
            भू
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-ink">
                BHU-SETU
              </span>
              <span className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink/70">
                PROTOTYPE
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium tracking-wide text-ink/65 hidden sm:block">
              Connecting Land Data · Empowering Land Governance
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" &&
                pathname.startsWith(item.href) &&
                (item.href !== "/officer" || pathname === "/officer"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-ink text-parchment shadow-sm"
                    : "text-ink/75 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Context & Auth Controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-2 py-1 rounded border border-ink/20 text-xs hover:border-ink/40 transition-colors bg-parchment"
            title="Switch Demo Role"
          >
            <UserCheck className="w-3.5 h-3.5 text-ink/60" />
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${currentRoleInfo.badgeClass}`}>
              {currentRoleInfo.label}
            </span>
          </Link>

          {isAuthenticated ? (
            <button
              onClick={logout}
              className="p-1.5 text-ink/60 hover:text-brick hover:bg-brick/10 rounded transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 bg-ink text-parchment px-2.5 py-1.5 rounded text-xs font-semibold hover:bg-ink-light transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
