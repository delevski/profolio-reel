"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { localizedPath } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type AgentLinkItem = { href: string; label: string };

type Message = {
  role: "user" | "assistant";
  content: string;
  links?: AgentLinkItem[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split reply text into plain segments and markdown links. */
function renderRichText(
  text: string,
  locale: "en" | "he",
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [, label, href] = match;
    if (href.endsWith(".pdf")) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent-2 underline decoration-accent-2/40 underline-offset-2 hover:decoration-accent-2"
        >
          {label}
        </a>
      );
    } else {
      nodes.push(
        <Link
          key={`${keyPrefix}-${i++}`}
          href={localizedPath(locale, href)}
          className="font-medium text-accent-2 underline decoration-accent-2/40 underline-offset-2 hover:decoration-accent-2"
        >
          {label}
        </Link>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function AgentAvatar({ state }: { state: "idle" | "thinking" | "speaking" }) {
  return (
    <div className="relative h-11 w-11 shrink-0">
      {state === "thinking" && (
        <span className="agent-ring absolute inset-0 rounded-2xl border-2 border-accent-2" />
      )}
      <div className="agent-float relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-surface to-bg shadow-[0_0_18px_var(--accent-glow)]">
        <svg viewBox="0 0 44 44" className="h-9 w-9" aria-hidden="true">
          {/* antenna */}
          <line x1="22" y1="4" x2="22" y2="10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="4" r="2.2" fill="var(--accent)">
            <animate attributeName="opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite" />
          </circle>
          {/* head */}
          <rect x="7" y="10" width="30" height="26" rx="9" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.6" />
          {/* eyes */}
          {state === "thinking" ? (
            <>
              <path d="M13 21 q2.5 -3 5 0 q2.5 3 5 0" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" values="0;10;0" dur="1.1s" repeatCount="indefinite" />
              </path>
            </>
          ) : (
            <>
              <circle className="agent-eye" cx="16" cy="21" r="2.6" fill="var(--accent)" />
              <circle className="agent-eye" cx="28" cy="21" r="2.6" fill="var(--accent)" />
            </>
          )}
          {/* mouth */}
          {state === "speaking" ? (
            <g fill="var(--accent-2)">
              <rect className="agent-talk" x="15" y="27" width="2.6" height="5" rx="1.3" style={{ animationDelay: "0ms" }} />
              <rect className="agent-talk" x="19.4" y="27" width="2.6" height="5" rx="1.3" style={{ animationDelay: "140ms" }} />
              <rect className="agent-talk" x="23.8" y="27" width="2.6" height="5" rx="1.3" style={{ animationDelay: "280ms" }} />
              <rect className="agent-talk" x="28.2" y="27" width="2.6" height="5" rx="1.3" style={{ animationDelay: "420ms" }} />
            </g>
          ) : (
            <path d="M16 29.5 q6 4 12 0" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </div>
    </div>
  );
}

function ThinkingWave() {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="agent-wave-bar w-[3px] rounded-full bg-gradient-to-t from-accent to-accent-2"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

export function AgentWidget() {
  const { locale, dict, isRtl } = useLocale();
  const t = dict.agent;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.greeting },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMicSupported(!!getRecognition());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
      const lang = locale === "he" ? "he-IL" : "en-US";
      utter.lang = lang;
      const voice = synth
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
      if (voice) utter.voice = voice;
      utter.rate = 1.02;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utter);
    },
    [locale, voiceOn]
  );

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || thinking) return;
      setInput("");
      stopSpeaking();

      const next: Message[] = [...messages, { role: "user", content: text }];
      setMessages(next);
      setThinking(true);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            messages: next.slice(-7).map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          links?: AgentLinkItem[];
        };
        const reply = data.reply ?? t.errorReply;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, links: data.links ?? [] },
        ]);
        speak(reply);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t.errorReply, links: [] },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [input, thinking, messages, locale, speak, stopSpeaking, t.errorReply]
  );

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    rec.lang = locale === "he" ? "he-IL" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (transcript.trim()) void send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [listening, locale, send]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  const avatarState = thinking ? "thinking" : speaking ? "speaking" : "idle";
  const showSuggestions = messages.length <= 1 && !thinking;

  return (
    <>
      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          stopSpeaking();
        }}
        aria-label={open ? t.close : t.openChat}
        className={cn(
          "fixed bottom-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-accent/50",
          "bg-accent text-on-accent shadow-[0_0_28px_var(--accent-glow)] transition-transform duration-200 hover:scale-105",
          isRtl ? "left-5" : "right-5"
        )}
        whileTap={{ scale: 0.92 }}
      >
        {!open && (
          <span className="agent-pulse absolute inset-0 rounded-full border-2 border-accent" />
        )}
        {open ? <X className="h-6 w-6" /> : <AgentAvatarMini />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            key="agent-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed bottom-24 z-[60] flex w-[min(92vw,400px)] flex-col overflow-hidden rounded-3xl",
              "border border-surface-border bg-surface/95 shadow-[var(--card-shadow)] backdrop-blur-xl",
              isRtl ? "left-5" : "right-5"
            )}
            style={{ height: "min(68vh, 560px)" }}
            aria-label={t.title}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-surface-border bg-surface px-4 py-3">
              <AgentAvatar state={avatarState} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base font-semibold text-text">
                  {t.title}
                </p>
                <p className="truncate text-xs text-text-muted">{t.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (voiceOn) stopSpeaking();
                  setVoiceOn((v) => !v);
                }}
                aria-label={voiceOn ? t.voiceOff : t.voiceOn}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg hover:text-accent"
              >
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-accent text-on-accent " + (isRtl ? "rounded-tl-sm" : "rounded-tr-sm")
                        : "border border-surface-border bg-bg/60 text-text " + (isRtl ? "rounded-tr-sm" : "rounded-tl-sm")
                    )}
                  >
                    <p className="whitespace-pre-wrap">
                      {m.role === "assistant"
                        ? renderRichText(m.content, locale, `m${idx}`)
                        : m.content}
                    </p>
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((link) =>
                          link.href.endsWith(".pdf") ? (
                            <a
                              key={link.href + link.label}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                            >
                              {link.label}
                            </a>
                          ) : (
                            <Link
                              key={link.href + link.label}
                              href={localizedPath(locale, link.href)}
                              onClick={() => setOpen(false)}
                              className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                            >
                              {link.label}
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-bg/60 px-4 py-3">
                    <ThinkingWave />
                    <span className="text-xs text-text-muted">{t.thinking}</span>
                  </div>
                </div>
              )}

              {showSuggestions && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-surface-border bg-bg/50 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              className="flex items-center gap-2 border-t border-surface-border bg-surface px-3 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label={listening ? t.micStop : t.micStart}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all",
                    listening
                      ? "agent-listening border-accent-2 bg-accent-2/15 text-accent-2"
                      : "border-surface-border text-text-muted hover:border-accent/50 hover:text-accent"
                  )}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? t.listening : t.placeholder}
                aria-label={t.placeholder}
                className="h-10 min-w-0 flex-1 rounded-full border border-surface-border bg-bg/70 px-4 text-sm text-text outline-none transition-colors placeholder:text-text-muted/70 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                aria-label={t.send}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_0_18px_var(--accent-glow)] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                <Send className={cn("h-4 w-4", isRtl && "-scale-x-100")} />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function AgentAvatarMini() {
  return (
    <svg viewBox="0 0 44 44" className="h-9 w-9" aria-hidden="true">
      <line x1="22" y1="4" x2="22" y2="10" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22" cy="4" r="2.4" fill="var(--on-accent)" />
      <rect x="7" y="10" width="30" height="26" rx="9" fill="none" stroke="var(--on-accent)" strokeWidth="2.2" />
      <circle cx="16" cy="21" r="2.8" fill="var(--on-accent)" />
      <circle cx="28" cy="21" r="2.8" fill="var(--on-accent)" />
      <path d="M16 29.5 q6 4 12 0" fill="none" stroke="var(--on-accent)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
