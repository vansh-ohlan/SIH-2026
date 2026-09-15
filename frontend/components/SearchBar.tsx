"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchParcels } from "@/lib/api";
import { SearchResult } from "@/lib/types";

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
    }, 250);
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

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-3 rounded-sm bg-parchment plot-border px-4 py-3 shadow-[3px_3px_0_rgba(20,33,61,0.12)]">
        <span className="font-mono text-xs text-ink/50">ULPID / OWNER</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          placeholder="Search “Ramesh Kumar” or “PB-LDH-0042”"
          className="flex-1 bg-transparent font-sans text-ink placeholder:text-ink/40 outline-none"
        />
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full plot-border-solid bg-parchment shadow-[4px_4px_0_rgba(20,33,61,0.15)]">
          {results.map((r) => (
            <button
              key={r.ulpid}
              onClick={() => {
                setOpen(false);
                onResultFocus?.(r.lat, r.lng);
                router.push(`/parcel/${r.ulpid}`);
              }}
              className="flex w-full items-center justify-between border-b border-ink/10 px-4 py-3 text-left last:border-b-0 hover:bg-ochre/10"
            >
              <div>
                <div className="font-medium text-ink">{r.name}</div>
                <div className="font-mono text-xs text-ink/50">{r.ulpid}</div>
              </div>
              <span className="text-xs text-ochre-dark">View →</span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && q.trim() && results.length === 0 && (
        <div className="absolute z-30 mt-2 w-full plot-border-solid bg-parchment px-4 py-3 text-sm text-ink/60 shadow-[4px_4px_0_rgba(20,33,61,0.15)]">
          No parcels match “{q}”.
        </div>
      )}
    </div>
  );
}
