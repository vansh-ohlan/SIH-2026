"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Layers,
  MapPin,
  Building,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize2,
  ExternalLink,
  Target,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-parchment-dark text-xs font-mono text-ink/60">
      Loading GIS Map Engine &amp; PostGIS Geometries…
    </div>
  ),
});

export default function MapExplorerPage() {
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const regions = [
    { id: "punjab", name: "Punjab (Ludhiana)", coords: [30.905, 75.855] as [number, number] },
    { id: "chandigarh", name: "Chandigarh (Sector 17)", coords: [30.733, 76.779] as [number, number] },
    { id: "tamil_nadu", name: "Tamil Nadu (Sriperumbudur)", coords: [12.981, 79.972] as [number, number] },
  ];

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6 w-full flex-1 flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
              <span>POSTGIS SPATIAL CADASTRE</span>
              <span>·</span>
              <span>SRID 4326 POLYGON ENGINE</span>
              <span>·</span>
              <span className="bg-ochre/20 text-ochre-dark px-1.5 py-0.2 rounded text-[10px]">
                Prototype Dataset
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              Cadastral GIS Map Explorer
            </h1>
          </div>

          {/* Region Quick Selectors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink/60 font-medium hidden md:inline">Pilot Region:</span>
            {regions.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setFocus(reg.coords)}
                className="bg-parchment px-2.5 py-1 rounded border border-ink/20 text-xs font-semibold text-ink hover:bg-ink hover:text-parchment hover:border-ink transition-all shadow-sm"
              >
                {reg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas with Sidebar: Map as Central HERO */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
          {/* Main Hero Map Canvas */}
          <div className="lg:col-span-9 h-[540px] sm:h-[620px] lg:h-[660px] plot-border-solid rounded-xl overflow-hidden relative shadow-md">
            <MapView focus={focus} />
          </div>

          {/* Right Sidebar: Legend & Selected Parcel Quick Actions */}
          <div className="lg:col-span-3 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Demo Parcel Quick Card */}
              <div className="bg-parchment p-4 rounded-xl plot-border">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ochre-dark font-bold">
                    Featured Demo Parcel
                  </div>
                  <button
                    onClick={() => setFocus([30.905, 75.855])}
                    className="text-[10px] font-mono text-ink/60 hover:text-ochre-dark flex items-center gap-1 underline"
                  >
                    <Target className="w-3 h-3" />
                    <span>Focus</span>
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-ink mt-1">
                  PB-LDH-0042
                </div>
                <div className="text-xs text-ink/80 mt-0.5">
                  Ramesh Kumar · 1,250 sqm · Residential
                </div>

                <div className="mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <strong className="block font-semibold">Potential Area Mismatch</strong>
                    <span className="text-[10px] font-mono">RoR: 1,250 sqm · Survey: 1,180 sqm</span>
                  </div>
                </div>

                <Link
                  href="/citizen/parcel/PB-LDH-0042"
                  className="mt-3 w-full bg-ink text-parchment py-2 rounded text-xs font-semibold text-center flex items-center justify-center gap-1.5 hover:bg-ink-light transition-colors"
                >
                  <span>Open Full Parcel Record</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Spatial Classification Legend */}
              <div className="bg-parchment p-3.5 rounded-xl plot-border text-xs space-y-2">
                <div className="font-serif font-bold text-ink flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-ochre-dark" />
                  <span>Cadastral Classification</span>
                </div>

                <div className="space-y-1.5 text-ink/75 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500/60 border border-amber-600 shrink-0"></span>
                    <span>Residential Zone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-900/60 border border-blue-900 shrink-0"></span>
                    <span>Commercial Complex</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-700/60 border border-emerald-800 shrink-0"></span>
                    <span>Agricultural Farmland</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-stone-600/60 border border-stone-700 shrink-0"></span>
                    <span>Industrial Estate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-teal-600/60 border border-teal-700 shrink-0"></span>
                    <span>Eco-Sensitive Sanctuary</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on GIS Boundary & Planned Stages */}
            <div className="bg-ink/5 p-3 rounded-lg border border-ink/10 text-[10px] text-ink/65 leading-relaxed space-y-1">
              <div>
                <strong>GIS Source of Truth:</strong> Live GeoJSON served via <code>GET /api/map/parcels</code> from PostGIS.
              </div>
              <div>
                <em>Note:</em> QGIS vectorization, GeoServer WMS/WFS, and automated satellite change detection are <strong>Planned Stage 4</strong> capabilities.
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-ink/10 py-4 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
