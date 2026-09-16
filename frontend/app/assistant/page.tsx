"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AssistantChat from "@/components/assistant/AssistantChat";
import {
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Layers,
  MapPin,
  ExternalLink,
  Bot,
  Database,
  GitBranch,
} from "lucide-react";

function AssistantPageContent() {
  const searchParams = useSearchParams();
  const initialParcel = searchParams.get("ulpid") || undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI LAND INTELLIGENCE &amp; DECISION SUPPORT</span>
            <span>·</span>
            <span>PUBLIC SERVICE ASSISTANT</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
            Bhu-Setu Land Assistant
          </h1>
          <p className="text-xs sm:text-sm text-ink/70 mt-1 max-w-2xl">
            Ask natural-language questions about cadastral records, area discrepancies, cross-source reconciliation, and statutory mutation workflows.
          </p>
        </div>

        {/* Prototype Environment Pill */}
        <div className="bg-ochre/15 border border-ochre/30 px-3 py-2 rounded-lg text-xs text-ink/80 flex items-center gap-2 self-start sm:self-auto">
          <Bot className="w-4 h-4 text-ochre-dark shrink-0" />
          <div className="text-[11px] font-mono leading-tight">
            <strong>Grounded Decision Support</strong>
            <div className="text-ink/60">Grounded in PostGIS SRID 4326 Cadastre</div>
          </div>
        </div>
      </div>

      {/* Main Assistant Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Conversation Stream */}
        <div className="lg:col-span-8">
          <AssistantChat initialParcel={initialParcel} />
        </div>

        {/* Right Information & Context Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Knowledge & Data Pillar Card */}
          <div className="bg-parchment p-5 rounded-xl plot-border-solid shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-serif text-sm font-bold text-ink border-b border-ink/10 pb-2">
              <Database className="w-4 h-4 text-ochre-dark" />
              <span>Grounded Data Sources</span>
            </div>
            <p className="text-xs text-ink/70 leading-relaxed">
              The assistant synthesizes live data from Bhu-Setu&apos;s four core land infrastructure connectors:
            </p>
            <ul className="space-y-2 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ochre mt-1.5 shrink-0" />
                <div>
                  <strong>State RoR (Jamabandi):</strong> Title ownership, Khasra/Khatauni indices.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ochre mt-1.5 shrink-0" />
                <div>
                  <strong>Bhu-Naksha GIS:</strong> PostGIS georeferenced polygon extents.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ochre mt-1.5 shrink-0" />
                <div>
                  <strong>NGDRS / IGRS:</strong> Registered sale deeds and consideration fees.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ochre mt-1.5 shrink-0" />
                <div>
                  <strong>Municipal Tax &amp; Zoning:</strong> Property tax status and valuation bands.
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Demo Parcel Links */}
          <div className="bg-parchment p-5 rounded-xl plot-border-solid shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="font-serif font-bold text-ink">Configured Demo Parcels</span>
              <span className="font-mono text-[10px] text-ink/50">SIH 2026</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <Link
                href="/assistant?ulpid=PB-LDH-0042"
                className="flex items-center justify-between p-2 rounded bg-parchment-dark/40 hover:bg-ink hover:text-parchment transition-colors group"
              >
                <div>
                  <div className="font-bold">PB-LDH-0042</div>
                  <div className="text-[10px] text-ink/60 group-hover:text-parchment/70 font-sans">
                    70 sqm Area Mismatch (Primary Demo)
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link
                href="/assistant?ulpid=PB-LDH-0044"
                className="flex items-center justify-between p-2 rounded bg-parchment-dark/40 hover:bg-ink hover:text-parchment transition-colors group"
              >
                <div>
                  <div className="font-bold">PB-LDH-0044</div>
                  <div className="text-[10px] text-ink/60 group-hover:text-parchment/70 font-sans">
                    Verified Clear Cadastral Record
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link
                href="/assistant?ulpid=PB-LDH-0043"
                className="flex items-center justify-between p-2 rounded bg-parchment-dark/40 hover:bg-ink hover:text-parchment transition-colors group"
              >
                <div>
                  <div className="font-bold">PB-LDH-0043</div>
                  <div className="text-[10px] text-ink/60 group-hover:text-parchment/70 font-sans">
                    Pending Tax Arrears ₹3,200
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </div>

          {/* Statutory & Legal Safety Disclaimer */}
          <div className="bg-ink/5 border border-ink/10 rounded-xl p-4 text-[11px] text-ink/75 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
              <ShieldCheck className="w-4 h-4 text-ochre-dark shrink-0" />
              <span>Responsible AI Governance Notice</span>
            </div>
            <p>
              • <strong>Decision Support:</strong> The assistant provides automated decision support based on available cadastral records. Authorized Revenue Officers and Sub-Registrars make final statutory determinations.
            </p>
            <p>
              • <strong>Privacy Protection:</strong> Bhu-Setu does not access, store, or display Aadhaar numbers or confidential banking data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />
      <Suspense fallback={<div className="p-12 text-center text-xs font-mono">Loading Bhu-Setu Assistant…</div>}>
        <AssistantPageContent />
      </Suspense>
      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS-based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
