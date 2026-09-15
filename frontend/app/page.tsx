"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import OcrUpload from "@/components/OcrUpload";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-parchment-dark text-sm text-ink/50">
      Loading survey map…
    </div>
  ),
});

export default function CitizenPortal() {
  const [focus, setFocus] = useState<[number, number] | null>(null);

  return (
    <main className="min-h-screen bg-parchment">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid-lines bg-grid">
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
          <div className="flex items-center gap-2 font-mono text-xs text-ink/50">
            <span>30.9008° N</span>
            <span>·</span>
            <span>75.8573° E</span>
            <span>·</span>
            <span>Multi-State Cadastral Network</span>
          </div>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl font-semibold leading-[1.05] text-ink">
            One record of truth for every parcel of land.
          </h1>
          <p className="mt-4 max-w-xl text-ink/70">
            Bhu-Setu links the Record of Rights, cadastral survey, statutory zoning,
            and satellite AI change detection into a single verified entry — searchable by
            owner, location or Unique Land Parcel ID (ULPIN).
          </p>

          <div className="mt-8 max-w-xl">
            <SearchBar onResultFocus={(lat, lng) => setFocus([lat, lng])} />
          </div>
        </div>

        <div className="tick-ruler h-2 w-full" />
      </section>

      {/* Stat strip */}
      <section className="border-b border-ink/10 bg-ink text-parchment">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-parchment/15 px-6 sm:grid-cols-4">
          {[
            ["3 States", "Pilot Cadastres (PB, CH, TN)"],
            ["4 Active", "Satellite AI Encroachment Alerts"],
            ["100%", "ULPIN Georeferenced"],
            ["Tamper-Evident", "Chain-of-Custody Logged"],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-6 first:pl-0">
              <div className="font-serif text-3xl font-semibold text-ochre">
                {value}
              </div>
              <div className="mt-1 text-xs text-parchment/70">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cadastral Map with Land Stack Layers */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink">
              Cadastral Map &amp; Land Stack Layers
            </h2>
            <p className="text-sm text-ink/60">
              Switch regions, toggle high-resolution satellite imagery, inspect statutory zoning, and view live AI encroachment flags.
            </p>
          </div>
        </div>
        <div className="h-[620px] w-full plot-border overflow-hidden relative shadow-[4px_4px_0_rgba(20,33,61,0.12)]">
          <MapView focus={focus} />
        </div>
      </section>

      {/* AI/ML Document Digitization & Verification Pipeline */}
      <section className="mx-auto max-w-6xl px-6 py-10 border-t border-ink/10">
        <div className="mb-6">
          <div className="flex items-center gap-2 font-mono text-xs text-ochre-dark font-bold uppercase tracking-wider">
            <span>AI/ML RoR INGESTION ENGINE</span>
            <span>·</span>
            <span>STAGE 2 RECONCILIATION</span>
          </div>
          <h2 className="mt-1 font-serif text-3xl font-semibold text-ink">
            Automated Land Document Digitization
          </h2>
          <p className="mt-1 text-sm text-ink/60 max-w-2xl">
            Upload scanned Jamabandi records or Patta/Chitta certificates to extract titleholders,
            cross-check boundaries against GIS ground surveys, and log decisions to the tamper-evident audit ledger.
          </p>
        </div>

        <OcrUpload onVerificationComplete={(ulpid) => setFocus([30.908, 75.855])} />
      </section>

      <footer className="border-t border-ink/10 py-8">
        <div className="mx-auto max-w-6xl px-6 text-xs text-ink/50">
          Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public
          Infrastructure for Land Governance
        </div>
      </footer>
    </main>
  );
}
