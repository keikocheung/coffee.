"use client";

import { useState } from "react";
import CafeAwning from "@/components/CafeAwning";

// ── Sign up free at formspree.io, create a form, paste your ID below ──────────
const FORMSPREE_ID = "mdawarqn";
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_TYPES = [
  { id: "feedback",  label: "feedback",          emoji: "💬" },
  { id: "creator",   label: "suggest a creator", emoji: "✨" },
  { id: "add",       label: "add my creation",   emoji: "🧶" },
  { id: "hi",        label: "just saying hi",    emoji: "👋" },
];

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [type, setType]       = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus]   = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, message }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#FEFEF0]">
      <CafeAwning size="small" tagline="let's chat." />

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Intro */}
        <h1
          className="text-3xl text-[#673F27] mb-3"
          style={{ fontFamily: "Quicksand, sans-serif", fontWeight: 600 }}
        >
          hi!
        </h1>
        <p
          className="text-[#673F27]/70 text-sm leading-relaxed mb-8"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          welcome to coffee (named after my cat)! i&apos;m keiko, and i love to
          crochet, and after spending way too many hours searching the web for
          patterns i actually liked, i built coffee a one-stop place for
          crocheters to discover different patterns!
          <br /><br />
          every pattern is linked to the original creator with full credit.
          support our favorite creators! (i've only added some creators here to start,
          but if you have a favorite crocheter you'd like to see, shoot me an message!)
          <br /><br />
          this is my first project so let me know what you think, or reach out
          if you&apos;d like your patterns added to the gallery. 
        </p>

        {status === "sent" ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: "rgba(105,175,215,0.1)", border: "1px solid rgba(105,175,215,0.3)" }}
          >
            <p className="text-2xl mb-2">☁️</p>
            <p className="text-[#673F27] font-semibold" style={{ fontFamily: "Quicksand, sans-serif" }}>
              message sent!
            </p>
            <p className="text-[#673F27]/60 text-sm mt-1" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              thanks for reaching out. i&apos;ll get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Sticky note type selector */}
            <div>
              <p
                className="text-xs text-[#673F27]/50 mb-3"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                what&apos;s this about?
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {NOTE_TYPES.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setType(n.id)}
                    className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl text-center transition-all duration-150"
                    style={{
                      backgroundColor: type === n.id ? "#69AFD7" : "rgba(103,63,39,0.05)",
                      border: `1.5px solid ${type === n.id ? "#69AFD7" : "rgba(103,63,39,0.12)"}`,
                      boxShadow: type === n.id ? "0 4px 12px rgba(105,175,215,0.35)" : "0 1px 4px rgba(103,63,39,0.06)",
                      transform: type === n.id ? "translateY(-2px)" : "none",
                    }}
                  >
                    <span className="text-xl">{n.emoji}</span>
                    <span
                      className="text-xs leading-tight"
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        color: type === n.id ? "#FEFEF0" : "rgba(103,63,39,0.7)",
                      }}
                    >
                      {n.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea — styled like a note */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1.5px solid #673F27",
                boxShadow: "0 2px 8px rgba(103,63,39,0.06)",
              }}
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="write your note here..."
                rows={6}
                required
                className="w-full bg-[#FEFEF0] text-[#673F27] text-sm px-5 py-4 resize-none outline-none placeholder-[#673F27]/30"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                something went wrong. try again?
              </p>
            )}

            <button
              type="submit"
              disabled={!type || !message.trim() || status === "sending"}
              className="self-start text-sm px-6 py-2.5 rounded-2xl transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#673F27", color: "#FEFEF0", fontFamily: "var(--font-inter), sans-serif" }}
            >
              {status === "sending" ? "sending..." : "send note →"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
