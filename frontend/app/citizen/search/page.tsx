"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { searchParcels } from "@/lib/api";
import { SearchResult } from "@/lib/types";
import { Search, MapPin, ArrowRight, Loader2, AlertCircle } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q) {
      setQuery(q);
      setLoading(true);
      searchParcels(q)
        .then((res) => setResults(res))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }
  }, [q]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    router.push(`/citizen/search?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <div className="font-mono text-xs text-ochre-dark font-semibold uppercase">
          LAND REGISTRY LOOKUP
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink mt-1">
          Parcel Search Results
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          Querying land registry and cadastral records across Punjab, Chandigarh &amp; Tamil Nadu.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-parchment-dark/50 p-4 rounded-xl plot-border-solid shadow-sm mb-8">
        <SearchBar
          onResultFocus={(lat, lng) => {
            // Handled in SearchBar
          }}
        />
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="p-12 text-center text-ink/60 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-ochre-dark" />
          <span className="text-xs font-mono">Searching Bhu-Setu Cadastral Registry…</span>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs font-mono text-ink/60">
            Found {results.length} matching parcel{results.length > 1 ? "s" : ""} for &quot;{q}&quot;:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r) => (
              <Link
                key={r.ulpid}
                href={`/citizen/parcel/${r.ulpid}`}
                className="bg-parchment p-5 rounded-lg plot-border hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-ink group-hover:text-ochre-dark transition-colors">
                      {r.ulpid}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink/5 border border-ink/10">
                      {r.lat.toFixed(3)}°N, {r.lng.toFixed(3)}°E
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                  <div className="text-xs text-ink/60 mt-0.5">
                    Registered Titleholder
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between text-xs text-ink/75 font-medium">
                  <span>View Cadastral Record &amp; Map</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : q ? (
        <div className="bg-parchment p-8 rounded-xl plot-border text-center text-ink/70">
          <AlertCircle className="w-8 h-8 text-ochre-dark mx-auto mb-2 opacity-80" />
          <h3 className="font-serif text-lg font-bold text-ink">No Parcels Found</h3>
          <p className="text-xs text-ink/60 mt-1 max-w-md mx-auto">
            No land parcels matched &quot;{q}&quot;. Try searching for demo ULPID <strong className="font-mono text-ink">PB-LDH-0042</strong> or owner name <strong className="text-ink">Ramesh</strong>.
          </p>
        </div>
      ) : (
        <div className="bg-parchment p-8 rounded-xl plot-border text-center text-ink/60 text-xs">
          Enter an owner name or ULPID in the search bar above to query records.
        </div>
      )}
    </div>
  );
}

export default function CitizenSearchPage() {
  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />
      <Suspense fallback={<div className="p-12 text-center text-xs font-mono">Loading Search…</div>}>
        <SearchContent />
      </Suspense>
      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}
