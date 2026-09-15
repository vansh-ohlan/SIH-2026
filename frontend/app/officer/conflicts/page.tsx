"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficerSidebar from "@/components/OfficerSidebar";
import ConflictBadge from "@/components/ConflictBadge";
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  HelpCircle,
  FileCheck2,
  Building,
} from "lucide-react";

export default function OfficerConflictsPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const conflictsList = [
    {
      ulpid: "PB-LDH-0042",
      owner: "Ramesh Kumar",
      type: "area_mismatch",
      description: "RoR area (1,250 sqm) does not match surveyed area (1,180 sqm)",
      severity: "medium" as const,
      rorArea: 1250,
      surveyedArea: 1180,
      difference: 70,
      status: "Requires Officer Verification",
      landUse: "Residential",
      district: "Ludhiana, Punjab",
    },
  ];

  const filtered = conflictsList.filter((c) => {
    if (filterSeverity === "all") return true;
    return c.severity === filterSeverity;
  });

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
                <span>GOVERNANCE WORKFLOW</span>
                <span>·</span>
                <span>INCONSISTENCY RECONCILIATION</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Conflict &amp; Discrepancy Matrix
              </h1>
              <p className="text-xs text-ink/70 mt-1">
                Automated rule-based checks surface potential differences between Record of Rights and GIS survey data.
              </p>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2 bg-parchment p-1.5 rounded-lg border border-ink/15 text-xs">
              <Filter className="w-3.5 h-3.5 text-ink/60" />
              <button
                onClick={() => setFilterSeverity("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterSeverity === "all"
                    ? "bg-ink text-parchment font-semibold"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                All ({conflictsList.length})
              </button>
              <button
                onClick={() => setFilterSeverity("medium")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterSeverity === "medium"
                    ? "bg-ochre text-ink font-bold"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                Medium ({conflictsList.filter((c) => c.severity === "medium").length})
              </button>
            </div>
          </div>

          {/* Conflict Cards */}
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={item.ulpid}
                className="bg-amber-50 p-6 rounded-xl border-2 border-amber-300 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-base text-ink">
                        {item.ulpid}
                      </span>
                      <span className="text-xs font-bold text-ink/80">
                        {item.owner} · {item.district}
                      </span>
                      <span className="bg-amber-200 text-amber-900 border border-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Severity: Medium
                      </span>
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                        Status: {item.status}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-amber-950 mt-2">
                      POTENTIAL AREA MISMATCH: {item.description}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      href={`/citizen/parcel/${item.ulpid}`}
                      className="bg-parchment border border-ink/20 px-3 py-2 rounded text-xs font-semibold text-ink hover:bg-ink hover:text-parchment transition-all"
                    >
                      View Record
                    </Link>
                    <Link
                      href={`/officer/mutations?ulpid=${item.ulpid}`}
                      className="bg-ink text-parchment px-4 py-2 rounded text-xs font-bold hover:bg-ink-light transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Adjudicate Mutation</span>
                    </Link>
                  </div>
                </div>

                {/* Quantitative Comparison Matrix */}
                <div className="mt-5 pt-4 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-parchment p-3.5 rounded-lg border border-ink/10">
                    <div className="text-[11px] text-ink/50 uppercase font-mono">
                      RoR Land Record Area
                    </div>
                    <div className="font-serif text-xl font-bold text-ink mt-0.5">
                      {item.rorArea.toLocaleString()} sqm
                    </div>
                    <div className="text-[10px] text-ink/50 mt-0.5">
                      Deed Registration Record (Jamabandi)
                    </div>
                  </div>

                  <div className="bg-parchment p-3.5 rounded-lg border border-ink/10">
                    <div className="text-[11px] text-ink/50 uppercase font-mono">
                      Surveyed Cadastral Extent
                    </div>
                    <div className="font-serif text-xl font-bold text-ink mt-0.5">
                      {item.surveyedArea.toLocaleString()} sqm
                    </div>
                    <div className="text-[10px] text-ink/50 mt-0.5">
                      PostGIS Ground Polygon (EPSG:4326)
                    </div>
                  </div>

                  <div className="bg-amber-100 p-3.5 rounded-lg border border-amber-300 text-amber-950">
                    <div className="text-[11px] font-mono uppercase font-bold text-amber-800">
                      Difference
                    </div>
                    <div className="font-serif text-xl font-bold mt-0.5">
                      {item.difference} sqm
                    </div>
                    <div className="text-[10px] text-amber-900/80 mt-0.5">
                      Requires Officer Verification
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-xs text-amber-900/80 font-sans">
                  <em>Automated checks provide decision support; authorized officials make final decisions.</em>
                </div>
              </div>
            ))}
          </div>

          {/* Legal Guidance Card */}
          <div className="bg-ink/5 border border-ink/10 rounded-xl p-5 text-xs text-ink/75 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-ochre-dark shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-ink">
                Understanding Automated Inconsistency Flagging
              </div>
              <p className="leading-relaxed">
                Automated checks provide decision support; authorized officials make final decisions. Discrepancy flags represent technical reconciliation variances between legacy departmental databases for ground survey verification.
              </p>
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
