"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Bot } from "lucide-react";

export default function AssistantFloatingButton() {
  const pathname = usePathname();

  // Hide on the assistant page itself
  if (pathname === "/assistant") {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <Link
        href="/assistant"
        className="flex items-center gap-2 bg-ink text-parchment hover:bg-ink-light px-3.5 py-2.5 rounded-full shadow-lg border border-ochre/40 transition-all hover:scale-105 group font-sans text-xs font-semibold"
        title="Bhu-Setu Land Assistant"
        aria-label="Open Bhu-Setu Land Assistant"
      >
        <div className="w-5 h-5 rounded-full bg-ochre/20 flex items-center justify-center text-ochre-light group-hover:rotate-12 transition-transform">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="tracking-tight hidden sm:inline">Land Assistant</span>
        <span className="bg-ochre-dark text-parchment text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase">
          AI
        </span>
      </Link>
    </div>
  );
}
