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
  User,
  UserPlus,
  Menu,
  X,
  ShieldCheck,
  Building,
  Server,
  Sparkles
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, isAuthenticated, logout } = useAuth();
  const [isBackendLive, setIsBackendLive] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkBackendConnection().then((live) => {
      if (isMounted) setIsBackendLive(live);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getNavLinks = () => {
    switch (role) {
      case "revenue_officer":
        return [
          { href: "/officer", label: "Officer Hub", icon: Compass },
          { href: "/officer/conflicts", label: "Conflicts Queue", icon: ShieldAlert },
          { href: "/officer/mutations", label: "Mutations", icon: FileCheck2 },
          { href: "/officer/risk", label: "Due-Diligence", icon: ShieldCheck },
          { href: "/map", label: "GIS Cadastre", icon: Layers },
          { href: "/assistant", label: "Land Assistant", icon: Sparkles },
        ];
      case "registrar":
        return [
          { href: "/registrar", label: "Registrar Portal", icon: Building },
          { href: "/officer/mutations", label: "Mutations", icon: FileCheck2 },
          { href: "/map", label: "GIS Cadastre", icon: Layers },
          { href: "/assistant", label: "Land Assistant", icon: Sparkles },
        ];
      case "admin":
        return [
          { href: "/admin", label: "Admin Console", icon: Server },
          { href: "/officer", label: "Officer Hub", icon: Compass },
          { href: "/officer/conflicts", label: "Conflicts", icon: ShieldAlert },
          { href: "/map", label: "GIS Cadastre", icon: Layers },
          { href: "/assistant", label: "Land Assistant", icon: Sparkles },
        ];
      case "citizen":
      default:
        return [
          { href: "/citizen", label: "Citizen Portal", icon: Search },
          { href: "/citizen/search", label: "Registry Lookup", icon: Compass },
          { href: "/map", label: "GIS Cadastre", icon: Layers },
          { href: "/assistant", label: "Land Assistant", icon: Sparkles },
        ];
    }
  };

  const navLinks = getNavLinks();

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    citizen: { label: "Citizen", badgeClass: "bg-ink/10 text-ink border border-ink/15" },
    revenue_officer: { label: "Revenue Officer", badgeClass: "bg-ochre/20 text-ochre-dark border border-ochre/30 font-bold" },
    registrar: { label: "Sub-Registrar", badgeClass: "bg-land/20 text-land border border-land/30 font-bold" },
    admin: { label: "Administrator", badgeClass: "bg-brick/20 text-brick border border-brick/30 font-bold" },
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.citizen;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-parchment/95 backdrop-blur-md shadow-xs">
      {/* Top Global DPI Information Strip */}
      <div className="bg-ink text-parchment/80 text-[11px] px-4 sm:px-6 py-1.5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-ochre animate-pulse" />
            <span className="font-semibold text-parchment tracking-wide">BHU-SETU</span>
          </span>
          <span className="text-parchment/30 shrink-0">|</span>
          <span className="truncate text-parchment/90 hidden sm:inline text-[11px]">
            Unified Land Information • Spatial Verification • Transparent Governance
          </span>
          <span className="truncate text-parchment/90 sm:hidden text-[10px]">
            Land Governance Platform
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-[10px]">
            {isBackendLive === true ? (
              <span className="flex items-center gap-1 text-emerald-300 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden md:inline">PostGIS Live</span>
              </span>
            ) : isBackendLive === false ? (
              <span className="flex items-center gap-1 text-amber-300">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="hidden md:inline">Cadastre Store</span>
              </span>
            ) : (
              <span className="text-parchment/60 text-[10px]">Connecting…</span>
            )}
          </span>
          <span className="text-parchment/30 hidden md:inline">|</span>
          <span className="bg-ochre-dark/40 px-2 py-0.5 rounded text-[10px] text-ochre-light border border-ochre/30 font-medium">
            Demo Environment · Synthetic Data
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-parchment font-serif text-lg font-bold shadow-xs transition-transform group-hover:scale-102">
            भू
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-ink">
                BHU-SETU
              </span>
              <span className="hidden lg:inline-block text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-ink/10 text-ink/80 font-semibold">
                Land Stack DPI
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium tracking-normal text-ink/70">
              Land Information &amp; Governance Platform
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
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
                    ? "bg-ink text-parchment shadow-xs"
                    : "text-ink/75 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Context, Auth Controls & Mobile Menu Button */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-ink/20 text-xs bg-parchment">
                <User className="w-3.5 h-3.5 text-ink/60" />
                <span className="font-semibold text-ink max-w-[120px] truncate">
                  {user.name || user.username || user.userId}
                </span>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${currentRoleInfo.badgeClass}`}>
                  {currentRoleInfo.label}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-ink/60 hover:text-brick hover:bg-brick/10 rounded-md transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-ink/25 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 bg-ink text-parchment px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-ink-light transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Register</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md lg:hidden text-ink/75 hover:bg-ink/5 hover:text-ink transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-ink/10 bg-parchment-dark/95 px-4 py-3 space-y-1 font-sans">
          <div className="text-[10px] font-mono uppercase text-ink/50 font-semibold px-2 py-1">
            Portal Navigation
          </div>
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
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "bg-ink text-parchment"
                    : "text-ink/80 hover:bg-ink/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[11px] font-mono text-ink/60 px-2">
            <span>SRID 4326 · PostGIS</span>
            <span>SIH 2026 Prototype</span>
          </div>
        </div>
      )}
    </header>
  );
}
