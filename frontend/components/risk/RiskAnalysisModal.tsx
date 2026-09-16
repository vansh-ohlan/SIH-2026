"use client";

import { RiskAnalysis } from "@/lib/risk/riskTypes";
import LandRiskScoreGauge from "./LandRiskScoreGauge";
import RiskDriversBarChart from "./RiskDriversBarChart";
import RiskFactorBreakdown from "./RiskFactorBreakdown";
import RiskRecommendations from "./RiskRecommendations";
import RiskHistoryTimeline from "./RiskHistoryTimeline";
import RiskSummaryCard from "./RiskSummaryCard";
import { X, Sparkles, Printer, ExternalLink } from "lucide-react";
import Link from "next/link";

interface RiskAnalysisModalProps {
  analysis: RiskAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RiskAnalysisModal({
  analysis,
  isOpen,
  onClose,
}: RiskAnalysisModalProps) {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-parchment rounded-xl plot-border-solid shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-ink/15 bg-parchment-dark/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-ochre/20 text-ochre-dark rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ochre-dark">
                  AI LAND RISK &amp; DUE-DILIGENCE ENGINE
                </span>
                <span className="bg-ochre/20 text-ochre-dark text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                  Decision Support
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">
                Risk Dossier: {analysis.ulpid} ({analysis.ownerName})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/citizen/parcel/${analysis.ulpid}`}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-ink bg-parchment px-3 py-1.5 rounded border border-ink/20 hover:bg-ink hover:text-parchment transition-all"
            >
              <span>Full Parcel Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-ink/5 hover:bg-ink/10 text-ink/70 hover:text-ink transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Row: Gauge + Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5">
              <LandRiskScoreGauge
                score={analysis.score}
                level={analysis.level}
                indicatorsCount={analysis.totalIndicatorsEvaluated}
                lastAnalysis={analysis.analysisTimestamp}
              />
            </div>
            <div className="md:col-span-7 flex flex-col justify-between">
              <RiskSummaryCard
                summaryText={analysis.summaryText}
                disclaimer={analysis.disclaimer}
              />
            </div>
          </div>

          {/* What is driving the risk chart */}
          <RiskDriversBarChart
            drivers={analysis.topDrivers}
            totalScore={analysis.score}
          />

          {/* Actionable Recommendations */}
          <RiskRecommendations recommendations={analysis.recommendations} />

          {/* 13-Category Factor Breakdown */}
          <RiskFactorBreakdown factors={analysis.factors} />

          {/* Historical Multi-Year Timeline */}
          <RiskHistoryTimeline history={analysis.history} />
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-ink/15 bg-parchment-dark/30 flex items-center justify-between text-xs text-ink/60 shrink-0">
          <span className="font-mono text-[10px]">
            Bhu-Setu · Integrated GIS DPI for Land Governance (SIH 2026)
          </span>
          <button
            onClick={onClose}
            className="bg-ink text-parchment px-4 py-1.5 rounded text-xs font-semibold hover:bg-ink-light"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
