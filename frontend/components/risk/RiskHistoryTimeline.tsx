"use client";

import { RiskHistory } from "@/lib/risk/riskTypes";
import { History, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface RiskHistoryTimelineProps {
  history: RiskHistory;
}

export default function RiskHistoryTimeline({ history }: RiskHistoryTimelineProps) {
  const isUp = history.delta > 0;
  const isDown = history.delta < 0;

  return (
    <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-ink/10 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-ochre-dark" />
          <h3 className="font-serif text-base font-bold text-ink">
            Risk Monitoring &amp; Temporal History
          </h3>
        </div>
        <span className="text-[10px] font-mono text-ink/60 bg-ink/5 px-2 py-0.5 rounded">
          Multi-Year Cadastral Tracking
        </span>
      </div>

      {/* Delta Metrics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-parchment-dark/30 rounded-lg border border-ink/10">
          <span className="text-[10px] font-mono uppercase text-ink/50">Previous Score</span>
          <div className="font-serif text-xl font-bold text-ink mt-0.5">
            {history.previousScore} / 100
          </div>
          <div className="text-[10px] text-ink/50">Baseline audit</div>
        </div>

        <div className="p-3 bg-parchment-dark/30 rounded-lg border border-ink/10">
          <span className="text-[10px] font-mono uppercase text-ink/50">Current Score</span>
          <div className="font-serif text-xl font-bold text-ink mt-0.5">
            {history.currentScore} / 100
          </div>
          <div className="text-[10px] text-ink/50">Active assessment</div>
        </div>

        <div
          className={`p-3 rounded-lg border flex flex-col justify-between ${
            isUp
              ? "bg-amber-100 border-amber-300 text-amber-950"
              : isDown
              ? "bg-emerald-100 border-emerald-300 text-emerald-950"
              : "bg-parchment-dark/30 border-ink/10 text-ink"
          }`}
        >
          <span className="text-[10px] font-mono uppercase font-bold">Score Shift (Delta)</span>
          <div className="flex items-center gap-1 font-serif text-xl font-bold mt-0.5">
            {isUp ? (
              <TrendingUp className="w-5 h-5 text-amber-800" />
            ) : isDown ? (
              <TrendingDown className="w-5 h-5 text-emerald-800" />
            ) : (
              <Minus className="w-5 h-5 text-ink/50" />
            )}
            <span>
              {isUp ? `+${history.delta}` : history.delta} pts
            </span>
          </div>
          <div className="text-[10px] opacity-80">Variance from prior cycle</div>
        </div>
      </div>

      {/* Reason Note */}
      <div className="p-3 bg-ink/5 rounded-lg border border-ink/10 text-xs text-ink/80 leading-relaxed font-sans">
        <strong className="text-ink">Primary Shift Driver: </strong>
        {history.deltaReason}
      </div>

      {/* Multi-Year Timeline Progression */}
      <div className="pt-2">
        <div className="text-[11px] font-mono text-ink/60 uppercase font-bold mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-ochre-dark" />
          <span>Cadastral Risk Timeline (2024–2026)</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {history.timeline.map((point) => {
            const badgeClass =
              point.level === "HIGH"
                ? "bg-red-100 text-red-900 border-red-300"
                : point.level === "MODERATE"
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-emerald-100 text-emerald-900 border-emerald-300";

            return (
              <div
                key={point.year}
                className="p-3 bg-parchment rounded-lg border border-ink/15 shadow-2xs space-y-1 text-center"
              >
                <div className="font-mono text-xs font-bold text-ink/60">
                  {point.year}
                </div>
                <div className="font-serif text-xl font-bold text-ink">
                  {point.score}
                </div>
                <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${badgeClass}`}>
                  {point.level}
                </span>
                <p className="text-[10px] text-ink/65 leading-tight pt-1">
                  {point.primaryEvent}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
