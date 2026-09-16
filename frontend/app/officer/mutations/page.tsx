"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficerSidebar from "@/components/OfficerSidebar";
import ConflictBadge from "@/components/ConflictBadge";
import OcrUpload from "@/components/OcrUpload";
import { useAuth } from "@/lib/authContext";
import { getParcel, getConflicts, postMutationDecision } from "@/lib/api";
import { Parcel, Conflict, MutationDecisionResponse } from "@/lib/types";
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Hash,
  HelpCircle,
  Loader2,
  Building,
  FileText,
  UploadCloud,
} from "lucide-react";

function MutationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, role, token, hasRole } = useAuth();

  const isOfficer = hasRole(["revenue_officer", "registrar", "admin"]);

  const initialUlpid = searchParams.get("ulpid") || "PB-LDH-0042";
  const [selectedUlpid, setSelectedUlpid] = useState<string>(initialUlpid);
  const [activeMode, setActiveMode] = useState<"form" | "ocr">("form");
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loadingParcel, setLoadingParcel] = useState(false);

  // Form State
  const [decision, setDecision] = useState<"approved" | "rejected" | "needs_review">("needs_review");
  const [officerId, setOfficerId] = useState<string>(user?.officerId || "OFF-102");
  const [notes, setNotes] = useState<string>("Field survey verification required for 70 sqm area discrepancy between Jamabandi and ground GIS polygon.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<MutationDecisionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Update officer ID if user changes
  useEffect(() => {
    if (user?.officerId) {
      setOfficerId(user.officerId);
    }
  }, [user]);

  // Load parcel details when ULPID changes
  useEffect(() => {
    setLoadingParcel(true);
    setSubmissionResult(null);
    setErrorMessage(null);

    Promise.all([getParcel(selectedUlpid), getConflicts(selectedUlpid)])
      .then(([p, c]) => {
        setParcel(p);
        setConflicts(c);
      })
      .catch((err) => {
        console.error("Failed to load parcel:", err);
      })
      .finally(() => {
        setLoadingParcel(false);
      });
  }, [selectedUlpid]);

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await postMutationDecision(selectedUlpid, {
        decision,
        officer_id: officerId,
        notes,
      });

      setSubmissionResult(result);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to record mutation decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isDemoMismatch = selectedUlpid === "PB-LDH-0042";

  return (
    <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ochre-dark font-semibold uppercase">
            <span>STATUTORY MUTATION ADJUDICATION</span>
            <span>·</span>
            <span>TAMPER-EVIDENT AUDIT TRAIL</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
            Officer Mutation Adjudication
          </h1>
          <p className="text-xs text-ink/70 mt-1">
            Review land inconsistency flags, verify ground survey data, and seal mutation determinations in PostgreSQL.
          </p>
        </div>

        {/* Target Parcel Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink/70">Target Parcel:</span>
          <select
            value={selectedUlpid}
            onChange={(e) => setSelectedUlpid(e.target.value)}
            className="bg-parchment px-3 py-1.5 rounded border border-ink/20 font-mono text-xs font-bold text-ink focus:outline-none focus:border-ink shadow-sm"
          >
            <option value="PB-LDH-0042">PB-LDH-0042 (Area Mismatch Demo)</option>
            <option value="PB-LDH-0043">PB-LDH-0043 (Agricultural)</option>
            <option value="CH-SEC-1701">CH-SEC-1701 (Commercial)</option>
            <option value="TN-SPR-0814">TN-SPR-0814 (Industrial)</option>
          </select>
        </div>
      </div>

      {/* RBAC Warning Banner if user is Citizen */}
      {!isOfficer && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <Lock className="w-4 h-4 text-amber-700" />
            <span>Role-Based Access Notice: Authenticated as &quot;{role}&quot;</span>
          </div>
          <p className="leading-relaxed">
            Citizens cannot perform mutation decisions (HTTP 403 Forbidden). To test authorized mutation adjudication, switch to the <strong>Revenue Officer</strong>, <strong>Sub-Registrar</strong>, or <strong>Admin</strong> demo role.
          </p>
          <Link
            href="/login"
            className="inline-block bg-ink text-parchment px-3 py-1.5 rounded font-bold text-xs mt-1 hover:bg-ink-light transition-colors"
          >
            Switch Demo Role to Revenue Officer →
          </Link>
        </div>
      )}

      {/* Mode Switcher: Direct Adjudication vs Document Intelligence & OCR */}
      <div className="flex border-b border-ink/15 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveMode("form")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeMode === "form"
              ? "border-ink font-bold text-ink bg-parchment-dark/30"
              : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Statutory Adjudication Form</span>
        </button>
        <button
          onClick={() => setActiveMode("ocr")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
            activeMode === "ocr"
              ? "border-ink font-bold text-ink bg-parchment-dark/30"
              : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          <UploadCloud className="w-4 h-4 text-ochre-dark" />
          <span>Document Intelligence &amp; RoR Ingestion</span>
          <span className="bg-ochre/20 text-ink text-[10px] px-1.5 py-0.5 rounded font-mono">Stage 3 OCR</span>
        </button>
      </div>

      {activeMode === "ocr" ? (
        <OcrUpload onVerificationComplete={(ulpid) => setSelectedUlpid(ulpid)} />
      ) : (
        /* Main 2-Column Workflow Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Context Card & Comparative Record */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-parchment p-5 rounded-xl plot-border space-y-4">
              <div className="flex items-center justify-between border-b border-ink/10 pb-2.5">
                <span className="font-mono text-xs font-bold text-ink uppercase">
                  Target Parcel Profile
                </span>
                <span className="font-mono text-xs font-bold text-ochre-dark">
                  {selectedUlpid}
                </span>
              </div>

              {loadingParcel ? (
                <div className="p-8 text-center text-xs font-mono text-ink/60">
                  Loading parcel specifications…
                </div>
              ) : parcel ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="text-[11px] text-ink/50 uppercase font-mono">Registered Titleholder</div>
                    <div className="font-bold text-sm text-ink">{parcel.owner.name}</div>
                    <div className="text-[11px] text-ink/60">Since {parcel.owner.since}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink/10">
                    <div>
                      <div className="text-[11px] text-ink/50 uppercase font-mono">Land Use</div>
                      <div className="font-semibold text-ink">{parcel.land_use}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink/50 uppercase font-mono">Total Extent</div>
                      <div className="font-serif font-bold text-ink">{parcel.area_sqm} sqm</div>
                    </div>
                  </div>

                  {/* Prominent Mismatch breakdown for PB-LDH-0042 */}
                  {isDemoMismatch && (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-amber-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          <span>Potential Area Mismatch</span>
                        </span>
                        <span className="bg-amber-200 text-amber-900 border border-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Medium
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-amber-900 font-semibold">
                        RoR: 1,250 sqm · Cadastral Survey: 1,180 sqm (Diff: 70 sqm)
                      </div>
                      <p className="text-[10px] text-amber-800/80 leading-snug">
                        Automated checks provide decision support; authorized officials make final decisions.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-brick">Unable to load parcel profile.</div>
              )}
            </div>

            {/* Cryptographic Hash Chain Info Card */}
            <div className="bg-ink text-parchment p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-ochre font-mono text-xs font-bold uppercase">
                <Hash className="w-4 h-4" />
                <span>Tamper-Evident SHA-256 Ledger</span>
              </div>
              <p className="text-[11px] text-parchment/80 leading-relaxed">
                Every approved, rejected, or needs-review decision generates a cryptographic SHA-256 hash
                chained to previous mutation records in PostgreSQL.
              </p>
            </div>
          </div>

          {/* Right Column: Decision Form or Success Receipt */}
          <div className="lg:col-span-7 space-y-6">
            {submissionResult ? (
              /* Successful Submission Certificate */
              <div className="bg-parchment p-6 rounded-xl border-2 border-land shadow-md space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-land/20 text-land flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-ink">
                      Mutation Recorded
                    </h3>
                    <p className="text-xs text-ink/65">
                      Statutory determination recorded and sealed into PostgreSQL mutation registry.
                    </p>
                  </div>
                </div>

                <div className="bg-parchment-dark/40 p-4 rounded-lg border border-ink/15 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <span className="text-ink/60">Target Parcel (ULPID)</span>
                    <span className="font-mono font-bold text-ink">{selectedUlpid}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <span className="text-ink/60">Decision</span>
                    <span className="font-bold text-ochre-dark uppercase font-mono">{decision.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <span className="text-ink/60">Adjudicating Officer</span>
                    <span className="font-mono font-semibold text-ink">{officerId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/10">
                    <span className="text-ink/60">Timestamp</span>
                    <span className="font-mono text-ink">{submissionResult.timestamp}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-ink/60 text-[11px] mb-1">
                      <span>Audit Hash:</span>
                      <button
                        onClick={() => copyHash(submissionResult.audit_hash)}
                        className="text-ochre-dark hover:underline flex items-center gap-1 font-mono text-[10px]"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-land" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[11px] bg-ink/5 p-2 rounded border border-ink/15 break-all text-ink font-semibold">
                      {submissionResult.audit_hash}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSubmissionResult(null)}
                    className="bg-ink text-parchment px-4 py-2 rounded text-xs font-semibold hover:bg-ink-light"
                  >
                    Adjudicate Another Parcel
                  </button>
                  <Link
                    href={`/citizen/parcel/${selectedUlpid}`}
                    className="border border-ink/20 px-4 py-2 rounded text-xs font-semibold text-ink hover:bg-ink/5 flex items-center gap-1"
                  >
                    <span>View Updated Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Adjudication Form */
              <div className="bg-parchment p-6 rounded-xl plot-border-solid shadow-sm space-y-6">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-ochre-dark" />
                  <span>Statutory Adjudication Form</span>
                </h3>

                {errorMessage && (
                  <div className="p-3 bg-brick/10 border border-brick/30 rounded text-xs text-brick flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Decision Radio Selection */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">
                    1. Statutory Adjudication Decision:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "needs_review", label: "Needs Review", desc: "Field survey required", icon: Clock, border: "hover:border-ochre" },
                      { id: "approved", label: "Approve Mutation", desc: "Title transfer confirmed", icon: CheckCircle2, border: "hover:border-land" },
                      { id: "rejected", label: "Reject Mutation", desc: "Disputed claim", icon: XCircle, border: "hover:border-brick" },
                    ].map((opt) => {
                      const active = decision === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDecision(opt.id as typeof decision)}
                          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                            active
                              ? "bg-ink text-parchment border-ink shadow-sm"
                              : `bg-parchment border-ink/20 text-ink ${opt.border}`
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{opt.label}</span>
                            <Icon className="w-4 h-4 opacity-80" />
                          </div>
                          <span className={`text-[10px] ${active ? "text-parchment/70" : "text-ink/60"}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Officer ID Field */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    2. Adjudicating Officer Identifier:
                  </label>
                  <input
                    type="text"
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    className="w-full bg-parchment px-3 py-2 rounded border border-ink/20 font-mono text-xs text-ink focus:outline-none focus:border-ink"
                    placeholder="e.g. OFF-102"
                    required
                  />
                </div>

                {/* Notes Textarea */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    3. Official Verification Findings &amp; Notes:
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-parchment p-3 rounded border border-ink/20 text-xs text-ink focus:outline-none focus:border-ink leading-relaxed"
                    placeholder="Enter detailed reasons, field survey numbers, and reference documents…"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSubmitting || !isOfficer}
                    className={`w-full py-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                      !isOfficer
                        ? "bg-ink/30 text-ink/50 cursor-not-allowed"
                        : "bg-ink text-parchment hover:bg-ink-light"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recording Decision &amp; Sealing Hash…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-ochre" />
                        <span>Submit &amp; Record Mutation Decision</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-parchment rounded-xl p-6 max-w-md w-full border border-ink/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-ochre/20 text-ochre-dark">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-ink">
                  Confirm Mutation Decision
                </h4>
                <p className="text-xs text-ink/60">
                  Record statutory determination for <span className="font-mono font-bold text-ink">{selectedUlpid}</span>.
                </p>
              </div>
            </div>

            <div className="bg-parchment-dark/50 p-3 rounded text-xs space-y-1.5 border border-ink/10">
              <div>
                <strong>Decision:</strong> <span className="uppercase text-ochre-dark font-mono font-bold">{decision.replace("_", " ")}</span>
              </div>
              <div>
                <strong>Officer:</strong> <span className="font-mono">{officerId}</span>
              </div>
              <div>
                <strong>Notes:</strong> <span>{notes}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-ink/70 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-ink text-parchment px-5 py-2 rounded text-xs font-bold hover:bg-ink-light"
              >
                Confirm &amp; Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficerMutationsPage() {
  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <OfficerSidebar />
        <Suspense fallback={<div className="p-12 text-center text-xs font-mono">Loading Mutation Queue…</div>}>
          <MutationContent />
        </Suspense>
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 26014 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
