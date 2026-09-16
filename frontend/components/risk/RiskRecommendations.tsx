"use client";

import { RiskRecommendation } from "@/lib/risk/riskTypes";
import { CheckSquare, ArrowRight, ShieldCheck, FileCheck, Building, HelpCircle } from "lucide-react";

interface RiskRecommendationsProps {
  recommendations: RiskRecommendation[];
}

export default function RiskRecommendations({
  recommendations,
}: RiskRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-xl shadow-sm text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <span>Standard Procedural Due Diligence Clear</span>
        </div>
        <p className="text-xs text-emerald-800/80 mt-1 max-w-lg mx-auto leading-relaxed">
          No critical verification holds required. Standard statutory execution of sale deed and routine mutation lodging can proceed with regular sub-registrar documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-ochre-dark" />
            <h3 className="font-serif text-base font-bold text-ink">
              Recommended Verification Steps
            </h3>
          </div>
          <p className="text-xs text-ink/65 mt-0.5">
            Actionable verification protocol dynamically generated for buyers, lenders, and revenue officers:
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-ink text-parchment px-2 py-0.5 rounded">
          {recommendations.length} Action{recommendations.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => {
          const priorityBadge =
            rec.priority === "high"
              ? "bg-red-100 text-red-900 border-red-300"
              : rec.priority === "medium"
              ? "bg-amber-100 text-amber-900 border-amber-300"
              : "bg-ink/10 text-ink border-ink/20";

          return (
            <div
              key={rec.id}
              className="p-3.5 bg-parchment-dark/30 rounded-lg border border-ink/15 hover:border-ink/30 transition-all space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-parchment font-mono text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-ink text-xs sm:text-sm">
                        {rec.title}
                      </h4>
                      <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${priorityBadge}`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-ink/80 mt-1 leading-relaxed">
                      {rec.actionText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-ink/10 text-[11px] text-ink/70 pl-7">
                <div>
                  <span className="text-[10px] font-mono text-ink/50 uppercase">Statutory Authority:</span>
                  <div className="font-medium text-ink mt-0.5">{rec.authorityToVerify}</div>
                </div>
                {rec.documentationRequired && (
                  <div>
                    <span className="text-[10px] font-mono text-ink/50 uppercase">Document Checklist:</span>
                    <div className="font-medium text-ink mt-0.5">{rec.documentationRequired}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
