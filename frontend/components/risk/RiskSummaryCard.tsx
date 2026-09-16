"use client";

import { Sparkles, Info, ShieldCheck } from "lucide-react";

interface RiskSummaryCardProps {
  summaryText: string;
  disclaimer: string;
}

export default function RiskSummaryCard({
  summaryText,
  disclaimer,
}: RiskSummaryCardProps) {
  return (
    <div className="space-y-3">
      {/* AI Assessment Summary Box */}
      <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ochre-dark" />
            <h3 className="font-serif text-base font-bold text-ink">
              AI Assessment Summary
            </h3>
          </div>
          <span className="text-[10px] font-mono text-ochre-dark bg-ochre/15 px-2 py-0.5 rounded font-bold uppercase">
            Deterministic Decision Support
          </span>
        </div>

        <p className="text-xs sm:text-sm text-ink/85 leading-relaxed font-sans font-medium">
          {summaryText}
        </p>
      </div>

      {/* Mandatory Statutory Decision Support Disclaimer */}
      <div className="p-3.5 bg-ink/5 border border-ink/15 rounded-lg text-xs text-ink/75 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-ink/50 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-ink">Decision Support Notice: </strong>
          <span>{disclaimer}</span>
        </div>
      </div>
    </div>
  );
}
