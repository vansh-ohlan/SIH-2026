"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import {
  processAssistantQuery,
  AssistantResponse,
  AssistantAction,
} from "@/lib/assistant/assistantEngine";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  MapPin,
  Layers,
  ShieldAlert,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sourceContext?: string;
  provenanceType?: string;
  actions?: AssistantAction[];
  suggestedFollowups?: string[];
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  "Show me information about PB-LDH-0042",
  "Why is PB-LDH-0042 flagged?",
  "What is ULPID?",
  "What is the difference between RoR and cadastral GIS?",
  "What does a 70 sqm area mismatch mean?",
  "How does parcel reconciliation work?",
  "What is a mutation?",
  "What happens when OCR confidence is low?",
  "What does the land risk score represent?",
  "What should an officer verify before approving a mutation?",
];

export default function AssistantChat({ initialParcel }: { initialParcel?: string }) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize initial greeting
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: "msg-init",
      sender: "assistant",
      text: `### Welcome to the Bhu-Setu Land Assistant
I can help you inspect **cadastral parcel records**, explain **spatial area discrepancies**, guide **multi-source reconciliation**, and answer **land governance** questions.

**How can I assist you today?**
- You can ask about test parcels like **\`PB-LDH-0042\`**, **\`PB-LDH-0044\`**, or **\`CH-SEC-1701\`**.
- You can ask why records are flagged, how mutations are audited with SHA-256, or what statutory checks are required.`,
      sourceContext: "Bhu-Setu AI Knowledge Base · Decision Support",
      provenanceType: "general_knowledge",
      suggestedFollowups: [
        initialParcel ? `Tell me about ${initialParcel}` : "Show me information about PB-LDH-0042",
        "Why is PB-LDH-0042 flagged?",
        "What is ULPID?",
        "How does parcel reconciliation work?",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([welcomeMessage]);
  }, [initialParcel]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      // Artificial slight delay for realistic assistant feel
      const [assistantResp] = await Promise.all([
        processAssistantQuery(textToSend, role, initialParcel),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);

      const assistantMsg: ChatMessage = {
        id: assistantResp.id,
        sender: "assistant",
        text: assistantResp.text,
        sourceContext: assistantResp.sourceContext,
        provenanceType: assistantResp.provenanceType,
        actions: assistantResp.actions,
        suggestedFollowups: assistantResp.suggestedFollowups,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "An error occurred while querying the land knowledge engine. Please try again.",
        sourceContext: "Error Recovery",
        provenanceType: "demo_notice",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
    const resetMsg: ChatMessage = {
      id: `reset-${Date.now()}`,
      sender: "assistant",
      text: "Conversation cleared. Ask a new question about any land parcel or governance concept.",
      sourceContext: "Bhu-Setu Assistant Ready",
      provenanceType: "general_knowledge",
      suggestedFollowups: DEFAULT_SUGGESTIONS.slice(0, 4),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([resetMsg]);
  };

  const renderActionIcon = (type?: string) => {
    switch (type) {
      case "parcel":
        return <MapPin className="w-3.5 h-3.5" />;
      case "map":
        return <Layers className="w-3.5 h-3.5" />;
      case "conflict":
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case "mutation":
        return <FileCheck2 className="w-3.5 h-3.5" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[82vh] bg-parchment rounded-xl plot-border-solid shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-parchment-dark/70 border-b border-ink/15 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink text-parchment flex items-center justify-center font-bold text-sm shadow-xs">
            <Bot className="w-5 h-5 text-ochre-light" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base sm:text-lg font-bold text-ink">
                Bhu-Setu Land Assistant
              </h2>
              <span className="bg-ochre/20 text-ochre-dark border border-ochre/30 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                Prototype / Decision Support
              </span>
            </div>
            <div className="text-[11px] text-ink/65 hidden sm:block">
              Land records • Cadastral GIS • Registration • Mutations • Governance workflows
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-1.5 text-ink/60 hover:text-brick hover:bg-brick/10 rounded-md transition-colors text-xs flex items-center gap-1 border border-ink/10"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips (Always scannable at top) */}
      <div className="bg-parchment-dark/30 border-b border-ink/10 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
          <span className="text-[10px] font-mono uppercase text-ink/50 font-bold flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-ochre-dark" />
            <span>Suggested:</span>
          </span>
          {DEFAULT_SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug)}
              className="bg-parchment hover:bg-ink hover:text-parchment text-ink/80 border border-ink/15 px-2.5 py-1 rounded text-[11px] font-medium transition-all shadow-2xs shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs sm:text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Message Bubble Container */}
            <div
              className={`max-w-3xl rounded-xl p-4 sm:p-5 shadow-2xs space-y-2 ${
                msg.sender === "user"
                  ? "bg-ink text-parchment rounded-br-none"
                  : "bg-parchment-dark/40 border border-ink/15 text-ink rounded-bl-none"
              }`}
            >
              {/* Header inside assistant message: Source & Provenance Badge */}
              {msg.sender === "assistant" && msg.sourceContext && (
                <div className="flex items-center justify-between border-b border-ink/10 pb-2 text-[10px] font-mono text-ink/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0" />
                    <span className="font-semibold text-ink/80 truncate">{msg.sourceContext}</span>
                  </div>
                  <span className="text-ink/40 shrink-0">{msg.timestamp}</span>
                </div>
              )}

              {/* Message Body (Markdown rendered) */}
              <div className="prose prose-xs max-w-none text-current leading-relaxed space-y-2">
                <MarkdownRenderer content={msg.text} isUser={msg.sender === "user"} />
              </div>

              {/* Contextual Action Buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="pt-3 border-t border-ink/10 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-ink/60 font-semibold block w-full mb-0.5">
                    Contextual Actions:
                  </span>
                  {msg.actions.map((act, aIdx) => (
                    <Link
                      key={aIdx}
                      href={act.href}
                      className="inline-flex items-center gap-1.5 bg-ink text-parchment hover:bg-ink-light px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs"
                    >
                      {renderActionIcon(act.iconType)}
                      <span>{act.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Copy message button */}
              {msg.sender === "assistant" && (
                <div className="pt-2 flex items-center justify-between text-[10px] text-ink/50 border-t border-ink/5">
                  <span>Bhu-Setu Grounded Assistant Engine</span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-ink flex items-center gap-1 transition-colors"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-land" />
                        <span className="text-land font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Suggested Followups */}
            {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-2 max-w-3xl">
                <span className="text-[10px] font-mono text-ink/50 uppercase font-semibold">Follow-up:</span>
                {msg.suggestedFollowups.map((fUp, fIdx) => (
                  <button
                    key={fIdx}
                    onClick={() => handleSend(fUp)}
                    className="text-[11px] bg-parchment hover:bg-ochre/20 text-ochre-dark border border-ochre/30 px-2 py-0.5 rounded font-medium transition-colors"
                  >
                    {fUp} →
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-ink/60 bg-parchment-dark/30 border border-ink/10 p-3 rounded-xl max-w-xs animate-pulse font-mono text-xs">
            <Bot className="w-4 h-4 text-ochre-dark" />
            <span>Consulting Cadastral Database &amp; PostGIS…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-parchment-dark/60 border-t border-ink/15 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about a parcel (e.g. PB-LDH-0042), area mismatch, mutation, GIS..."
            disabled={isLoading}
            className="flex-1 bg-parchment px-4 py-2.5 rounded-lg border border-ink/25 text-xs sm:text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors disabled:opacity-50 font-sans"
            aria-label="Assistant question input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="bg-ink text-parchment hover:bg-ink-light disabled:opacity-40 px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <div className="mt-1.5 text-[10px] text-ink/50 text-center font-mono">
          Deterministic Decision Support · Verified against PostGIS EPSG:4326 Cadastre
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight formatting helper for structured assistant answers
 */
function MarkdownRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className={`font-serif text-sm sm:text-base font-bold mt-2 mb-1 ${
                isUser ? "text-parchment" : "text-ink"
              }`}
            >
              {trimmed.replace("### ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4
              key={idx}
              className={`font-serif text-xs sm:text-sm font-bold mt-1.5 mb-0.5 ${
                isUser ? "text-parchment/90" : "text-ink/90"
              }`}
            >
              {trimmed.replace("#### ", "")}
            </h4>
          );
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-md border-l-2 text-xs italic my-1.5 ${
                isUser
                  ? "bg-ink-light/50 border-ochre-light text-parchment/90"
                  : "bg-parchment border-ochre text-ink/80"
              }`}
            >
              {trimmed.replace("> ", "")}
            </div>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-xs sm:text-sm">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isUser ? "bg-ochre" : "bg-ochre-dark"}`} />
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(itemText) }} />
            </div>
          );
        }

        // Ordered lists (1. , 2. )
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-xs sm:text-sm">
              <span className="font-mono font-bold text-xs shrink-0 text-ochre-dark">
                {trimmed.match(/^\d+\./)?.[0]}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatInlineMarkdown(trimmed.replace(/^\d+\.\s*/, "")),
                }}
              />
            </div>
          );
        }

        // Table lines
        if (trimmed.startsWith("|")) {
          return (
            <div
              key={idx}
              className="font-mono text-[11px] overflow-x-auto py-0.5"
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
            />
          );
        }

        // Normal paragraph text
        return (
          <p
            key={idx}
            className="text-xs sm:text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
          />
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-ink/10 px-1 py-0.2 rounded font-mono text-[11px]'>$1</code>");
}
