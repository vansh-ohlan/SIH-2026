"use client";

import { useEffect, useState } from "react";
import {
  getMapParcels,
  getParcel,
  getConflicts,
  postMutationDecision,
} from "@/lib/api";
import { QueuedConflict, MutationDecisionResponse } from "@/lib/types";
import ConflictBadge from "@/components/ConflictBadge";

type Decision = "approved" | "rejected" | "needs_review";

export default function MutationQueue() {
  const [queue, setQueue] = useState<QueuedConflict[] | null>(null);
  const [active, setActive] = useState<QueuedConflict | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<MutationDecisionResponse | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const geo = await getMapParcels();
      const items: QueuedConflict[] = [];
      for (const f of geo.features) {
        const [conflicts, parcel] = await Promise.all([
          getConflicts(f.properties.ulpid),
          getParcel(f.properties.ulpid),
        ]);
        conflicts.forEach((c) =>
          items.push({
            ...c,
            ulpid: f.properties.ulpid,
            owner: parcel?.owner.name ?? "Unknown",
          })
        );
      }
      const order = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => order[a.severity] - order[b.severity]);
      setQueue(items);
    })();
  }, []);

  async function submit(decision: Decision) {
    if (!active) return;
    setSubmitting(true);
    const res = await postMutationDecision(active.ulpid, {
      decision,
      officer_id: "OFF-102",
      notes: notes || `${decision} via officer dashboard`,
    });
    setSubmitting(false);
    setReceipt(res);
    setResolved((prev) => new Set(prev).add(`${active.ulpid}-${active.type}`));
  }

  function closeDrawer() {
    setActive(null);
    setNotes("");
    setReceipt(null);
  }

  if (queue === null) {
    return (
      <div className="py-16 text-center text-sm text-ink/50">
        Loading conflict queue…
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="plot-border bg-white/40 px-6 py-12 text-center">
        <p className="font-serif text-xl text-ink">Queue is clear</p>
        <p className="mt-1 text-sm text-ink/60">
          No parcels currently have flagged conflicts.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="plot-border divide-y divide-dashed divide-ink/20 bg-white/40">
        {queue.map((c) => {
          const key = `${c.ulpid}-${c.type}`;
          const done = resolved.has(key);
          return (
            <div
              key={key}
              className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${
                done ? "opacity-40" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink/50">
                    {c.ulpid}
                  </span>
                  <ConflictBadge severity={c.severity} />
                  {done && (
                    <span className="text-xs font-medium text-land">
                      Resolved
                    </span>
                  )}
                </div>
                <div className="mt-1 font-medium text-ink">{c.owner}</div>
                <p className="mt-0.5 max-w-xl truncate text-sm text-ink/60">
                  {c.description}
                </p>
              </div>
              <button
                disabled={done}
                onClick={() => setActive(c)}
                className="shrink-0 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-parchment transition hover:bg-ink-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review
              </button>
            </div>
          );
        })}
      </div>

      {/* Decision drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/40">
          <div className="w-full max-w-md overflow-y-auto bg-parchment shadow-2xl">
            <div className="plot-border-solid border-t-0 border-l-0 border-r-0 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs text-ink/50">
                    {active.ulpid}
                  </div>
                  <h3 className="mt-1 font-serif text-xl font-semibold text-ink">
                    {active.owner}
                  </h3>
                </div>
                <button
                  onClick={closeDrawer}
                  className="text-ink/50 hover:text-ink"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {!receipt ? (
                <>
                  <ConflictBadge severity={active.severity} />
                  <p className="mt-3 text-sm text-ink/80">
                    {active.description}
                  </p>

                  <label className="mt-6 block text-xs font-medium text-ink/60">
                    Officer notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Verified against original survey map…"
                    className="mt-1.5 w-full plot-border bg-white/60 p-3 text-sm text-ink outline-none placeholder:text-ink/35"
                  />

                  <div className="mt-6 flex flex-col gap-2.5">
                    <button
                      disabled={submitting}
                      onClick={() => submit("approved")}
                      className="rounded-sm bg-land px-4 py-2.5 text-sm font-medium text-parchment hover:bg-land-light disabled:opacity-50"
                    >
                      Approve mutation
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => submit("needs_review")}
                      className="rounded-sm bg-ochre px-4 py-2.5 text-sm font-medium text-ink hover:bg-ochre-light disabled:opacity-50"
                    >
                      Mark needs review
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => submit("rejected")}
                      className="rounded-sm border border-brick px-4 py-2.5 text-sm font-medium text-brick hover:bg-brick/10 disabled:opacity-50"
                    >
                      Reject mutation
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <p className="font-serif text-lg font-semibold text-land">
                    Decision recorded
                  </p>
                  <div className="mt-4 space-y-2 font-mono text-xs text-ink/70">
                    <div>status: {receipt.status}</div>
                    <div className="break-all">
                      audit_hash: {receipt.audit_hash}
                    </div>
                    <div>timestamp: {receipt.timestamp}</div>
                  </div>
                  <p className="mt-4 text-xs text-ink/50">
                    Chained to the previous audit hash for {active.ulpid} —
                    tamper-evident record complete.
                  </p>
                  <button
                    onClick={closeDrawer}
                    className="mt-6 w-full rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-parchment hover:bg-ink-light"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
