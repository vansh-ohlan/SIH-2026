"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficerSidebar from "@/components/OfficerSidebar";
import ConflictBadge from "@/components/ConflictBadge";
import { useAuth } from "@/lib/authContext";
import {
  ShieldAlert,
  FileCheck2,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  History,
  Lock,
  Target,
} from "lucide-react";

export default function OfficerDashboard() {
  const { user, role, hasRole } = useAuth();

  const isOfficer = hasRole(["revenue_officer", "registrar", "admin"]);

  const stats = [
    { label: "Total Georeferenced Parcels", value: "10", sub: "Ludhiana Cadastral Pilot", icon: Layers, color: "text-ink" },
    { label: "Flagged Inconsistencies", value: "1", sub: "PB-LDH-0042 (Medium)", icon: ShieldAlert, color: "text-amber-800" },
    { label: "Pending Mutation Reviews", value: "1", sub: "Requires Field Review", icon: FileCheck2, color: "text-ochre-dark" },
    { label: "Chained Audit Records", value: "8", sub: "SHA-256 Chained", icon: CheckCircle2, color: "text-land" },
  ];

  const recentMutations = [
    {
      ulpid: "PB-LDH-0042",
      type: "Sale & Title Verification",
      officer: "OFF-102 (Revenue Officer)",
      status: "needs_review",
      hash: "9f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f8",
      date: "2026-09-15 10:15",
    },
    {
      ulpid: "PB-LDH-0043",
      type: "Agricultural Succession",
      officer: "OFF-102 (Revenue Officer)",
      status: "approved",
      hash: "4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a",
      date: "2026-09-14 16:40",
    },
    {
      ulpid: "CH-SEC-1701",
      type: "Commercial Allotment",
      officer: "REG-201 (Sub-Registrar)",
      status: "approved",
      hash: "7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b",
      date: "2026-09-12 11:20",
    },
  ];

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <OfficerSidebar />

        <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
                <span>OFFICER DECISION SUPPORT SYSTEM</span>
                <span>·</span>
                <span>PUNJAB REVENUE CIRCLE</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Land Governance Officer Hub
              </h1>
              <p className="text-xs text-ink/70 mt-1">
                Spatial discrepancy reconciliation, automated inconsistency flags, and tamper-evident mutation adjudication.
              </p>
            </div>

            {!isOfficer && (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-700" />
                <div>
                  <strong>Viewing as Citizen (Read Only)</strong>
                  <div className="text-[11px] text-amber-800">
                    <Link href="/login" className="underline font-bold">
                      Switch to Revenue Officer
                    </Link> to test mutation actions.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-parchment p-4 sm:p-5 rounded-xl plot-border shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-ink/50 font-semibold">
                      {stat.label}
                    </span>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="mt-3">
                    <div className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-ink/60 mt-0.5 font-medium">
                      {stat.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Priority Inconsistency / Conflict Review Queue: PB-LDH-0042 Hero Case */}
          <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-ochre-dark" />
                  <span>Priority Conflict &amp; Discrepancy Queue</span>
                </h2>
                <p className="text-xs text-ink/60 mt-0.5">
                  Automated checks comparing Record of Rights against PostGIS cadastral survey geometries.
                </p>
              </div>
              <Link
                href="/officer/conflicts"
                className="text-xs font-bold text-ink hover:text-ochre-dark flex items-center gap-1"
              >
                <span>Full Conflict Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Featured Demo Case: PB-LDH-0042 */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base text-ink">
                      PB-LDH-0042
                    </span>
                    <span className="text-xs text-ink/80 font-bold">
                      Ramesh Kumar · Ludhiana, Punjab
                    </span>
                    <span className="bg-amber-200 text-amber-900 border border-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Medium Severity
                    </span>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                      Needs Review
                    </span>
                  </div>

                  <div className="text-xs font-bold text-amber-950 mt-2">
                    Potential Area Mismatch: RoR area (1,250 sqm) does not match surveyed area (1,180 sqm)
                  </div>

                  <div className="text-[11px] text-ink/70 mt-1 font-mono">
                    Difference: -70 sqm · Land Use: Residential · Status: Requires Officer Verification
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href="/citizen/parcel/PB-LDH-0042"
                    className="bg-parchment border border-ink/20 px-3 py-2 rounded text-xs font-semibold text-ink hover:bg-ink hover:text-parchment transition-all"
                  >
                    Inspect Record
                  </Link>
                  <Link
                    href="/officer/mutations?ulpid=PB-LDH-0042"
                    className="bg-ink text-parchment px-4 py-2 rounded text-xs font-bold hover:bg-ink-light transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Adjudicate Mutation</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Chained Mutation Audit Activity */}
          <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <History className="w-5 h-5 text-ochre-dark" />
                <span>Recent Mutation Decisions &amp; Receipts</span>
              </h2>
              <span className="text-[11px] font-mono text-ink/50">SHA-256 Hash Chain</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/15 text-ink/50 font-mono text-[11px] uppercase">
                    <th className="py-2 px-3">ULPID</th>
                    <th className="py-2 px-3">Transaction</th>
                    <th className="py-2 px-3">Adjudicator</th>
                    <th className="py-2 px-3">Decision</th>
                    <th className="py-2 px-3 font-mono">SHA-256 Audit Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {recentMutations.map((item, i) => (
                    <tr key={i} className="hover:bg-ink/5 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-ink">
                        {item.ulpid}
                      </td>
                      <td className="py-2.5 px-3 text-ink/80">
                        {item.type}
                      </td>
                      <td className="py-2.5 px-3 text-ink/70">
                        {item.officer}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === "approved"
                              ? "bg-land/20 text-land"
                              : item.status === "needs_review"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-brick/20 text-brick"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-ink/50 truncate max-w-[200px]" title={item.hash}>
                        {item.hash.substring(0, 16)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
