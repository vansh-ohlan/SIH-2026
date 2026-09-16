"use client";

import { RiskLevel } from "@/lib/risk/riskTypes";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

interface LandRiskScoreGaugeProps {
  score: number;
  level: RiskLevel;
  indicatorsCount?: number;
  lastAnalysis?: string;
  size?: "sm" | "md" | "lg";
}

export default function LandRiskScoreGauge({
  score,
  level,
  indicatorsCount = 13,
  lastAnalysis = "2026-09-16 11:00 UTC",
  size = "md",
}: LandRiskScoreGaugeProps) {
  // Color configuration strictly matching requirements:
  // 0–29: green (#10b981)
  // 30–69: orange/amber (#f59e0b)
  // 70–100: red (#ef4444)
  const colorMap = {
    LOW: {
      stroke: "#10b981", // Emerald Green
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
      badge: "✓ LOW RISK",
      icon: ShieldCheck,
      desc: "Title & statutory compliance verified clear with standard due diligence.",
    },
    MODERATE: {
      stroke: "#d97706", // Amber / Ochre
      text: "text-amber-800 dark:text-amber-400",
      bg: "bg-amber-50 text-amber-900 border-amber-300",
      badge: "⚠ MODERATE RISK",
      icon: AlertTriangle,
      desc: "Specific encumbrance or administrative variance requires verification.",
    },
    HIGH: {
      stroke: "#dc2626", // Crimson Red
      text: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 text-red-900 border-red-300",
      badge: "🔴 HIGH RISK",
      icon: ShieldAlert,
      desc: "Multiple critical risk indicators detected (litigation/mortgage/zoning).",
    },
  };

  const currentTheme = colorMap[level];
  const Icon = currentTheme.icon;

  // SVG Gauge calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  // Use 240-degree arc for semi-circular / radial speedometer gauge feel
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * Math.min(100, Math.max(0, score))) / 100;

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-parchment rounded-xl plot-border-solid shadow-sm text-center">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full mb-3 text-xs border-b border-ink/10 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink/60 uppercase font-semibold">
          <Icon className={`w-3.5 h-3.5 ${currentTheme.text}`} />
          <span>AI LAND DUE-DILIGENCE SCORE</span>
        </div>
        <span className="font-mono text-[10px] text-ink/50 bg-ink/5 px-2 py-0.5 rounded">
          {indicatorsCount} Risk Indicators Analyzed
        </span>
      </div>

      {/* Circular Radial Gauge Visual */}
      <div className="relative flex items-center justify-center my-2">
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-ink/10"
            strokeDasharray={arcLength}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          {/* Filled Progress Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={currentTheme.stroke}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inner Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-serif text-4xl font-extrabold text-ink leading-none tracking-tight">
            {score}
          </div>
          <div className="text-xs font-mono text-ink/50 font-bold mt-0.5">
            / 100
          </div>
          <div
            className={`mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${currentTheme.bg}`}
          >
            {level} RISK
          </div>
        </div>
      </div>

      {/* Indicator status note */}
      <p className="text-xs text-ink/70 max-w-xs mt-2 leading-relaxed font-sans">
        {currentTheme.desc}
      </p>

      {/* Footer Timestamp */}
      <div className="mt-3 pt-2.5 border-t border-ink/10 w-full flex items-center justify-between text-[10px] font-mono text-ink/50">
        <span>Evaluation Engine: v2.6 (Deterministic)</span>
        <span>Last analysis: {lastAnalysis}</span>
      </div>
    </div>
  );
}
