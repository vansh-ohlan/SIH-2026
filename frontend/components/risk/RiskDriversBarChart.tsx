"use client";

import { RiskDriver } from "@/lib/risk/riskTypes";
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

interface RiskDriversBarChartProps {
  drivers: RiskDriver[];
  totalScore: number;
}

export default function RiskDriversBarChart({
  drivers,
  totalScore,
}: RiskDriversBarChartProps) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="p-4 bg-parchment rounded-xl plot-border text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>No Significant Risk Drivers Detected</span>
        </div>
        <p className="text-[11px] text-ink/60 mt-1">
          All evaluated categories (ownership, RoR, mortgage, disputes, zoning, environmental) are compliant with zero risk contribution.
        </p>
      </div>
    );
  }

  // Find max driver value for relative percentage bar calculation
  const maxPoints = Math.max(...drivers.map((d) => d.points), 1);

  return (
    <div className="bg-parchment p-5 rounded-xl plot-border-solid shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-ink/10 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-ochre-dark" />
          <h3 className="font-serif text-sm font-bold text-ink">
            What is driving this score?
          </h3>
        </div>
        <span className="text-[10px] font-mono text-ink/60 bg-ink/5 px-2 py-0.5 rounded">
          {drivers.length} Active Contributor{drivers.length > 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-xs text-ink/70 leading-relaxed">
        Points contributed to the overall 0–100 land risk score based on detected multi-departmental records:
      </p>

      {/* Visual Contribution Bars */}
      <div className="space-y-3 pt-1">
        {drivers.map((driver, idx) => {
          const widthPercent = Math.min(100, Math.max(12, (driver.points / 30) * 100));

          // Severity colors
          const colorClass =
            driver.severity === "critical" || driver.points >= 20
              ? "bg-red-600 text-red-50"
              : driver.severity === "high" || driver.points >= 15
              ? "bg-amber-600 text-amber-50"
              : "bg-ochre text-ink";

          const barBg =
            driver.severity === "critical" || driver.points >= 20
              ? "bg-red-500"
              : driver.severity === "high" || driver.points >= 15
              ? "bg-amber-500"
              : "bg-ochre";

          return (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-1.5 text-ink font-semibold">
                  <span className="text-ink/40 font-mono text-[10px]">0{idx + 1}.</span>
                  <span>{driver.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">
                    +{driver.points} pts
                  </span>
                  <span className="text-[10px] font-mono text-ink/40">
                    ({Math.round((driver.points / (totalScore || 1)) * 100)}% of risk)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full bg-ink/10 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barBg}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>

              <div className="text-[11px] text-ink/60 font-sans pl-4">
                {driver.summary}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-ink/10 text-[10px] text-ink/50 font-mono flex items-center justify-between">
        <span>Scoring formula: Base (0) + Sum(Active Risk Drivers)</span>
        <span>Total Risk: {totalScore} / 100</span>
      </div>
    </div>
  );
}
