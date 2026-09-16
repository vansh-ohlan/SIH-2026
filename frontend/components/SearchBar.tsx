"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchParcels } from "@/lib/api";
import { SearchResult } from "@/lib/types";
import { Search, Loader2, ArrowRight } from "lucide-react";

export default function SearchBar({
  onResultFocus,
}: {
  onResultFocus?: (lat: number, lng: number) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchParcels(q);
      setResults(r);
      setLoading(false);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    onResultFocus?.(r.lat, r.lng);
    router.push(`/citizen/parcel/${r.ulpid}`);
  };

  const handleQuickChip = (val: string) => {
    setQ(val);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2.5 rounded-lg bg-parchment plot-border-solid px-3.5 py-2.5 shadow-sm focus-within:border-ink transition-colors">
        <Search className="w-4 h-4 text-ink/40 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          placeholder="Search ULPID or landowner (e.g. PB-LDH-0042 or Ramesh Kumar)"
          className="flex-1 bg-transparent font-sans text-xs sm:text-sm text-ink placeholder:text-ink/40 outline-none"
        />
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-ochre-dark shrink-0" />
        )}
      </div>

      {/* Quick Search Helper Chips */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-ink/60">
        <span className="font-medium">Quick Examples:</span>
        <button
          type="button"
          onClick={() => handleQuickChip("PB-LDH-0042")}
          className="bg-parchment hover:bg-ochre/20 border border-ink/20 hover:border-ochre text-ink px-2 py-0.5 rounded font-mono font-semibold transition-colors"
        >
          PB-LDH-0042
        </button>
        <button
          type="button"
          onClick={() => handleQuickChip("Ramesh Kumar")}
          className="bg-parchment hover:bg-ochre/20 border border-ink/20 hover:border-ochre text-ink px-2 py-0.5 rounded transition-colors"
        >
          Ramesh Kumar
        </button>
      </div>

      {/* Dropdown Results */}
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full plot-border-solid rounded-lg bg-parchment shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.ulpid}
              onClick={() => handleSelect(r)}
              className="flex w-full items-center justify-between border-b border-ink/10 px-4 py-2.5 text-left last:border-b-0 hover:bg-ochre/15 transition-colors"
            >
              <div>
                <div className="font-bold text-xs sm:text-sm text-ink">{r.name}</div>
                <div className="font-mono text-[11px] text-ochre-dark font-semibold">{r.ulpid}</div>
              </div>
              <span className="text-xs text-ink/60 flex items-center gap-1 font-semibold">
                <span>View Record</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {open && !loading && q.trim() && results.length === 0 && (
        <div className="absolute z-30 mt-1.5 w-full plot-border-solid rounded-lg bg-parchment px-4 py-3 text-xs text-ink/70 shadow-lg">
          No parcels found matching &ldquo;{q}&rdquo;. Try searching for <strong>PB-LDH-0042</strong> or <strong>Ramesh Kumar</strong>.
        </div>
      )}
    </div>
  );
}
