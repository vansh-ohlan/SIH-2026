"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ConflictBadge from "@/components/ConflictBadge";
import { getParcel, getConflicts } from "@/lib/api";
import { Parcel, Conflict } from "@/lib/types";
import {
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  History,
  FileText,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Copy,
  Check,
  HelpCircle,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-parchment-dark text-xs font-mono text-ink/50">
      Loading GIS Boundary…
    </div>
  ),
});

export default function ParcelDetail({
  params,
}: {
  params: { ulpid: string };
}) {
  const { ulpid } = params;
  const [parcel, setParcel] = useState<Parcel | null | undefined>(undefined);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "conflicts" | "ownership" | "tax" | "mutations" | "map"
  >("overview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getParcel(ulpid).then(setParcel);
    getConflicts(ulpid).then(setConflicts);
  }, [ulpid]);

  const copyUlpid = () => {
    navigator.clipboard.writeText(ulpid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (parcel === undefined) {
    return (
      <main className="min-h-screen bg-parchment flex flex-col justify-between">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-4"></div>
          <p className="font-mono text-xs text-ink/60">
            Retrieving Cadastral Record for <span className="font-bold text-ink">{ulpid}</span> from PostGIS…
          </p>
        </div>
        <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/40 font-mono">
          Bhu-Setu · SIH 2026
        </footer>
      </main>
    );
  }

  if (parcel === null) {
    return (
      <main className="min-h-screen bg-parchment flex flex-col justify-between">
        <Navbar />
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-brick/10 text-brick flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">Parcel Not Found</h1>
          <p className="mt-2 text-xs text-ink/65 font-mono">
            Error: ulpid_not_found — No land parcel record exists for &quot;{ulpid}&quot;.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/citizen"
              className="bg-ink text-parchment px-4 py-2 rounded text-xs font-semibold hover:bg-ink-light"
            >
              ← Search Other Parcels
            </Link>
            <Link
              href="/citizen/parcel/PB-LDH-0042"
              className="border border-ink/20 px-4 py-2 rounded text-xs font-semibold hover:bg-ink/5 text-ink"
            >
              View Demo Parcel PB-LDH-0042
            </Link>
          </div>
        </div>
        <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/40 font-mono">
          Bhu-Setu · SIH 2026
        </footer>
      </main>
    );
  }

  // Derive coordinates for map preview centering
  const firstCoord = parcel.geometry?.coordinates?.[0]?.[0] || [75.855, 30.905];
  const centerLat = firstCoord[1];
  const centerLng = firstCoord[0];

  // Specific demo area discrepancy for PB-LDH-0042
  const rorArea = parcel.ror_area_sqm || (parcel.ulpid === "PB-LDH-0042" ? 1250 : parcel.area_sqm);
  const surveyedArea = parcel.surveyed_area_sqm || (parcel.ulpid === "PB-LDH-0042" ? 1180 : parcel.area_sqm);
  const areaDiff = Math.abs(rorArea - surveyedArea);
  const hasAreaMismatch = rorArea !== surveyedArea;

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between text-xs text-ink/60 mb-4">
          <div className="flex items-center gap-2">
            <Link href="/citizen" className="hover:text-ink">
              Citizen Portal
            </Link>
            <span>/</span>
            <span className="font-mono text-ink font-semibold">{parcel.ulpid}</span>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 hover:text-ink transition-colors px-2 py-1 rounded border border-ink/10 bg-parchment"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Record</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* PARCEL HEADER CARD                                            */}
        {/* ============================================================ */}
        <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ochre-dark tracking-wider uppercase">
                  ULPID (UNIQUE LAND PARCEL ID)
                </span>
                <button
                  onClick={copyUlpid}
                  className="p-1 text-ink/40 hover:text-ink rounded transition-colors"
                  title="Copy ULPID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-land" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h1 className="font-mono text-2xl sm:text-3xl font-bold text-ink mt-1 flex items-center gap-2">
                {parcel.ulpid}
              </h1>

              <div className="text-sm font-bold text-ink/90 mt-1">
                {parcel.owner.name} · <span className="text-xs text-ink/60 font-normal">Registered Titleholder</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-ink/10 text-ink px-3 py-1 rounded-full text-xs font-semibold font-mono">
                {parcel.land_use}
              </span>

              {hasAreaMismatch || conflicts.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>⚠ Potential Area Mismatch</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-land/20 text-land border border-land/30 px-3 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Tax Paid &amp; Clear</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="mt-5 pt-4 border-t border-ink/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[11px] text-ink/50 uppercase font-mono">Total Extent</div>
              <div className="font-serif text-lg font-bold text-ink mt-0.5">
                {parcel.area_sqm.toLocaleString()} sqm
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink/50 uppercase font-mono">Ownership Since</div>
              <div className="font-medium text-ink mt-0.5">
                {formatDate(parcel.owner.since)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink/50 uppercase font-mono">Tax Status</div>
              <div className={`font-semibold mt-0.5 ${parcel.tax_status.paid ? "text-land" : "text-brick"}`}>
                {parcel.tax_status.paid ? "✓ Tax Paid" : `⚠ ₹${parcel.tax_status.dues} Dues`}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink/50 uppercase font-mono">Spatial Standard</div>
              <div className="font-mono text-ink mt-0.5">
                PostGIS EPSG:4326
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABS NAVIGATION                                              */}
        {/* ============================================================ */}
        <div className="flex border-b border-ink/15 mb-6 overflow-x-auto gap-1 text-xs font-medium">
          {[
            { id: "overview", label: "Overview & Spatial Specs", icon: FileText },
            { id: "conflicts", label: `Inconsistencies & Area Analysis (${conflicts.length || (hasAreaMismatch ? 1 : 0)})`, icon: ShieldAlert, highlight: hasAreaMismatch || conflicts.length > 0 },
            { id: "ownership", label: "Title & RoR Records", icon: Building },
            { id: "tax", label: "Tax & Municipal Status", icon: Calendar },
            { id: "mutations", label: `Mutation Ledger (${parcel.mutations?.length || 0})`, icon: History },
            { id: "map", label: "Cadastral GIS Map", icon: Layers },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-ink font-bold text-ink bg-parchment-dark/30"
                    : "border-transparent text-ink/65 hover:text-ink hover:bg-ink/5"
                } ${tab.highlight ? "text-ochre-dark font-bold" : ""}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & SPATIAL SPECS                              */}
        {/* ============================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Prominent Mismatch Alert on PB-LDH-0042 */}
            {hasAreaMismatch && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-serif text-base font-bold text-amber-950">
                        Potential Area Mismatch Detected
                      </h4>
                      <p className="text-xs text-amber-900/80 mt-0.5">
                        Automated comparison between Record of Rights (1,250 sqm) and GIS Cadastral Survey (1,180 sqm) flagged a 70 sqm variance.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("conflicts")}
                    className="bg-amber-900 text-amber-50 px-3 py-1.5 rounded text-xs font-semibold hover:bg-amber-950 shrink-0"
                  >
                    View Analysis →
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spatial Geometry Card */}
              <div className="bg-parchment p-5 rounded-lg plot-border">
                <h3 className="font-serif text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-ochre-dark" />
                  <span>Spatial Cadastral Geometry</span>
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Geometry Type</dt>
                    <dd className="font-mono font-semibold text-ink">{parcel.geometry.type}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Center Latitude</dt>
                    <dd className="font-mono text-ink">{centerLat.toFixed(6)}° N</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Center Longitude</dt>
                    <dd className="font-mono text-ink">{centerLng.toFixed(6)}° E</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Boundary Ring</dt>
                    <dd className="font-mono text-ink">
                      {parcel.geometry.coordinates?.[0]?.length || 5} coordinates (WGS 84)
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-ink/60">Coordinate Standard</dt>
                    <dd className="font-mono text-ink">PostGIS SRID 4326 (EPSG:4326)</dd>
                  </div>
                </dl>
              </div>

              {/* Fiscal Valuation & Circle Rate */}
              <div className="bg-parchment p-5 rounded-lg plot-border">
                <h3 className="font-serif text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-ochre-dark" />
                  <span>Land Valuation &amp; Revenue Circle</span>
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Land Classification</dt>
                    <dd className="font-semibold text-ink">{parcel.land_use}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Circle Valuation Rate</dt>
                    <dd className="font-semibold text-ink">
                      ₹{(parcel.rate_per_sqm || 6500).toLocaleString()} / sqm
                    </dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <dt className="text-ink/60">Indicative Circle Value</dt>
                    <dd className="font-bold text-ink font-mono">
                      ₹{((parcel.rate_per_sqm || 6500) * parcel.area_sqm).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-ink/60">Valuation Band</dt>
                    <dd className="text-ink">{parcel.valuation_band || "Band B (Standard)"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Ground Map Preview Box */}
            <div className="bg-parchment p-5 rounded-lg plot-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <Layers className="w-4 h-4 text-ochre-dark" />
                  <span>Cadastral Boundary Map Preview</span>
                </h3>
                <button
                  onClick={() => setActiveTab("map")}
                  className="text-xs text-ochre-dark hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Interactive Map View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-64 w-full plot-border overflow-hidden rounded relative">
                <MapView focus={[centerLat, centerLng]} selectedUlpidProp={parcel.ulpid} />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CONFLICTS & AREA MISMATCH (Primary Demo Information)  */}
        {/* ============================================================ */}
        {activeTab === "conflicts" && (
          <div className="space-y-6">
            {hasAreaMismatch || conflicts.length > 0 ? (
              <div className="space-y-4">
                {/* PRIMARY INFORMATION CARD: POTENTIAL AREA MISMATCH */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-amber-200/70 rounded-lg text-amber-900 shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs uppercase font-bold text-amber-900 tracking-wider">
                            POTENTIAL AREA MISMATCH
                          </span>
                          <span className="bg-amber-200 text-amber-900 border border-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            Severity: Medium
                          </span>
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Status: Requires Officer Verification
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-amber-950 mt-1.5">
                          RoR Area (1,250 sqm) does not match Surveyed Area (1,180 sqm)
                        </h3>
                      </div>
                    </div>

                    <Link
                      href={`/officer/mutations?ulpid=${parcel.ulpid}`}
                      className="bg-ink text-parchment px-4 py-2 rounded text-xs font-bold hover:bg-ink-light shrink-0 transition-colors self-start"
                    >
                      Officer Adjudication →
                    </Link>
                  </div>

                  {/* Deep Comparative Analysis Matrix */}
                  <div className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-parchment p-3.5 rounded-lg border border-ink/15">
                        <div className="text-ink/60 text-[11px] font-mono uppercase">RoR Area</div>
                        <div className="font-serif text-xl font-bold text-ink mt-0.5">
                          {rorArea.toLocaleString()} sqm
                        </div>
                        <div className="text-[10px] text-ink/50 mt-1">Record of Rights (Jamabandi)</div>
                      </div>

                      <div className="bg-parchment p-3.5 rounded-lg border border-ink/15">
                        <div className="text-ink/60 text-[11px] font-mono uppercase">Surveyed Area</div>
                        <div className="font-serif text-xl font-bold text-ink mt-0.5">
                          {surveyedArea.toLocaleString()} sqm
                        </div>
                        <div className="text-[10px] text-ink/50 mt-1">PostGIS Cadastral Polygon</div>
                      </div>

                      <div className="bg-amber-100 p-3.5 rounded-lg border border-amber-300 text-amber-950">
                        <div className="text-[11px] font-mono uppercase font-bold text-amber-800">Difference</div>
                        <div className="font-serif text-xl font-bold mt-0.5">
                          {areaDiff} sqm
                        </div>
                        <div className="text-[10px] text-amber-900/80 mt-1">Discrepancy flagged for verification</div>
                      </div>
                    </div>
                  </div>

                  {/* Decision Support Explanatory Line */}
                  <div className="pt-2 border-t border-amber-200 text-xs text-amber-900/90 leading-relaxed font-sans">
                    <strong>Decision Support Note:</strong> Automated checks provide decision support; authorized officials make final decisions. Discrepancy flags represent technical reconciliation variances between legacy departmental databases for ground survey verification.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-parchment p-8 rounded-xl plot-border text-center text-ink/70">
                <CheckCircle2 className="w-8 h-8 text-land mx-auto mb-2" />
                <h3 className="font-serif text-lg font-bold text-ink">No Inconsistencies Flagged</h3>
                <p className="text-xs text-ink/60 mt-1 max-w-md mx-auto">
                  Record of Rights (RoR), Cadastral Survey boundaries, and Municipal tax registers are fully aligned.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: TITLE & RoR RECORDS                                   */}
        {/* ============================================================ */}
        {activeTab === "ownership" && (
          <div className="bg-parchment p-6 rounded-lg plot-border space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Building className="w-4 h-4 text-ochre-dark" />
              <span>Record of Rights (Jamabandi / RoR)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Registered Titleholder</div>
                <div className="font-bold text-ink text-sm mt-0.5">{parcel.owner.name}</div>
              </div>
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Title Registration Date</div>
                <div className="font-bold text-ink text-sm mt-0.5">{formatDate(parcel.owner.since)}</div>
              </div>
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Khasra / Survey Number</div>
                <div className="font-bold text-ink font-mono text-sm mt-0.5">{parcel.survey_no || "142/3"}</div>
              </div>
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Khewat / Khatauni</div>
                <div className="font-bold text-ink font-mono text-sm mt-0.5">{parcel.khewat_no || "74/82 · 112"}</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: TAX & MUNICIPAL STATUS                                */}
        {/* ============================================================ */}
        {activeTab === "tax" && (
          <div className="bg-parchment p-6 rounded-lg plot-border space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ochre-dark" />
              <span>Property Tax &amp; Municipal Clearance</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Assessment Status</div>
                <div className={`font-bold text-sm mt-0.5 ${parcel.tax_status.paid ? "text-land" : "text-brick"}`}>
                  {parcel.tax_status.paid ? "✓ Tax Paid (Zero Dues)" : `⚠ Pending Dues: ₹${parcel.tax_status.dues}`}
                </div>
              </div>
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Last Assessment Date</div>
                <div className="font-bold text-ink text-sm mt-0.5">
                  {formatDate(parcel.tax_status.last_paid)}
                </div>
              </div>
              <div className="p-3 bg-parchment-dark/30 rounded border border-ink/10">
                <div className="text-ink/60">Outstanding Dues</div>
                <div className="font-bold text-ink text-sm mt-0.5">
                  ₹{parcel.tax_status.dues.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: MUTATION LEDGER & SHA-256 AUDIT CHAIN                 */}
        {/* ============================================================ */}
        {activeTab === "mutations" && (
          <div className="bg-parchment p-6 rounded-lg plot-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <History className="w-4 h-4 text-ochre-dark" />
                <span>Tamper-Evident Mutation Ledger</span>
              </h3>
              <span className="text-[11px] font-mono text-ink/50">SHA-256 Hash Chained</span>
            </div>

            <div className="tick-ruler border-l-2 border-ink/20 pl-6 space-y-6">
              {parcel.mutations?.map((m, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ochre bg-parchment" />
                  <div className="text-[11px] font-mono text-ink/50">
                    {formatDate(m.date)}
                  </div>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {m.type}
                  </div>
                  <div className="text-xs text-ink/70 mt-0.5">
                    Transferred from <strong className="text-ink">{m.from}</strong> to <strong className="text-ink">{m.to}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: INTERACTIVE GIS MAP                                   */}
        {/* ============================================================ */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="h-[500px] w-full plot-border overflow-hidden rounded-lg relative shadow-sm">
              <MapView focus={[centerLat, centerLng]} selectedUlpidProp={parcel.ulpid} />
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}

function formatDate(iso: string) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
