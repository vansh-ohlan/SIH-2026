"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import {
  Compass,
  Layers,
  ShieldCheck,
  FileText,
  Building,
  ArrowRight,
  Database,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  ShieldAlert,
  Users,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const demoParcels = [
    {
      ulpid: "PB-LDH-0042",
      state: "Punjab",
      district: "Ludhiana",
      owner: "Ramesh Kumar",
      area: "1,250 sqm",
      status: "Potential Area Mismatch",
      tag: "Demo Case",
      tagColor: "bg-amber-100 text-amber-900 border-amber-300",
      notes: "RoR: 1,250 sqm vs Survey: 1,180 sqm (Diff: 70 sqm)",
    },
    {
      ulpid: "PB-LDH-0043",
      state: "Punjab",
      district: "Ludhiana",
      owner: "Suresh Singh",
      area: "980 sqm",
      status: "Tax Arrears Pending",
      tag: "Agricultural",
      tagColor: "bg-land/20 text-land border-land/30",
      notes: "Outstanding dues of ₹3,200",
    },
    {
      ulpid: "CH-SEC-1701",
      state: "Chandigarh",
      district: "Sector 17",
      owner: "Rajiv Walia & Associates",
      area: "2,400 sqm",
      status: "Verified Clear",
      tag: "Commercial",
      tagColor: "bg-ink/10 text-ink border-ink/20",
      notes: "Municipal tax current · Title clear",
    },
    {
      ulpid: "TN-SPR-0814",
      state: "Tamil Nadu",
      district: "Sriperumbudur",
      owner: "K. Venkatesan",
      area: "3,200 sqm",
      status: "Verified Clear",
      tag: "Industrial",
      tagColor: "bg-ink/10 text-ink border-ink/20",
      notes: "Patta synchronized with survey boundary",
    },
  ];

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-grid border-b border-ink/10 py-14 sm:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 font-mono text-xs text-ink/60 mb-3 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-ink">DIGITAL PUBLIC INFRASTRUCTURE</span>
            <span>·</span>
            <span className="bg-ochre/20 text-ochre-dark px-2 py-0.5 rounded text-[10px] font-bold">
              Prototype / Demonstration Data
            </span>
            <span>·</span>
            <span>SIH 2026</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink max-w-3xl leading-[1.15]">
            Connecting Land Data.
            <br />
            <span className="text-ochre-dark">Empowering Land Governance.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm sm:text-base text-ink/80 leading-relaxed font-sans">
            Bhu-Setu does not replace existing land systems. It connects authorized land information around a common parcel identity and provides a unified, spatially verifiable, and auditable view.
          </p>

          {/* Quick Search Box */}
          <div className="mt-8 max-w-2xl bg-parchment-dark/50 p-4 rounded-xl plot-border-solid shadow-sm">
            <div className="text-xs font-bold text-ink/80 mb-2 flex items-center justify-between">
              <span>Search ULPID or Landowner:</span>
              <span className="font-mono text-[10px] text-ink/50">Source: PostGIS &amp; Synthetic Cadastre</span>
            </div>
            <SearchBar
              onResultFocus={(lat, lng) => {
                router.push(`/citizen/parcel/PB-LDH-0042`);
              }}
            />
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/citizen"
              className="flex items-center gap-2 bg-ink text-parchment px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold hover:bg-ink-light transition-all shadow-sm"
            >
              <span>Citizen Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/map"
              className="flex items-center gap-2 bg-ochre/20 text-ochre-dark border border-ochre/40 px-5 py-2.5 rounded-md text-xs sm:text-sm font-bold hover:bg-ochre/30 transition-all shadow-sm"
            >
              <Layers className="w-4 h-4" />
              <span>Explore GIS Map</span>
            </Link>

            <Link
              href="/officer"
              className="flex items-center gap-2 bg-parchment text-ink border border-ink/20 px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold hover:bg-parchment-dark hover:border-ink/40 transition-all"
            >
              <Compass className="w-4 h-4 text-ochre-dark" />
              <span>Officer Hub</span>
            </Link>
          </div>
        </div>

        <div className="tick-ruler h-2 w-full mt-12" />
      </section>

      {/* Integration Architecture / Process Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-ochre-dark">
            Common Parcel Identity Framework
          </div>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-ink">
            How Bhu-Setu Connects Siloed Land Systems
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-ink/70">
            Bhu-Setu does NOT replace state revenue departments. It operates as an interoperable Digital Public Infrastructure layer connecting existing databases around the 14-digit ULPID.
          </p>
        </div>

        {/* Complete 6-Step Architecture Flow */}
        <div className="bg-ink text-parchment rounded-xl p-6 sm:p-8 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1: Existing Systems */}
            <div className="bg-ink-light p-4 rounded-lg border border-parchment/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-ochre-light font-mono text-xs font-bold uppercase mb-2">
                  <Database className="w-4 h-4" />
                  <span>1. Existing Systems</span>
                </div>
                <ul className="space-y-1.5 text-xs text-parchment/80">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ochre"></span>
                    <span><strong>Bhu-Naksha</strong> (Cadastral Survey)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ochre"></span>
                    <span><strong>Jamabandi / Bhulekh</strong> (RoR)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ochre"></span>
                    <span><strong>NGDRS / IGRS</strong> (Deeds)</span>
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-ochre-light/70 mt-3 pt-2 border-t border-parchment/10">
                Departmental Data Sources
              </div>
            </div>

            {/* Step 2: API Integration & Common Identity */}
            <div className="bg-ochre-dark/30 p-4 rounded-lg border border-ochre/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-ochre font-mono text-xs font-bold uppercase mb-2">
                  <GitBranch className="w-4 h-4" />
                  <span>2. Common Identity &amp; GIS</span>
                </div>
                <ul className="space-y-1.5 text-xs text-parchment/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ochre shrink-0" />
                    <span><strong>ULPID Standard</strong> (Unique Key)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ochre shrink-0" />
                    <span><strong>PostGIS SRID 4326</strong> Polygons</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ochre shrink-0" />
                    <span><strong>SHA-256 Audit Chain</strong> Ledger</span>
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-ochre-light/90 mt-3 pt-2 border-t border-ochre/20">
                Unified Spatial Architecture
              </div>
            </div>

            {/* Step 3: Decision Support & Workflows */}
            <div className="bg-ink-light p-4 rounded-lg border border-parchment/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>3. Decision Support &amp; Workflows</span>
                </div>
                <ul className="space-y-1.5 text-xs text-parchment/80">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span><strong>Citizen Public Portal</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span><strong>Officer Adjudication Queue</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span><strong>Automated Inconsistency Checks</strong></span>
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-emerald-300/70 mt-3 pt-2 border-t border-parchment/10">
                Decision Support Output
              </div>
            </div>
          </div>

          {/* Architecture Flow Banner */}
          <div className="mt-6 pt-4 border-t border-parchment/15 text-center text-xs text-parchment/70 font-mono flex items-center justify-center flex-wrap gap-2">
            <span>Existing Systems</span>
            <span className="text-ochre">→</span>
            <span>API Integration</span>
            <span className="text-ochre">→</span>
            <span>Common Parcel Identity</span>
            <span className="text-ochre">→</span>
            <span>Unified GIS View</span>
            <span className="text-ochre">→</span>
            <span>Decision Support</span>
            <span className="text-ochre">→</span>
            <span>Citizen + Officer Workflows</span>
          </div>
        </div>
      </section>

      {/* Demo Cadastral Parcels Section */}
      <section className="bg-parchment-dark/30 border-t border-b border-ink/10 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-ochre-dark">
                Prototype Dataset
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink">
                Featured Demonstration Land Parcels
              </h2>
              <p className="text-xs text-ink/70 mt-0.5">
                Deterministic synthetic records demonstrating verified records and detected area discrepancies.
              </p>
            </div>
            <Link
              href="/citizen"
              className="text-xs font-bold text-ink hover:text-ochre-dark flex items-center gap-1"
            >
              <span>Explore all parcels</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoParcels.map((parcel) => (
              <Link
                key={parcel.ulpid}
                href={`/citizen/parcel/${parcel.ulpid}`}
                className="bg-parchment p-4 rounded-lg plot-border hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-ink group-hover:text-ochre-dark transition-colors">
                      {parcel.ulpid}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${parcel.tagColor}`}>
                      {parcel.tag}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-ink/90 mt-1">
                    {parcel.owner}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-0.5">
                    {parcel.district}, {parcel.state} · {parcel.area}
                  </div>

                  <div className="text-[11px] text-ink/70 mt-2 font-medium">
                    {parcel.notes}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-ink/10 flex items-center justify-between text-[11px]">
                  <span className="text-xs font-semibold text-ochre-dark">{parcel.status}</span>
                  <span className="text-ink font-semibold group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 bg-parchment py-6 px-4 sm:px-6 text-xs text-ink/60">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>BHU-SETU</strong> · Smart India Hackathon 2026 (SIH 26014)
            <div className="text-[11px] text-ink/50 mt-0.5">
              An Integrated GIS-based Digital Public Infrastructure for Land Governance
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-ink/50">
            Prototype Demonstration Platform · Not a Legal Record
          </div>
        </div>
      </footer>
    </main>
  );
}
