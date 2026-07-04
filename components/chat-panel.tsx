"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProposedAction } from "@/lib/tools";
import { usd } from "@/lib/format";

interface Msg {
  role: "user" | "assistant";
  text: string;
  toolCalls?: string[];
  actions?: ProposedAction[];
}

interface QueuedAction extends ProposedAction {
  status: "queued" | "dismissed";
}

const SUGGESTIONS = [
  "What should I kill today?",
  "Give me my morning briefing",
  "Why is Medicare CPA rising?",
  "Draft refresh creatives for the fatigued solar ad",
];

const TOOL_LABELS: Record<string, string> = {
  get_account_overview: "Reading account overview",
  list_campaigns: "Listing campaigns",
  get_campaign_detail: "Pulling campaign detail",
  detect_anomalies: "Running anomaly detection",
  propose_actions: "Drafting actions",
  get_creative_context: "Reading live creatives",
  generate_briefing: "Compiling briefing data",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, queue]);

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || busy) return;
      setBusy(true);
      setInput("");
      const history = [...messages, { role: "user" as const, text: prompt }];
      setMessages([...history, { role: "assistant", text: "", toolCalls: [] }]);

      const patchLast = (fn: (m: Msg) => Msg) =>
        setMessages((cur) => [...cur.slice(0, -1), fn(cur[cur.length - 1])]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, text }) => ({ role, text })),
          }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => null);
          patchLast((m) => ({
            ...m,
            text: err?.error ?? `Request failed (${res.status}).`,
          }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let ev: { t: string; v?: unknown; name?: string };
            try {
              ev = JSON.parse(line);
            } catch {
              continue;
            }
            if (ev.t === "text") {
              patchLast((m) => ({ ...m, text: m.text + (ev.v as string) }));
            } else if (ev.t === "tool_start" && ev.name) {
              const label = TOOL_LABELS[ev.name] ?? ev.name;
              patchLast((m) => ({
                ...m,
                toolCalls: [...(m.toolCalls ?? []), label],
              }));
            } else if (ev.t === "actions") {
              patchLast((m) => ({ ...m, actions: ev.v as ProposedAction[] }));
            } else if (ev.t === "error") {
              patchLast((m) => ({ ...m, text: m.text + `\n\n⚠️ ${ev.v}` }));
            }
          }
        }
      } catch {
        patchLast((m) => ({ ...m, text: m.text || "Connection lost — try again." }));
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const approve = (a: ProposedAction) =>
    setQueue((q) =>
      q.some((x) => x.id === a.id) ? q : [...q, { ...a, status: "queued" }],
    );

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-[#0d1420]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <span className="text-sm font-semibold text-slate-100">Copilot</span>
          <span className="ml-2 text-xs text-slate-500">Claude + live account tools</span>
        </div>
        {queue.length > 0 && (
          <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400">
            {queue.filter((q) => q.status === "queued").length} queued
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-400">
              Ask about performance, anomalies, or what to do next. The agent reads
              the same data as this dashboard and proposes actions for your approval
              — it never touches spend on its own.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="ml-8 rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-100">
                {m.text}
              </div>
            ) : (
              <div className="space-y-2">
                {(m.toolCalls?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    {m.toolCalls!.map((t, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-xs text-sky-500/80">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80" />
                        {t}
                      </div>
                    ))}
                  </div>
                )}
                {m.text ? (
                  <div className="chat-md text-sm leading-relaxed text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                ) : (
                  busy && i === messages.length - 1 && (
                    <div className="text-sm text-slate-500">Thinking…</div>
                  )
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {m.actions.map((a) => {
                      const queued = queue.some((x) => x.id === a.id);
                      return (
                        <div
                          key={a.id}
                          className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-medium text-slate-200">{a.label}</div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {a.platform} · ~{usd(a.estDailyImpactUsd)}/day at stake
                              </div>
                            </div>
                            <button
                              onClick={() => approve(a)}
                              disabled={queued}
                              className={
                                queued
                                  ? "rounded-md bg-emerald-950 px-2.5 py-1 text-xs text-emerald-400"
                                  : "rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
                              }
                            >
                              {queued ? "✓ Queued" : "Approve"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {queue.length > 0 && (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
            <div className="text-xs font-semibold text-emerald-400">
              Execution queue (simulated)
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              In production these approved actions would be dispatched to the platform
              APIs (Meta / Google / Taboola / TikTok). This demo stops at the approval
              boundary by design — an agent should never spend money unattended.
            </p>
            <ul className="mt-2 space-y-1">
              {queue.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-500">✓</span> {a.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-slate-800 p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? "Working…" : "Ask your copilot…"}
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-600 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
