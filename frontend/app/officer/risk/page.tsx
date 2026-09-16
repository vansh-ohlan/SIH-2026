"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficerSidebar from "@/components/OfficerSidebar";
import { getAllParcelRiskAnalyses, getParcelRiskAnalysis } from "@/lib/risk/mockRiskData";
import { RiskAnalysis, RiskLevel } from "@/lib/risk/riskTypes";
import RiskAnalysisModal from "@/components/risk/RiskAnalysisModal";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Filter,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Search,
  Building,
  Lock,
  Scale,
  FileCheck,
} from "lucide-react";

export default function OfficerRiskWorkbenchPage() {
  const allAnalyses = getAllParcelRiskAnalyses();
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<RiskAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Statistics
  const highRiskCount = allAnalyses.filter((a) => a.level === "HIGH").length;
  const moderateRiskCount = allAnalyses.filter((a) => a.level === "MODERATE").length;
  const lowRiskCount = allAnalyses.filter((a) => a.level === "LOW").length;
  const mortgagesCount = allAnalyses.filter((a) =>
    a.factors.some((f) => f.category === "mortgage" && f.pointsContribution > 0)
  ).length;
  const disputesCount = allAnalyses.filter((a) =>
    a.factors.some((f) => f.category === "dispute" && f.pointsContribution > 0)
  ).length;

  const filtered = allAnalyses.filter((item) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.ulpid.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category / level filter
    if (filterLevel === "all") return true;
    if (filterLevel === "HIGH") return item.level === "HIGH";
    if (filterLevel === "MODERATE") return item.level === "MODERATE";
    if (filterLevel === "LOW") return item.level === "LOW";
    if (filterLevel === "mortgage")
      return item.factors.some((f) => f.category === "mortgage" && f.pointsContribution > 0);
    if (filterLevel === "dispute")
      return item.factors.some((f) => f.category === "dispute" && f.pointsContribution > 0);
    if (filterLevel === "zoning")
      return item.factors.some((f) => f.category === "zoning" && f.pointsContribution > 0);

    return true;
  });

  const handleOpenModal = (analysis: RiskAnalysis) => {
    setSelectedAnalysis(analysis);
    setIsModalOpen(true);
  };

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
                <span>AI LAND RISK &amp; DUE DILIGENCE</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Land Due-Diligence &amp; Risk Workbench
              </h1>
              <p className="text-xs text-ink/70 mt-1 max-w-2xl">
                Deterministic decision-support intelligence evaluating multi-departmental encumbrances, court litigation, statutory zoning constraints, and spatial boundary variances.
              </p>
            </div>

            <div className="bg-ochre/15 border border-ochre/30 p-3 rounded-lg text-xs text-ink/80 flex items-center gap-2 self-start sm:self-auto">
              <Sparkles className="w-4 h-4 text-ochre-dark shrink-0" />
              <div>
                <span className="font-bold text-ochre-dark font-mono uppercase text-[10px]">
                  Scoring Engine: Deterministic v2.6
                </span>
                <div className="text-[11px] text-ink/70">13 Categories Evaluated</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-red-800">
                High Risk Parcels
              </span>
              <div className="font-serif text-2xl font-bold text-red-950 mt-1">
                {highRiskCount}
              </div>
              <div className="text-[10px] text-red-800/80">Score: 70–100</div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-800">
                Moderate Risk
              </span>
              <div className="font-serif text-2xl font-bold text-amber-950 mt-1">
                {moderateRiskCount}
              </div>
              <div className="text-[10px] text-amber-800/80">Score: 30–69</div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">
                Low Risk / Clear
              </span>
              <div className="font-serif text-2xl font-bold text-emerald-950 mt-1">
                {lowRiskCount}
              </div>
              <div className="text-[10px] text-emerald-800/80">Score: 0–29</div>
            </div>

            <div className="p-3.5 bg-parchment rounded-xl plot-border">
              <span className="text-[10px] font-mono uppercase text-ink/50 font-bold">
                Active Mortgages
              </span>
              <div className="font-serif text-2xl font-bold text-ink mt-1">
                {mortgagesCount}
              </div>
              <div className="text-[10px] text-ink/60">Bank Charges Flagged</div>
            </div>

            <div className="p-3.5 bg-parchment rounded-xl plot-border">
              <span className="text-[10px] font-mono uppercase text-ink/50 font-bold">
                Court Disputes
              </span>
              <div className="font-serif text-2xl font-bold text-ink mt-1">
                {disputesCount}
              </div>
              <div className="text-[10px] text-ink/60">Civil / Revenue Litigation</div>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-parchment p-3.5 rounded-xl plot-border">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ULPID, Owner, District..."
                className="w-full bg-parchment-dark/30 border border-ink/20 rounded pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <Filter className="w-3.5 h-3.5 text-ink/50 mr-1" />
              {[
                { id: "all", label: `All (${allAnalyses.length})` },
                { id: "HIGH", label: `🔴 High (${highRiskCount})` },
                { id: "MODERATE", label: `🟠 Moderate (${moderateRiskCount})` },
                { id: "LOW", label: `🟢 Low (${lowRiskCount})` },
                { id: "mortgage", label: `🏦 Mortgages (${mortgagesCount})` },
                { id: "dispute", label: `⚖️ Disputes (${disputesCount})` },
              ].map((flt) => {
                const isActive = filterLevel === flt.id;
                return (
                  <button
                    key={flt.id}
                    onClick={() => setFilterLevel(flt.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      isActive
                        ? "bg-ink text-parchment font-bold shadow-xs"
                        : "bg-ink/5 text-ink/75 hover:bg-ink/10"
                    }`}
                  >
                    {flt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* High-Risk Parcels & Due-Diligence Table */}
          <div className="bg-parchment rounded-xl plot-border shadow-sm overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 border-b border-ink/15 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-ochre-dark" />
                  <span>Due-Diligence Cadastral Register ({filtered.length} Parcels)</span>
                </h2>
                <p className="text-xs text-ink/60 mt-0.5">
                  Click any parcel row or &quot;Inspect Dossier&quot; to view complete explainability breakdown.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/15 text-ink/50 font-mono text-[11px] uppercase bg-parchment-dark/20">
                    <th className="py-3 px-4">ULPID &amp; Titleholder</th>
                    <th className="py-3 px-3">District / State</th>
                    <th className="py-3 px-3">Land Use</th>
                    <th className="py-3 px-3">Due-Diligence Score</th>
                    <th className="py-3 px-4">Primary Risk Drivers</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {filtered.map((item) => {
                    const isHigh = item.level === "HIGH";
                    const isMod = item.level === "MODERATE";

                    return (
                      <tr
                        key={item.ulpid}
                        className={`hover:bg-ink/5 transition-colors ${
                          isHigh ? "bg-red-50/20" : isMod ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* ULPID & Owner */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-ink">
                            {item.ulpid}
                          </div>
                          <div className="text-ink/80 font-medium mt-0.5">
                            {item.ownerName}
                          </div>
                          <div className="text-[10px] text-ink/50">
                            {item.areaSqm.toLocaleString()} sqm
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3 text-ink/80">
                          <div>{item.district}</div>
                          <div className="text-[10px] text-ink/50">{item.state}</div>
                        </td>

                        {/* Land Use */}
                        <td className="py-3 px-3">
                          <span className="bg-ink/10 text-ink px-2 py-0.5 rounded font-mono text-[10px] font-semibold">
                            {item.landUse}
                          </span>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${
                                isHigh
                                  ? "bg-red-100 text-red-950 border-red-300"
                                  : isMod
                                  ? "bg-amber-100 text-amber-950 border-amber-300"
                                  : "bg-emerald-100 text-emerald-950 border-emerald-300"
                              }`}
                            >
                              {item.score} / 100
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                isHigh
                                  ? "text-red-700"
                                  : isMod
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {item.level}
                            </span>
                          </div>
                        </td>

                        {/* Primary Drivers */}
                        <td className="py-3 px-4">
                          {item.topDrivers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.topDrivers.slice(0, 2).map((d, i) => (
                                <span
                                  key={i}
                                  className="bg-ink/5 border border-ink/15 text-ink/80 px-2 py-0.5 rounded text-[10px] font-medium"
                                >
                                  {d.label} (+{d.points})
                                </span>
                              ))}
                              {item.topDrivers.length > 2 && (
                                <span className="text-[10px] text-ink/50 font-mono py-0.5">
                                  +{item.topDrivers.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">
                              ✓ Verified Clear
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="bg-ochre-dark text-parchment px-2.5 py-1 rounded text-[11px] font-bold hover:bg-ochre-dark/90 transition-all flex items-center gap-1 shadow-xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                            <Link
                              href={`/citizen/parcel/${item.ulpid}`}
                              className="bg-parchment border border-ink/20 px-2.5 py-1 rounded text-[11px] font-semibold text-ink hover:bg-ink hover:text-parchment transition-all flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Analysis Modal */}
      <RiskAnalysisModal
        analysis={selectedAnalysis}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
