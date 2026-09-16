"use client";

import React from "react";
import {
  FileText,
  Layers,
  Building,
  MapPin,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowDown,
  ShieldCheck,
} from "lucide-react";
import { Parcel, ParcelReconciliationReport } from "@/lib/types";

interface UnifiedParcelFlowProps {
  parcel: Parcel;
  reconReport?: ParcelReconciliationReport | null;
  mode?: "citizen" | "officer";
}

export default function UnifiedParcelFlow({
  parcel,
  reconReport,
  mode = "citizen",
}: UnifiedParcelFlowProps) {
  const rorArea =
    reconReport?.source_records?.state_ror?.declared_area_sqm ??
    parcel.ror_area_sqm ??
    parcel.area_sqm;
  const gisArea =
    reconReport?.source_records?.cadastral_gis?.polygon_area_sqm ??
    parcel.surveyed_area_sqm ??
    parcel.area_sqm;
  const hasAreaMismatch = Math.abs(rorArea - gisArea) > 0.01;

  const encumbrance =
    reconReport?.source_records?.registration_ngdrs?.encumbrance_status ??
    "clear";
  const hasEncumbranceIssue = encumbrance === "under_review" || encumbrance === "disputed";

  return (
    <div className="bg-parchment rounded-xl plot-border-solid p-4 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold bg-ochre/20 text-ochre-dark px-2 py-0.5 rounded">
              CORE VALUE OF BHU-SETU
            </span>
            <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
              Unified Parcel-Centric Architecture
            </h3>
          </div>
          <p className="text-xs text-ink/70 mt-0.5">
            Instead of searching separate departmental silos, Bhu-Setu unifies relevant records around the land parcel.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-ink/50">Status:</span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded flex items-center gap-1 font-mono uppercase ${
              parcel.record_status === "Verified" || (!reconReport?.has_conflicts && !hasAreaMismatch)
                ? "bg-land/20 text-land border border-land/30"
                : parcel.record_status === "Under Review"
                ? "bg-blue-100 text-blue-900 border border-blue-300"
                : "bg-amber-100 text-amber-900 border border-amber-300"
            }`}
          >
            {parcel.record_status === "Verified" || (!reconReport?.has_conflicts && !hasAreaMismatch) ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Core</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Verification Required</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Visual Architectural Hub */}
      <div className="relative pt-2 pb-1">
        {/* Source Pillar Boxes (Top Tier) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pillar 1: State RoR */}
          <div className="bg-parchment-dark/40 p-3.5 rounded-lg border border-ink/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-ochre-dark flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>State RoR / Bhulekh</span>
                </span>
                <span className="text-[9px] bg-ink/10 px-1.5 py-0.5 rounded font-mono">Adapter</span>
              </div>
              <div className="mt-2 text-xs text-ink/80 space-y-0.5 font-sans">
                <div>
                  <strong>Jamabandi Area:</strong> {rorArea.toLocaleString()} sqm
                </div>
                <div>
                  <strong>Titleholder:</strong> {reconReport?.source_records?.state_ror?.owner_name ?? parcel.owner.name}
                </div>
                <div>
                  <strong>Khasra:</strong> {reconReport?.source_records?.state_ror?.khasra_no ?? parcel.survey_no ?? "142/3"}
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] font-mono text-ink/60">
              <span>Source: State Revenue</span>
              <span className="text-land font-semibold">✓ Synchronized</span>
            </div>
          </div>

          {/* Pillar 2: Cadastral GIS */}
          <div className="bg-parchment-dark/40 p-3.5 rounded-lg border border-ink/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-ochre-dark flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Bhu-Naksha Cadastre</span>
                </span>
                <span className="text-[9px] bg-ink/10 px-1.5 py-0.5 rounded font-mono">Adapter</span>
              </div>
              <div className="mt-2 text-xs text-ink/80 space-y-0.5 font-sans">
                <div>
                  <strong>GIS Polygon Area:</strong> {gisArea.toLocaleString()} sqm
                </div>
                <div>
                  <strong>Coordinates:</strong> EPSG:4326 (PostGIS)
                </div>
                <div>
                  <strong>Perimeter:</strong> {reconReport?.source_records?.cadastral_gis?.perimeter_m ?? "142.5"} m
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] font-mono text-ink/60">
              <span>Spatial Boundary</span>
              <span className="text-land font-semibold">✓ Georeferenced</span>
            </div>
          </div>

          {/* Pillar 3: Registration */}
          <div className="bg-parchment-dark/40 p-3.5 rounded-lg border border-ink/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-ochre-dark flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>NGDRS Deed Registry</span>
                </span>
                <span className="text-[9px] bg-ink/10 px-1.5 py-0.5 rounded font-mono">Adapter</span>
              </div>
              <div className="mt-2 text-xs text-ink/80 space-y-0.5 font-sans">
                <div>
                  <strong>Deed Registered:</strong> {reconReport?.source_records?.registration_ngdrs?.deed_number ?? `DEED-${parcel.ulpid}`}
                </div>
                <div>
                  <strong>Registered Party:</strong> {reconReport?.source_records?.registration_ngdrs?.registered_party ?? parcel.owner.name}
                </div>
                <div>
                  <strong>Encumbrance:</strong>{" "}
                  <span className={`font-mono font-bold uppercase ${hasEncumbranceIssue ? "text-amber-800" : "text-land"}`}>
                    {encumbrance}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] font-mono text-ink/60">
              <span>Sub-Registrar</span>
              <span className="text-land font-semibold">✓ Linked</span>
            </div>
          </div>
        </div>

        {/* Central Convergence Connector */}
        <div className="flex items-center justify-center my-2 text-ink/30">
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-ochre-dark bg-parchment px-3 py-1 rounded-full border border-ink/15 shadow-xs">
            <GitCompare className="w-3.5 h-3.5 text-ochre-dark" />
            <span>Aggregated into Atomic Parcel Anchor ({parcel.ulpid})</span>
          </div>
        </div>

        {/* Central Atomic Parcel Anchor (Center Hub) */}
        <div className="bg-ink text-parchment p-4 rounded-xl shadow-md border border-ink space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-ochre tracking-wider">
                ULPIN: {parcel.ulpid}
              </span>
              <span className="text-[10px] bg-parchment/20 text-parchment px-2 py-0.5 rounded font-mono">
                {parcel.parcel_id ?? `PARCEL-${parcel.ulpid}`}
              </span>
            </div>
            <span className="text-xs font-medium text-parchment/80">
              {parcel.village ?? "Burj Littan"}, {parcel.district ?? "Ludhiana"}, {parcel.state ?? "Punjab"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-parchment/20 text-xs">
            <div>
              <span className="text-[10px] text-parchment/60 uppercase font-mono">Land Use</span>
              <div className="font-semibold text-parchment">{parcel.land_use}</div>
            </div>
            <div>
              <span className="text-[10px] text-parchment/60 uppercase font-mono">Recorded RoR</span>
              <div className="font-serif font-bold text-ochre">{rorArea.toLocaleString()} sqm</div>
            </div>
            <div>
              <span className="text-[10px] text-parchment/60 uppercase font-mono">GIS Cadastral</span>
              <div className="font-serif font-bold text-parchment">{gisArea.toLocaleString()} sqm</div>
            </div>
            <div>
              <span className="text-[10px] text-parchment/60 uppercase font-mono">Variance</span>
              <div className={`font-mono font-bold ${hasAreaMismatch ? "text-amber-300" : "text-land-light"}`}>
                {hasAreaMismatch ? `${Math.abs(rorArea - gisArea)} sqm (Mismatch)` : "0 sqm (Exact)"}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tier: Automated Decision Support Findings */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-parchment p-3 rounded-lg border border-ink/15 text-xs flex items-start gap-2.5">
            <GitCompare className="w-4 h-4 text-ochre-dark shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">Automated Cross-Reconciliation</div>
              <p className="text-[11px] text-ink/70 mt-0.5">
                Rules continuously check for area variances, title discrepancies, and unrecorded mutations.
              </p>
            </div>
          </div>

          <div className="bg-parchment p-3 rounded-lg border border-ink/15 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-land shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">Human Officer Adjudication</div>
              <p className="text-[11px] text-ink/70 mt-0.5">
                Automated flags provide decision support only; final legal determinations remain with the authorized officer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
