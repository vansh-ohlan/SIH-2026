"use client";

import Link from "next/link";
import { RiskAnalysis, RiskLevel } from "@/lib/risk/riskTypes";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  MapPin,
  Building,
  Sparkles,
} from "lucide-react";

interface ParcelIntelligenceCardProps {
  analysis: RiskAnalysis;
  onOpenDetailedAnalysis?: () => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export default function ParcelIntelligenceCard({
  analysis,
  onOpenDetailedAnalysis,
  onClose,
  isDrawer = false,
}: ParcelIntelligenceCardProps) {
  const levelTheme = {
    LOW: {
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      icon: ShieldCheck,
      text: "text-emerald-700",
      label: "LOW RISK",
    },
    MODERATE: {
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      icon: AlertTriangle,
      text: "text-amber-700",
      label: "MODERATE RISK",
    },
    HIGH: {
      badge: "bg-red-100 text-red-900 border-red-300",
      icon: ShieldAlert,
      text: "text-red-700",
      label: "HIGH RISK",
    },
  }[analysis.level];

  const Icon = levelTheme.icon;

  return (
    <div className="w-full sm:w-80 rounded-sm bg-parchment/95 p-4 plot-border-solid shadow-lg backdrop-blur space-y-3 font-sans">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-ink/15 pb-2">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-ochre-dark uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-ochre-dark" />
            <span>PARCEL INTELLIGENCE</span>
          </div>
          <div className="font-mono text-sm font-bold text-ink mt-0.5">
            {analysis.ulpid}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xs p-1"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Parcel Basic Facts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] font-mono text-ink/50 uppercase">Owner</span>
          <div className="font-bold text-ink truncate mt-0.5">
            {analysis.ownerName}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-ink/50 uppercase">Total Area</span>
          <div className="font-serif font-bold text-ink mt-0.5">
            {analysis.areaSqm.toLocaleString()} sqm
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-ink/50 uppercase">Land Use</span>
          <div className="font-medium text-ink mt-0.5">
            {analysis.landUse}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-ink/50 uppercase">District</span>
          <div className="font-medium text-ink mt-0.5">
            {analysis.district}
          </div>
        </div>
      </div>

      {/* Due-Diligence Risk Score Ribbon */}
      <div className={`p-2.5 rounded border ${levelTheme.badge} space-y-1`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Icon className="w-4 h-4" />
            <span>Land Risk Assessment</span>
          </div>
          <div className="font-mono font-bold text-sm">
            {analysis.score} / 100
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-wide">
            {levelTheme.label}
          </span>
          <span className="text-[10px] font-mono opacity-80">
            {analysis.activeRiskFlagsCount} active flag{analysis.activeRiskFlagsCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Top Issue Summary if elevated */}
      {analysis.topDrivers.length > 0 && (
        <div className="text-[11px] text-ink/75 bg-ink/5 p-2 rounded border border-ink/10 leading-tight">
          <span className="font-semibold text-ink">Key Driver: </span>
          <span>{analysis.topDrivers[0].label} (+{analysis.topDrivers[0].points} pts)</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-1.5 pt-1">
        {onOpenDetailedAnalysis ? (
          <button
            onClick={onOpenDetailedAnalysis}
            className="w-full bg-ochre-dark text-parchment py-2 rounded text-xs font-bold text-center hover:bg-ochre-dark/90 transition-all flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>[ ANALYZE LAND RISK ]</span>
          </button>
        ) : null}

        <Link
          href={`/citizen/parcel/${analysis.ulpid}`}
          className="w-full bg-ink text-parchment py-1.5 rounded text-xs font-semibold text-center hover:bg-ink-light transition-all flex items-center justify-center gap-1"
        >
          <span>Open Full Parcel Record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
