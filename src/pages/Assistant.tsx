import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Send, Settings2, Sparkles, Trash2, Wifi, WifiOff } from "lucide-react";
import { clearChat, sendChat, useApp } from "../store/store";
import { aiConfigured } from "../services/ai";
import { CHAT_SUGGESTIONS } from "../data/presets";
import { Button, Logo } from "../components/ui";
import { Confirm, useToast } from "../components/overlays";
import { cx, fmtTimeOfDay } from "../lib/utils";
import { PageHeader } from "../components/widgets";
import type { ChatMessage } from "../types";

export default function AssistantPage() {
  const { data, chatBusy } = useApp();
  const toast = useToast();
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const configured = data ? aiConfigured(data.aiConfig) : false;
  const messages = data?.chat ?? [];

  useEffect(() => {
    if (atBottom) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, chatBusy, atBottom]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  const send = (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || chatBusy) return;
    setInput("");
    setAtBottom(true);
    void sendChat(body);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const suggestions = useMemo(() => CHAT_SUGGESTIONS, []);

  if (!data) return null;

  return (
    <>
      <PageHeader
        title="AI Assistant"
        sub="Study plans, next-topic picks, quizzes and honest progress reviews."
        actions={
          <>
            <Link to="/settings">
              <Button variant="outline" size="sm" icon={Settings2}>
                <span className="hidden sm:inline">Configure</span>
              </Button>
            </Link>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)}>
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </>
        }
      />

      <div className={cx(!configured && "mb-4", "anim-in")}>
        {!configured && (
          <div className="flex flex-wrap items-center gap-3 bg-emberwash border border-ember/30 rounded-xl px-4 py-3">
            <span className="w-8 h-8 rounded-lg bg-ember/15 text-ember inline-flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4" aria-hidden="true" />
            </span>
            <p className="text-[13px] text-ink flex-1 min-w-52">
              <strong>Offline study coach active.</strong> Answers come from your real StudyNest data. Connect an OpenAI-compatible endpoint for free-form explanations.
            </p>
            <Link to="/settings" className="text-[12.5px] font-bold text-ember hover:underline shrink-0">
              Open Settings →
            </Link>
          </div>
        )}
      </div>

      <div className="card flex flex-col h-[calc(100vh-270px)] min-h-[440px] anim-in overflow-hidden">
        {/* status strip */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-raise/60 shrink-0">
          <span className={cx("inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wider", configured ? "text-pine" : "text-ember")}>
            {configured ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />}
            {configured ? `Connected · ${data.aiConfig.model || "default model"}` : "Offline coach"}
          </span>
          <span className="text-[11px] font-bold text-faint tnum">{messages.length} message{messages.length === 1 ? "" : "s"}</span>
        </div>

        {/* messages */}
        <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && !chatBusy && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Logo size={40} withWord={false} />
              <h2 className="font-display font-extrabold text-[20px] text-ink mt-4">Ask your study copilot</h2>
              <p className="text-sm text-mute mt-1.5 max-w-sm">
                It knows your subjects, open topics, streak and sessions — so answers fit your actual situation.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-[13px] font-semibold text-pine bg-pinewash hover:brightness-[0.97] dark:hover:brightness-110 border border-pine/15 px-3.5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}

          {chatBusy && (
            <div className="flex items-end gap-2.5">
              <BubbleAvatar />
              <div className="bg-raise border border-line rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5" aria-label="Assistant is thinking">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-faint typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-line p-3 shrink-0 bg-surface">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="e.g. What should I study next?  ·  Build my weekly plan…"
              aria-label="Message the assistant"
              className="flex-1 resize-none bg-raise border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 max-h-32"
              style={{ minHeight: 42 }}
            />
            <Button icon={Send} onClick={() => send()} disabled={!input.trim() || chatBusy} aria-label="Send message">
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="text-[11px] text-faint mt-2 px-1">Enter to send · Shift+Enter for a new line · history is saved to your account</p>
        </div>
      </div>

      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearChat();
          toast({ title: "Conversation cleared", tone: "info" });
        }}
        title="Clear conversation?"
        body="All messages with the assistant will be removed. Your study data is untouched."
        confirmLabel="Clear chat"
      />
    </>
  );
}

function BubbleAvatar() {
  return (
    <span className="w-7.5 h-7.5 rounded-lg bg-sidebar inline-flex items-center justify-center shrink-0 mb-1">
      <Sparkles className="w-4 h-4 text-[#e9c46a]" aria-hidden="true" />
    </span>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cx("flex items-end gap-2.5 anim-in", isUser && "flex-row-reverse")}>
      {!isUser && <BubbleAvatar />}
      <div className={cx("max-w-[85%] sm:max-w-[75%]")}>
        <div
          className={cx(
            "px-4 py-3 text-[13.5px] leading-relaxed",
            isUser
              ? "bg-pine text-white dark:text-[#0d1a13] rounded-2xl rounded-br-md font-medium"
              : msg.error
                ? "bg-rustwash border border-rust/30 text-rust rounded-2xl rounded-bl-md"
                : "bg-raise border border-line rounded-2xl rounded-bl-md text-ink"
          )}
        >
          {isUser ? msg.content : <MarkdownLite text={msg.content} />}
        </div>
        <p className={cx("text-[10.5px] font-bold text-faint mt-1 px-1", isUser && "text-right")}>{fmtTimeOfDay(msg.createdAt)}</p>
      </div>
    </div>
  );
}

/* Tiny markdown renderer: ### headings, - bullets, **bold**, *italic* */
function MarkdownLite({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const lines = text.split("\n");
  let bullets: string[] = [];
  const flush = (keyBase: string) => {
    if (bullets.length > 0) {
      nodes.push(
        <ul key={`${keyBase}-ul-${nodes.length}`} className="space-y-1 my-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-pine font-extrabold mt-[1px]">•</span>
              <span>{inline(b)}</span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
      return;
    }
    flush(String(i));
    if (trimmed === "") return;
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={i} className="font-display font-bold text-[14.5px] mt-2.5 first:mt-0 mb-0.5">
          {inline(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    nodes.push(
      <p key={i} className="my-1">
        {inline(trimmed)}
      </p>
    );
  });
  flush("end");
  return <>{nodes}</>;
}

function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}
