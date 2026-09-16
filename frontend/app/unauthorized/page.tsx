"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ShieldAlert, ArrowLeft, LogIn, Search } from "lucide-react";
import { useAuth } from "@/lib/authContext";

export default function UnauthorizedPage() {
  const { user, role } = useAuth();

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 w-full flex-1 flex flex-col justify-center text-center">
        <div className="bg-parchment p-8 rounded-2xl plot-border-solid shadow-sm space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-brick/10 border border-brick/30 text-brick flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="rounded bg-brick/15 text-brick border border-brick/30 px-2 py-0.5 font-mono text-[10px] font-bold">
              HTTP 403 · ACCESS RESTRICTED
            </span>
            <h1 className="font-serif text-2xl font-bold text-ink">
              Departmental Permission Required
            </h1>
            <p className="text-xs text-ink/70 max-w-sm mx-auto leading-relaxed">
              Your current session role (
              <span className="font-semibold text-ink uppercase tracking-wider">{role}</span>
              ) does not have authorization to access this governance desk or administrative console.
            </p>
          </div>

          {user && (
            <div className="p-3 bg-ink/5 rounded-lg border border-ink/10 text-xs text-ink/75 font-mono">
              Signed in as: <span className="font-bold text-ink">{user.name || user.username || user.userId}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              href="/citizen"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-ink text-parchment rounded-lg text-xs font-bold hover:bg-ink-light transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Return to Citizen Portal</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-ink/20 text-ink rounded-lg text-xs font-bold hover:bg-ink/5 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Switch Account / Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
