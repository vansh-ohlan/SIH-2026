"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ConflictBadge from "@/components/ConflictBadge";
import { getParcel, getConflicts } from "@/lib/api";
import { Parcel, Conflict, LedgerReceipt } from "@/lib/types";

export default function ParcelDetail({
  params,
}: {
  params: { ulpid: string };
}) {
  const { ulpid } = params;
  const [parcel, setParcel] = useState<Parcel | null | undefined>(undefined);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  useEffect(() => {
    getParcel(ulpid).then(setParcel);
    getConflicts(ulpid).then(setConflicts);
  }, [ulpid]);

  if (parcel === undefined) {
    return (
      <main className="min-h-screen bg-parchment">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center text-ink/50">
          Retrieving record for{" "}
          <span className="font-mono">{ulpid}</span>…
        </div>
      </main>
    );
  }

  if (parcel === null) {
    return (
      <main className="min-h-screen bg-parchment">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="font-serif text-2xl text-ink">No parcel found</p>
          <p className="mt-2 text-sm text-ink/60">
            There is no record for ULPID{" "}
            <span className="font-mono">{ulpid}</span>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-ochre-dark"
          >
            ← Back to search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          ← Back to map
        </Link>

        {/* ============================================================ */}
        {/* HEADER: Owner Identity + Conflict Status                      */}
        {/* ============================================================ */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-ink/50">{parcel.ulpid}</div>
            <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">
              {parcel.owner.name}
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Owner since {formatDate(parcel.owner.since)} · {parcel.land_use}
            </p>
          </div>

          {conflicts.length > 0 ? (
            <div className="flex flex-col items-end gap-1.5">
              {conflicts.map((c, i) => (
                <ConflictBadge key={i} severity={c.severity} />
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-land/40 bg-land/10 px-2.5 py-0.5 text-xs font-medium text-land">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              No conflicts flagged
            </span>
          )}
        </div>

        {/* ============================================================ */}
        {/* KEY FACTS GRID                                                */}
        {/* ============================================================ */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden plot-border sm:grid-cols-4">
          <Fact label="Area" value={`${parcel.area_sqm.toLocaleString()} sqm`} />
          <Fact label="Land use" value={parcel.land_use} />
          <Fact
            label="Tax status"
            value={parcel.tax_status.paid ? "Paid" : "Dues pending"}
            accent={parcel.tax_status.paid ? "land" : "brick"}
          />
          <Fact
            label="Dues"
            value={
              parcel.tax_status.dues > 0
                ? `₹${parcel.tax_status.dues.toLocaleString()}`
                : "₹0"
            }
          />
        </div>

        {/* ============================================================ */}
        {/* FISCAL VALUATION BAND CARD                                    */}
        {/* ============================================================ */}
        {(parcel.valuation_band || parcel.rate_per_sqm) && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Fiscal Valuation Profile
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-px plot-border overflow-hidden sm:grid-cols-3">
              {parcel.valuation_band && (
                <div className="bg-parchment px-4 py-5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    Valuation Band
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{
                        background: parcel.valuation_band.includes("A")
                          ? "#14213D"
                          : parcel.valuation_band.includes("B")
                          ? "#C08A28"
                          : "#8F6518",
                      }}
                    />
                    <span className="font-serif text-base font-semibold text-ink">
                      {parcel.valuation_band}
                    </span>
                  </div>
                </div>
              )}
              {parcel.rate_per_sqm && (
                <div className="bg-parchment px-4 py-5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    Circle Rate
                  </div>
                  <div className="mt-2 font-serif text-lg font-semibold text-ink">
                    ₹{parcel.rate_per_sqm.toLocaleString()}
                    <span className="text-sm font-normal text-ink/60"> / sqm</span>
                  </div>
                </div>
              )}
              {parcel.rate_per_sqm && (
                <div className="bg-parchment px-4 py-5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    Indicative Market Value
                  </div>
                  <div className="mt-2 font-serif text-lg font-semibold text-ink">
                    ₹{(parcel.rate_per_sqm * parcel.area_sqm).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* CONFLICTS DETAIL                                              */}
        {/* ============================================================ */}
        {conflicts.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Flagged conflicts
            </h2>
            <div className="mt-3 space-y-3">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="plot-border bg-white/40 p-4 text-sm text-ink/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-ink/50">
                      {c.type}
                    </span>
                    <ConflictBadge severity={c.severity} />
                  </div>
                  <p className="mt-2">{c.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* MUTATION HISTORY TIMELINE                                     */}
        {/* ============================================================ */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Mutation history
          </h2>
          <div className="mt-4 tick-ruler border-l-2 border-ink/15 pl-6">
            {parcel.mutations.map((m, i) => (
              <div key={i} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ochre bg-parchment" />
                <div className="font-mono text-xs text-ink/50">
                  {formatDate(m.date)}
                </div>
                <div className="mt-0.5 font-medium text-ink">{m.type}</div>
                <div className="text-sm text-ink/60">
                  {m.from} → {m.to}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* IMMUTABLE PUBLIC LEDGER RECEIPT CERTIFICATE                  */}
        {/* ============================================================ */}
        {parcel.ledger_receipt && (
          <LedgerCertificate
            receipt={parcel.ledger_receipt}
            ulpid={parcel.ulpid}
            owner={parcel.owner.name}
          />
        )}
      </div>
    </main>
  );
}

// ============================================================
// LEDGER CERTIFICATE COMPONENT
// ============================================================
function LedgerCertificate({
  receipt,
  ulpid,
  owner,
}: {
  receipt: LedgerReceipt;
  ulpid: string;
  owner: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isVerified = receipt.verification_status === "verified_immutable";

  return (
    <section className="mt-12 mb-6" id="ledger-certificate">
      {/* Section header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Immutable Public Ledger Receipt
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
            isVerified
              ? "border-land/40 bg-land/10 text-land"
              : "border-ochre/40 bg-ochre/10 text-ochre-dark"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {isVerified ? "SHA-256 Verified · Tamper-Evident" : "Audit Pending"}
        </span>
      </div>

      {/* Certificate card — styled as an official surveyor document */}
      <div className="relative overflow-hidden rounded-sm border-2 border-ink/20 bg-gradient-to-b from-parchment to-parchment-dark/30 shadow-[6px_6px_0_rgba(20,33,61,0.12)] print:shadow-none">

        {/* Watermark diagonal text */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden"
        >
          <span className="rotate-[-28deg] font-serif text-[88px] font-black text-ink/[0.04] whitespace-nowrap leading-none">
            BHU-SETU VERIFIED
          </span>
        </div>

        {/* Certificate header band */}
        <div className="flex items-center justify-between border-b border-ink/15 bg-ink/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/30 bg-parchment text-2xl select-none">
              ⛭
            </div>
            <div>
              <p className="font-serif text-base font-bold text-ink leading-tight">
                Government of India · Bhu-Setu
              </p>
              <p className="text-[11px] text-ink/55">
                National Land Records Digitisation Programme
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-ink/50 uppercase tracking-wider">
              Certificate ID
            </div>
            <div className="font-mono text-xs font-bold text-ink break-all max-w-[200px]">
              {receipt.certificate_id}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Subject row */}
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-dashed border-ink/15 pb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink/45">ULPID</span>
              <p className="font-mono text-sm font-bold text-ink">{ulpid}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink/45">
                Registered Owner
              </span>
              <p className="font-medium text-sm text-ink">{owner}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink/45">
                Jurisdiction
              </span>
              <p className="text-sm text-ink">{receipt.jurisdiction}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink/45">
                Signing Authority
              </span>
              <p className="text-sm text-ink">{receipt.signing_authority}</p>
            </div>
          </div>

          {/* Blockchain metadata grid */}
          <div>
            <p className="mb-2.5 text-[10px] font-mono uppercase tracking-wider text-ink/45">
              Distributed Ledger · Audit Block Metadata
            </p>
            <div className="grid grid-cols-2 gap-px rounded-sm overflow-hidden border border-ink/15">
              <HashField
                label="Block Number"
                value={`#${receipt.block_number.toLocaleString()}`}
                mono
              />
              <HashField
                label="Timestamp (UTC)"
                value={new Date(receipt.timestamp).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "long",
                })}
                mono
              />
              <HashField
                label="Current Block Hash (SHA-256)"
                value={receipt.block_hash}
                mono
                truncate
                onCopy={() => handleCopy(receipt.block_hash)}
              />
              <HashField
                label="Previous Block Hash"
                value={receipt.previous_hash}
                mono
                truncate
                onCopy={() => handleCopy(receipt.previous_hash)}
              />
              <HashField
                label="Merkle Root"
                value={receipt.merkle_root}
                mono
                truncate
                onCopy={() => handleCopy(receipt.merkle_root)}
                className="col-span-2"
              />
            </div>
          </div>

          {/* Verification status banner */}
          <div
            className={`flex items-start gap-3 rounded-sm p-3.5 border ${
              isVerified
                ? "bg-land/5 border-land/25"
                : "bg-ochre/5 border-ochre/25"
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5">{isVerified ? "🔒" : "⏳"}</span>
            <div>
              <p
                className={`text-sm font-semibold ${
                  isVerified ? "text-land" : "text-ochre-dark"
                }`}
              >
                {isVerified
                  ? "Record Verified Immutable — Tamper-Evident Entry Confirmed"
                  : "Audit Pending — Record Under Verification"}
              </p>
              <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                {isVerified
                  ? "This SHA-256 audit block is permanently sealed in the national land records distributed ledger. Any modification will invalidate the block hash chain and trigger automatic Revenue Officer notification."
                  : "This record is pending review by the Revenue Officer. Do not treat as a final or legally binding document."}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 bg-ink/5 px-6 py-3 text-[10px] text-ink/45 font-mono">
          <span>
            Sealed:{" "}
            {new Date(receipt.timestamp).toLocaleDateString("en-IN", {
              dateStyle: "long",
            })}
          </span>
          <span className="uppercase tracking-wider hidden sm:block">
            Bhu-Setu · Digital Land Record
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded border border-ink/20 bg-parchment px-2.5 py-1 text-ink/60 hover:text-ink hover:border-ink/40 transition text-[10px] font-mono"
          >
            🖨 Print Certificate
          </button>
        </div>
      </div>

      {copied && (
        <div className="mt-2 text-xs text-land font-medium">
          ✓ Hash copied to clipboard
        </div>
      )}
    </section>
  );
}

// ============================================================
// HASH FIELD SUB-COMPONENT
// ============================================================
function HashField({
  label,
  value,
  mono,
  truncate,
  onCopy,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  onCopy?: () => void;
  className?: string;
}) {
  return (
    <div className={`bg-parchment px-4 py-3 ${className}`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-ink/45 mb-1">
        {label}
      </div>
      <div
        className={`flex items-center gap-2 ${mono ? "font-mono" : ""} text-xs text-ink`}
      >
        <span className={truncate ? "truncate block max-w-[90%]" : ""}>
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            title="Copy hash to clipboard"
            className="shrink-0 text-ink/35 hover:text-ink transition text-sm leading-none"
          >
            ⧉
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FACT CARD SUB-COMPONENT
// ============================================================
function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "land" | "brick";
}) {
  return (
    <div className="bg-parchment px-4 py-5">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div
        className={`mt-1 font-serif text-lg font-semibold ${
          accent === "land"
            ? "text-land"
            : accent === "brick"
              ? "text-brick"
              : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// DATE FORMATTER
// ============================================================
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

