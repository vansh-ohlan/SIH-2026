"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  LayoutDashboard,
  ShieldAlert,
  FileCheck2,
  Layers,
  Search,
  UserCheck,
  Building2,
  Lock,
} from "lucide-react";

export default function OfficerSidebar() {
  const pathname = usePathname();
  const { user, role, hasRole } = useAuth();

  const isOfficer = hasRole(["revenue_officer", "registrar", "admin"]);

  const menuItems = [
    { href: "/officer", label: "Overview Dashboard", icon: LayoutDashboard },
    { href: "/officer/conflicts", label: "Inconsistency & Conflicts", icon: ShieldAlert, count: 1 },
    { href: "/officer/mutations", label: "Mutation Adjudication", icon: FileCheck2 },
    { href: "/map", label: "Cadastral GIS Explorer", icon: Layers },
    { href: "/citizen", label: "Citizen Public View", icon: Search },
  ];

  return (
    <aside className="w-64 shrink-0 plot-border-solid border-t-0 border-b-0 border-l-0 bg-parchment-dark/40 min-h-[calc(100vh-80px)] p-4 flex flex-col justify-between">
      <div>
        {/* Officer Profile Badge */}
        <div className="bg-parchment p-3 rounded-lg border border-ink/15 shadow-sm mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-ink text-parchment flex items-center justify-center font-bold text-xs">
              {role === "revenue_officer" ? "RO" : role === "registrar" ? "SR" : role === "admin" ? "AD" : "CZ"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-ink truncate">
                {user?.name || "Demo Officer"}
              </div>
              <div className="text-[10px] text-ink/60 font-mono">
                {user?.officerId || user?.userId || "OFF-102"}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-ink/10 flex items-center justify-between text-[11px]">
            <span className="text-ink/60">Active Role:</span>
            <span className="font-semibold text-ochre-dark uppercase text-[10px]">
              {role.replace("_", " ")}
            </span>
          </div>

          {!isOfficer && (
            <div className="mt-2 p-1.5 bg-brick/10 border border-brick/20 rounded text-[10px] text-brick flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Citizen role (Read-only access)</span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="text-[10px] font-mono uppercase tracking-wider text-ink/40 px-2 mb-2 font-semibold">
          Governance Workflows
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  active
                    ? "bg-ink text-parchment shadow-sm"
                    : "text-ink/75 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                      active ? "bg-ochre text-ink font-bold" : "bg-ochre/20 text-ochre-dark font-semibold"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-ink/10 text-[11px] text-ink/50 space-y-1">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>Ludhiana Revenue Circle</span>
        </div>
        <div className="font-mono text-[10px]">District Ludhiana, Punjab</div>
      </div>
    </aside>
  );
}
