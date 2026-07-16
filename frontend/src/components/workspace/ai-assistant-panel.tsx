"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { searchService } from "@/services/search.service";

function formatContent(text: string) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");
}

export function AIAssistantPanel({ patentCount, analysisId }: { patentCount: number; analysisId?: string }) {
  const params = useParams<{ id: string }>();
  const activeId = analysisId || params?.id || "";
  
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      content:
        `I'm your RAG Research Assistant, ready to answer questions about the ${patentCount} prior art patents retrieved for your query molecule. Ask me about Markush boundaries, specific claims, or chemical similarities!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function handleSend() {
    if (!input.trim() || thinking) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    const query = input;
    setInput("");
    setThinking(true);

    try {
      if (activeId) {
        const response = await searchService.askResearchAssistant(activeId, query, messages.slice(-6));
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.answer,
            citations: response.citations?.map((c, idx) => ({
              patentId: `p-${idx}`,
              patentNumber: c.patentNumber || "Patent",
              claimNumber: c.claimNumber || 1
            })) || []
          },
        ]);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Please select an active analysis workspace to query specific retrieved patent claims using our RAG vector retrieval engine.",
          },
        ]);
      }
    } catch (err) {
      console.error("RAG query failed:", err);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I encountered a temporary connection error while querying the vector database. Please try asking your question again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }


  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-overlay transition-transform hover:scale-[1.03]",
          open && "hidden"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>Ask AI</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 flex h-[460px] sm:h-[520px] w-full sm:w-[380px] max-w-[100vw] flex-col rounded-t-xl sm:rounded-xl border border-border bg-surface-raised shadow-overlay"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> Research Assistant
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-text-tertiary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-[11px] text-text-tertiary text-center">
                Answering from {patentCount} retrieved patents
              </p>
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                      m.role === "user"
                        ? "bg-primary/15 text-text-primary"
                        : "bg-surface border border-border text-text-primary"
                    )}
                  >
                    {formatContent(m.content)}
                    {m.citations && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.citations.map((c, i) => (
                          <span
                            key={i}
                            className="rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
                          >
                            {c.patentNumber} {c.claimNumber ? `· Claim ${c.claimNumber}` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reasoning over retrieved patents…
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question about these patents…"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <button
                onClick={handleSend}
                aria-label="Send message"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
