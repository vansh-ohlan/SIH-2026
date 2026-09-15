"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import {
  Search,
  MapPin,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Building,
  Info,
  CheckCircle2,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-parchment-dark text-xs text-ink/50 font-mono">
      Initializing Cadastral Map View…
    </div>
  ),
});

export default function CitizenPortalPage() {
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const sampleParcels = [
    {
      ulpid: "PB-LDH-0042",
      owner: "Ramesh Kumar",
      since: "2011",
      area: "1,250 sqm",
      landUse: "Residential",
      district: "Ludhiana, Punjab",
      taxStatus: "✓ Tax Paid",
      taxPaid: true,
      status: "Potential Area Mismatch",
      statusType: "warning",
      notes: "RoR area (1,250 sqm) differs from Surveyed area (1,180 sqm)",
    },
    {
      ulpid: "PB-LDH-0043",
      owner: "Suresh Singh",
      since: "2016",
      area: "980 sqm",
      landUse: "Agricultural",
      district: "Ludhiana, Punjab",
      taxStatus: "⚠ Dues: ₹3,200",
      taxPaid: false,
      status: "Tax Arrears Flagged",
      statusType: "warning",
      notes: "Boundary clear · Property tax assessment notice pending",
    },
    {
      ulpid: "CH-SEC-1701",
      owner: "Rajiv Walia & Associates",
      since: "2015",
      area: "2,400 sqm",
      landUse: "Commercial",
      district: "Sector 17, Chandigarh",
      taxStatus: "✓ Tax Paid",
      taxPaid: true,
      status: "Verified Clear",
      statusType: "success",
      notes: "Municipal tax current · Survey boundaries reconciled",
    },
    {
      ulpid: "TN-SPR-0814",
      owner: "K. Venkatesan",
      since: "2008",
      area: "3,200 sqm",
      landUse: "Agricultural",
      district: "Sriperumbudur, Tamil Nadu",
      taxStatus: "⚠ Dues: ₹4,800",
      taxPaid: false,
      status: "Verified Clear",
      statusType: "success",
      notes: "Patta / Chitta synchronized with cadastral survey",
    },
  ];

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
            <span>PUBLIC ACCESS GATEWAY</span>
            <span>·</span>
            <span>CITIZEN LAND VERIFICATION</span>
            <span>·</span>
            <span className="bg-ochre/20 px-1.5 py-0.5 rounded text-[10px]">
              Prototype Dataset
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-ink mt-1">
            Citizen Land Record Portal
          </h1>
          <p className="text-xs sm:text-sm text-ink/70 max-w-2xl mt-1">
            Search, inspect, and verify spatial cadastral records, titleholder details,
            and municipal tax status using the national 14-digit Unique Land Parcel ID (ULPID).
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-parchment-dark/50 p-4 sm:p-6 rounded-xl plot-border-solid shadow-sm mb-8">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-ink mb-2">
            <Search className="w-4 h-4 text-ochre-dark" />
            <span>Search Land Parcel by ULPID or Owner</span>
          </div>
          <SearchBar onResultFocus={(lat, lng) => setFocus([lat, lng])} />
        </div>

        {/* 2-Column Grid: Featured Parcels + Interactive Map Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mb-10">
          {/* Left Column: Sample Parcels */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">
                Featured Cadastral Records
              </h2>
              <span className="text-xs text-ink/50 font-mono">Prototype Demonstration</span>
            </div>

            <div className="space-y-3">
              {sampleParcels.map((parcel) => (
                <Link
                  key={parcel.ulpid}
                  href={`/citizen/parcel/${parcel.ulpid}`}
                  className="block bg-parchment p-4 rounded-lg plot-border hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-ink group-hover:text-ochre-dark transition-colors">
                          {parcel.ulpid}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            parcel.statusType === "warning"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-land/20 text-land border-land/30"
                          }`}
                        >
                          {parcel.status}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            parcel.taxPaid ? "bg-land/10 text-land" : "bg-brick/10 text-brick"
                          }`}
                        >
                          {parcel.taxStatus}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-ink/90 mt-1.5">
                        {parcel.owner} · <span className="text-ink/60 font-normal">Registered since {parcel.since}</span>
                      </div>
                      <div className="text-xs text-ink/60 mt-0.5">
                        {parcel.district} · {parcel.area} · {parcel.landUse}
                      </div>
                    </div>
                    <div className="text-ink group-hover:translate-x-1 transition-transform pt-1">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-ink/10 text-[11px] text-ink/70 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-ochre-dark shrink-0" />
                    <span className="truncate">{parcel.notes}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column: Embedded Cadastral Map */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">
                    Cadastral GIS Map View
                  </h2>
                  <p className="text-xs text-ink/60">
                    Click any polygon to inspect parcel boundaries and land classification.
                  </p>
                </div>
                <Link
                  href="/map"
                  className="text-xs font-semibold text-ink hover:text-ochre-dark flex items-center gap-1"
                >
                  <span>Full Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="h-[420px] sm:h-[460px] w-full plot-border overflow-hidden rounded-lg relative shadow-sm">
                <MapView focus={focus} />
              </div>
            </div>
          </div>
        </div>

        {/* Citizen Information & Legal Notice */}
        <div className="bg-ink/5 border border-ink/10 rounded-xl p-5 text-xs text-ink/75 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <HelpCircle className="w-4 h-4 text-ochre-dark" />
            <span>Understanding Land Governance Records</span>
          </div>
          <p className="leading-relaxed">
            • <strong>Verified Information:</strong> RoR title records and Cadastral survey boundaries are reconciled using the 14-digit ULPID.
          </p>
          <p className="leading-relaxed">
            • <strong>Decision Support:</strong> Automated checks provide decision support; authorized officials make final decisions. Discrepancy flags indicate technical variances between legacy databases for field verification, not legal violations.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS-based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
