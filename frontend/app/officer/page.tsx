"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import MutationQueue from "@/components/MutationQueue";
import OcrUpload from "@/components/OcrUpload";

export default function OfficerDashboard() {
  const [activeTab, setActiveTab] = useState<"queue" | "ocr">("queue");

  return (
    <main className="min-h-screen bg-parchment">
      <Navbar />

      <section className="border-b border-ink/10 bg-ink text-parchment">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-parchment/50">
                OFF-102 · Revenue Officer Jurisdiction
              </div>
              <h1 className="mt-1 font-serif text-3xl font-semibold">
                Revenue Officer Workspace
              </h1>
              <p className="mt-2 max-w-xl text-sm text-parchment/70">
                Adjudicate flagged land conflicts, reconcile boundary variances,
                or ingest new physical RoR deeds into the tamper-evident cadastre.
              </p>
            </div>

            {/* Navigation Switch */}
            <div className="flex rounded-sm bg-white/10 p-1 border border-parchment/20">
              <button
                onClick={() => setActiveTab("queue")}
                className={`rounded px-4 py-2 text-xs font-medium transition ${
                  activeTab === "queue"
                    ? "bg-ochre text-ink font-bold shadow"
                    : "text-parchment/75 hover:text-parchment hover:bg-white/5"
                }`}
              >
                ⚖️ Conflict &amp; Mutation Queue
              </button>
              <button
                onClick={() => setActiveTab("ocr")}
                className={`rounded px-4 py-2 text-xs font-medium transition ${
                  activeTab === "ocr"
                    ? "bg-ochre text-ink font-bold shadow"
                    : "text-parchment/75 hover:text-parchment hover:bg-white/5"
                }`}
              >
                📄 Digitize Paper Deed (AI OCR)
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {activeTab === "queue" ? (
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-xl font-semibold text-ink">
                Priority Adjudication Queue
              </h2>
              <p className="text-xs text-ink/60">
                Parcels flagged by automated reconciliation, ordered by severity.
                Submitting any decision records a chained SHA-256 audit hash.
              </p>
            </div>
            <MutationQueue />
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-xl font-semibold text-ink">
                Physical Record Digitization Desk
              </h2>
              <p className="text-xs text-ink/60">
                Ingest legacy physical Jamabandi, Patta, or Sale Deeds. Verified
                data is hashed and automatically linked to GIS cadastral parcels.
              </p>
            </div>
            <OcrUpload onVerificationComplete={() => setActiveTab("queue")} />
          </div>
        )}
      </section>
    </main>
  );
}
