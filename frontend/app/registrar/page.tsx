"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/authContext";
import {
  Building,
  FileCheck2,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
  History,
  FileText,
} from "lucide-react";

export default function RegistrarPage() {
  const { user, role, hasRole } = useAuth();
  const isRegistrar = hasRole(["registrar", "admin"]);

  const stats = [
    { label: "Registered Conveyances", value: "14", sub: "Ludhiana Registration Circle", icon: Building, color: "text-ink" },
    { label: "Pending Deed Verifications", value: "2", sub: "Spatial Check Required", icon: FileCheck2, color: "text-ochre-dark" },
    { label: "ULPID Linked Deeds", value: "100%", sub: "SRID 4326 Reconciled", icon: Layers, color: "text-land" },
    { label: "Stamp Duty Cleared", value: "₹4.82 L", sub: "FY 2026-27 YTD", icon: ShieldCheck, color: "text-emerald-700" },
  ];

  const deedCases = [
    {
      deedNumber: "DEED-PB-2026-1402",
      ulpid: "PB-LDH-0042",
      type: "Sale Deed (Residential)",
      parties: "Harbans Lal → Ramesh Kumar",
      consideration: "₹81.25 Lakhs",
      stampDuty: "₹4.87 Lakhs (Paid)",
      status: "under_spatial_review",
      statusLabel: "Spatial Discrepancy Flagged (70 sqm)",
      statusColor: "bg-amber-100 text-amber-900 border-amber-300",
      date: "2026-09-12",
    },
    {
      deedNumber: "DEED-PB-2026-1388",
      ulpid: "PB-LDH-0043",
      type: "Succession / Virasat",
      parties: "Gurdev Singh → Suresh Singh",
      consideration: "Inheritance",
      stampDuty: "Exempted",
      status: "tax_arrears_pending",
      statusLabel: "Pending Tax Notice ₹3,200",
      statusColor: "bg-amber-100 text-amber-900 border-amber-300",
      date: "2026-09-10",
    },
    {
      deedNumber: "DEED-CH-2026-0914",
      ulpid: "CH-SEC-1701",
      type: "Commercial Conveyance",
      parties: "UT Estate Office → Rajiv Walia",
      consideration: "₹4.44 Crore",
      stampDuty: "₹26.64 Lakhs (Paid)",
      status: "registered_sealed",
      statusLabel: "Registered & Sealed",
      statusColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
      date: "2026-09-08",
    },
  ];

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full flex-1 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
              <span>DEED REGISTRATION GATEWAY</span>
              <span>·</span>
              <span>NGDRS / IGRS SPATIAL INTEGRATION</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Sub-Registrar Conveyance Portal
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Verify legal deed conveyances against PostGIS cadastral survey boundaries before statutory registration.
            </p>
          </div>

          {!isRegistrar && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-700" />
              <div>
                <strong>Viewing as {role.replace("_", " ")}</strong>
                <div className="text-[11px] text-amber-800">
                  <Link href="/login" className="underline font-bold">
                    Switch to Sub-Registrar
                  </Link> to test official deed approval.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-parchment p-5 rounded-xl plot-border shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-ink/50 font-semibold">
                    {stat.label}
                  </span>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="mt-3">
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-0.5 font-medium">
                    {stat.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deed Registration Cases Queue */}
        <div className="bg-parchment p-5 sm:p-6 rounded-xl plot-border-solid shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-ochre-dark" />
                <span>Pending Deed Conveyance &amp; Spatial Verification Queue</span>
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                Pre-registration validation checking PostGIS boundary overlap, municipal dues, and mutation linkage.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink/15 text-ink/50 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Deed Reference</th>
                  <th className="py-2.5 px-3">Target ULPID</th>
                  <th className="py-2.5 px-3">Conveyance Type</th>
                  <th className="py-2.5 px-3">Parties</th>
                  <th className="py-2.5 px-3">Consideration</th>
                  <th className="py-2.5 px-3">Spatial Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {deedCases.map((d) => (
                  <tr key={d.deedNumber} className="hover:bg-ink/5 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-ink">
                      {d.deedNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-ochre-dark font-bold">
                      <Link href={`/citizen/parcel/${d.ulpid}`} className="hover:underline flex items-center gap-1">
                        <span>{d.ulpid}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-medium text-ink">
                      {d.type}
                    </td>
                    <td className="py-3 px-3 text-ink/75">
                      {d.parties}
                    </td>
                    <td className="py-3 px-3 font-mono text-ink/70">
                      {d.consideration}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${d.statusColor}`}>
                        {d.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/officer/mutations?ulpid=${d.ulpid}`}
                        className="bg-ink text-parchment px-3 py-1.5 rounded text-xs font-bold hover:bg-ink-light inline-flex items-center gap-1"
                      >
                        <span>Adjudicate</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-ink/5 border border-ink/10 rounded-xl p-5 text-xs text-ink/75 space-y-1">
          <div className="font-bold text-ink">Sub-Registrar NGDRS Spatial Workflow Rule:</div>
          <p className="leading-relaxed">
            Section 21 of the Registration Act is enhanced by Bhu-Setu: no deed is registered without automated cross-verification of the 14-digit ULPID against the PostGIS cadastral polygon layer to prevent fraudulent multi-sale of overlapping land extents.
          </p>
        </div>
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
