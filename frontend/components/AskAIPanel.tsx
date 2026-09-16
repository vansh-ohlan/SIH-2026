// frontend/components/AskAIPanel.tsx
"use client";

import { useState } from "react";
import { askParcelAI } from "@/lib/api";
import type { AIResponse } from "@/lib/types";

interface AskAIPanelProps {
  ulpid: string;
  onClose?: () => void;
}

const SUGGESTED_QUERIES = [
  "What is the area of this parcel?",
  "Who owns this parcel?",
  "Is there any issue with this parcel?",
  "What is the land use?",
  "Can I build a commercial property here?",
  "Tell me everything important about this parcel.",
];

export default function AskAIPanel({ ulpid, onClose }: AskAIPanelProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (queryText?: string) => {
    const targetQuery = typeof queryText === "string" ? queryText : question;
    const textToAsk = targetQuery.trim();
    if (!textToAsk) return;

    if (typeof queryText === "string") {
      setQuestion(queryText);
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await askParcelAI(ulpid, textToAsk);
      setResponse(resp);
    } catch {
      setError("Failed to contact decision-support AI service.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: AIResponse["status"], availability?: string) => {
    if (availability === "unavailable") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[11px] font-semibold">
          <span>⚠</span> Data Unavailable
        </span>
      );
    }
    switch (status) {
      case "recommend":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-land/20 text-land border border-land/30 px-2 py-0.5 text-[11px] font-semibold">
            <span>✓</span> Verified / Clear
          </span>
        );
      case "attention":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[11px] font-semibold">
            <span>⚠</span> Advisory / Attention Required
          </span>
        );
      case "reject":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-brick/20 text-brick border border-brick/30 px-2 py-0.5 text-[11px] font-semibold">
            <span>✕</span> Restricted / Not Permitted
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[2000] p-4 animate-in fade-in duration-150">
      <div className="bg-parchment p-5 sm:p-6 rounded-lg plot-border-solid shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ink/15 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-ochre-dark uppercase">
                Parcel Intelligence Assistant
              </span>
              <span className="bg-ink/10 text-ink text-[10px] px-1.5 py-0.5 rounded font-mono">
                SIH 2026
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink mt-0.5">
              Querying <span className="font-mono text-ochre-dark">{ulpid}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:text-ink text-sm p-1 rounded hover:bg-ink/5 transition-colors"
            title="Close Assistant"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Form Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="overflow-y-auto py-3 space-y-3 flex-1 pr-1"
        >
          {/* Quick Prompts */}
          <div>
            <label className="text-[11px] font-mono text-ink/60 uppercase font-semibold block mb-1.5">
              Suggested Questions:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => handleAsk(sq)}
                  disabled={loading}
                  className="text-left text-[11px] bg-parchment-dark/70 hover:bg-parchment-dark text-ink/80 hover:text-ink px-2.5 py-1 rounded border border-ink/10 transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="text-[11px] font-mono text-ink/60 uppercase font-semibold block mb-1">
              Your Question:
            </label>
            <textarea
              className="w-full h-20 p-2.5 text-xs bg-parchment border border-ink/20 rounded focus:outline-none focus:ring-1 focus:ring-ink font-sans text-ink placeholder:text-ink/40"
              placeholder="Type your question about owner, area mismatch, taxes, commercial building…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
          </div>

          {error && (
            <div className="text-xs text-brick bg-brick/10 p-2 rounded border border-brick/20">
              {error}
            </div>
          )}

          {/* Structured AI Response Card */}
          {response && (
            <div className="rounded-md bg-parchment-dark/50 p-3.5 border border-ink/15 space-y-2 text-xs text-ink animate-in fade-in">
              <div className="flex items-center justify-between border-b border-ink/10 pb-1.5">
                <span className="font-mono text-[10px] text-ink/60 font-semibold uppercase flex items-center gap-1">
                  <span>⚙</span> Structured Advisory Response
                </span>
                {getStatusBadge(response.status, response.dataAvailability)}
              </div>

              {/* Main Reason / Details */}
              <div className="font-sans leading-relaxed text-ink/90 whitespace-pre-line text-xs font-medium">
                {response.reason}
              </div>

              {/* Alternative if present */}
              {response.alternative && (
                <div className="mt-1.5 pt-1.5 border-t border-ink/10 text-[11px]">
                  <span className="font-semibold text-ochre-dark">Alternative: </span>
                  <span className="text-ink/80">{response.alternative}</span>
                </div>
              )}

              {/* Required Approval if present */}
              {response.requiredApproval && (
                <div className="text-[11px]">
                  <span className="font-semibold text-ink">Required Approval: </span>
                  <span className="font-mono text-ink/80">{response.requiredApproval}</span>
                </div>
              )}

              {/* Footer Disclaimers */}
              <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] text-ink/50 font-mono">
                <span>Source: {response.source} (Deterministic Cadastral Rule Engine)</span>
                <span>Spatial Ref: EPSG:4326</span>
              </div>
              <p className="text-[10px] text-ink/40 italic leading-tight">
                📌 Advisory notice: This decision-support assistant provides automated spatial intelligence and does not constitute a statutory government order.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-ink/15 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-ink/70 hover:text-ink font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-4 py-1.5 bg-ochre text-parchment text-xs font-semibold rounded hover:bg-ochre/90 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? "Analyzing Parcel…" : "Ask Assistant →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
