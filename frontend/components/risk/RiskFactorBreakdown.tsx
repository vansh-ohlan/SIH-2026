"use client";

import { useState } from "react";
import { RiskFactor } from "@/lib/risk/riskTypes";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Building,
  FileText,
  Layers,
  Database,
  Calendar,
  Satellite,
  Lock,
} from "lucide-react";

interface RiskFactorBreakdownProps {
  factors: RiskFactor[];
}

export default function RiskFactorBreakdown({ factors }: RiskFactorBreakdownProps) {
  const [expandedAll, setExpandedAll] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    ownership: true,
    mortgage: true,
    dispute: true,
    zoning: true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleExpandCollapseAll = () => {
    const nextState = !expandedAll;
    setExpandedAll(nextState);
    const newExpanded: Record<string, boolean> = {};
    factors.forEach((f) => {
      newExpanded[f.category] = nextState;
    });
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "ownership":
      case "ror":
        return Building;
      case "registration":
        return FileText;
      case "mortgage":
        return Lock;
      case "dispute":
        return ShieldAlert;
      case "zoning":
      case "master_plan":
        return Layers;
      case "building_permission":
        return Building;
      case "property_tax":
        return Calendar;
      case "environmental":
      case "infrastructure":
        return Layers;
      case "satellite_change":
        return Satellite;
      default:
        return Info;
    }
  };

  return (
    <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-ochre-dark" />
            <h3 className="font-serif text-base font-bold text-ink">
              Multi-Departmental Risk Factor Breakdown
            </h3>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            13 statutory &amp; spatial due-diligence categories analyzed for title risk and statutory encumbrances.
          </p>
        </div>

        <button
          onClick={handleExpandCollapseAll}
          className="self-start sm:self-auto text-xs font-mono text-ochre-dark hover:underline font-semibold bg-ochre/10 px-2.5 py-1 rounded"
        >
          {expandedAll ? "Collapse All Factors" : "Expand All Factors"}
        </button>
      </div>

      {/* Factors List */}
      <div className="space-y-3">
        {factors.map((factor) => {
          const isExpanded = !!expandedCategories[factor.category] || expandedAll;
          const CategoryIcon = getCategoryIcon(factor.category);
          const hasRisk = factor.pointsContribution > 0;

          return (
            <div
              key={factor.category}
              className={`rounded-lg border transition-all ${
                hasRisk
                  ? factor.severity === "critical"
                    ? "bg-red-50/70 border-red-300"
                    : "bg-amber-50/70 border-amber-300"
                  : "bg-parchment border-ink/15"
              }`}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleCategory(factor.category)}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-medium hover:bg-ink/5 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      hasRisk
                        ? factor.severity === "critical"
                          ? "bg-red-200 text-red-900"
                          : "bg-amber-200 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    <CategoryIcon className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-ink text-xs sm:text-sm">
                        {factor.categoryLabel}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          hasRisk
                            ? factor.severity === "critical"
                              ? "bg-red-200 text-red-950 border border-red-400"
                              : "bg-amber-200 text-amber-950 border border-amber-400"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {hasRisk ? `+${factor.pointsContribution} Risk` : "✓ Low Risk (0)"}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink/75 mt-0.5 font-medium">
                      {factor.status}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${
                      factor.confidence === "high"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : factor.confidence === "medium"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-ink/5 text-ink/70 border-ink/10"
                    }`}
                  >
                    {factor.confidenceText}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-ink/50" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink/50" />
                  )}
                </div>
              </button>

              {/* Accordion Expandable Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 text-xs border-t border-ink/10 space-y-3 font-sans">
                  <div>
                    <div className="text-[10px] font-mono text-ink/50 uppercase font-semibold">
                      Explanation &amp; Findings:
                    </div>
                    <p className="text-xs text-ink/85 mt-0.5 leading-relaxed">
                      {factor.explanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ink/10 text-[11px]">
                    <div>
                      <span className="text-[10px] font-mono text-ink/50 uppercase">Data Source:</span>
                      <div className="font-medium text-ink mt-0.5 flex items-center gap-1">
                        <Database className="w-3 h-3 text-ochre-dark" />
                        <span>{factor.dataSource}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-ink/50 uppercase">Data Quality / Confidence:</span>
                      <div className="font-medium text-ink mt-0.5">
                        {factor.confidenceText}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
