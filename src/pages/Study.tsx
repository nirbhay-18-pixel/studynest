import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus, ChevronDown, History, Pause, Play, Square, Timer, Trash2 } from "lucide-react";
import {
  discardTimer,
  logSession,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerElapsed,
  useApp,
  useNow,
} from "../store/store";
import { secondsOnDay, subjectOf, weekToDateSec, totalSec } from "../lib/stats";
import { Button, Field, Input, Select, Textarea } from "../components/ui";
import { useToast } from "../components/overlays";
import { cx, dateKey, fmtClock, fmtDay, fmtDuration, isValidKey, notFutureKey, todayKey } from "../lib/utils";
import { EmptyState, PageHeader, SessionRow } from "../components/widgets";

export default function StudyPage() {
  const { data } = useApp();
  const toast = useToast();
  const timer = data?.timer;
  const active = !!timer?.active;
  const now = useNow(active, 250);

  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [note, setNote] = useState("");

  const activeSubjects = useMemo(() => (data?.subjects ?? []).filter((s) => !s.archived), [data]);
  const effSubjectId = active && timer?.subjectId ? timer.subjectId : subjectId || activeSubjects[0]?.id || "";
  const chapterOptions = useMemo(
    () => (data?.chapters ?? []).filter((c) => c.subjectId === effSubjectId),
    [data, effSubjectId]
  );
  const effChapterId = active && timer ? (timer.chapterId ?? "") : chapterId;

  const history = useMemo(
    () => [...(data?.sessions ?? [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [data]
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof history>();
    for (const s of history.slice(0, 40)) {
      const k = dateKey(new Date(s.startedAt));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [history]);

  if (!data || !timer) return null;
  const elapsed = timerElapsed(timer, now);
  const subject = subjectOf(data.subjects, active ? timer.subjectId : effSubjectId);

  const start = () => {
    if (!effSubjectId) {
      toast({ title: "Pick a subject first", desc: "Create one under Subjects if the list is empty.", tone: "error" });
      return;
    }
    startTimer(effSubjectId, effChapterId || null);
    toast({ title: "Timer running", desc: `Deep work on ${subject?.name ?? "your subject"} — you've got this.` });
  };

  const stop = () => {
    const res = stopTimer(note);
    setNote("");
    if (res.ok) {
      toast({ title: "Session saved ✓", desc: `${fmtDuration(res.session.durationSec)} logged to ${subject?.name ?? "subject"}.` });
    } else if (res.reason === "short") {
      toast({ title: "Too short to log", desc: "Sessions under 30 seconds are discarded.", tone: "info" });
    }
  };

  const dayGroupsLabel = (k: string) => {
    if (k === todayKey()) return "Today";
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (k === dateKey(y)) return "Yesterday";
    return fmtDay(k, true);
  };

  return (
    <>
      <PageHeader title="Study" sub="Track focused time. The timer is timestamp-based — it stays accurate even if this tab sleeps." />

      <div className="grid lg:grid-cols-[420px_1fr] gap-5 items-start">
        {/* Timer */}
        <section className="card p-6 anim-in lg:sticky lg:top-20">
          {!active ? (
            <>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-9 h-9 rounded-xl bg-pinewash text-pine inline-flex items-center justify-center">
                  <Timer className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
                <h2 className="font-display font-bold text-[17px] text-ink">New session</h2>
              </div>
              <div className="space-y-4">
                <Field label="Subject">
                  <Select value={effSubjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); }}>
                    {activeSubjects.length === 0 && <option value="">No subjects yet</option>}
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Chapter / topic (optional)">
                  <Select value={effChapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!effSubjectId}>
                    <option value="">Just the subject</option>
                    {chapterOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </Select>
                </Field>
                <Button size="lg" icon={Play} className="w-full" onClick={start} disabled={activeSubjects.length === 0}>
                  Start focusing
                </Button>
                {activeSubjects.length === 0 && (
                  <p className="text-xs text-faint text-center">Create a subject first — sessions need somewhere to live.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em]" style={{ color: timer.paused ? "var(--ember)" : "var(--pine)" }}>
                  <span className={cx("w-2.5 h-2.5 rounded-full", timer.paused ? "bg-ember" : "bg-pine pulse-dot")} aria-hidden="true" />
                  {timer.paused ? "Paused" : "Focusing"}
                </span>
                <span className="text-[12.5px] font-bold text-mute truncate max-w-[55%]">{subject?.name ?? "—"}</span>
              </div>
              <p
                className="font-mono font-bold text-[56px] leading-none text-ink tnum text-center py-6 select-none"
                role="timer"
                aria-live="off"
                aria-label={`Elapsed time ${fmtClock(elapsed)}`}
              >
                {fmtClock(elapsed)}
              </p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Session note (optional) — saved with the session" className="mb-4 min-h-16" />
              <div className="grid grid-cols-2 gap-2.5">
                {timer.paused ? (
                  <Button icon={Play} onClick={resumeTimer}>Resume</Button>
                ) : (
                  <Button variant="outline" icon={Pause} onClick={pauseTimer}>Pause</Button>
                )}
                <Button icon={Square} onClick={stop}>Stop & save</Button>
              </div>
              <button
                onClick={() => {
                  discardTimer();
                  setNote("");
                  toast({ title: "Session discarded", tone: "info" });
                }}
                className="w-full mt-3 text-[12.5px] font-bold text-faint hover:text-rust transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Discard without saving
              </button>
            </>
          )}

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-line">
            {[
              { label: "Today", v: fmtDuration(secondsOnDay(data.sessions, todayKey())) },
              { label: "This week", v: fmtDuration(weekToDateSec(data.sessions)) },
              { label: "All time", v: fmtDuration(totalSec(data.sessions)) },
            ].map((x) => (
              <div key={x.label} className="text-center">
                <p className="font-display font-bold text-[15px] text-ink tnum">{x.v}</p>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mt-0.5">{x.label}</p>
              </div>
            ))}
          </div>

          <LogPastForm />
        </section>

        {/* History */}
        <section className="anim-in">
          <div className="flex items-center gap-2.5 mb-4">
            <History className="w-4.5 h-4.5 text-mute" aria-hidden="true" />
            <h2 className="font-display font-bold text-[17px] text-ink">Session history</h2>
            <span className="text-[12px] font-bold text-faint tnum">{history.length} total</span>
          </div>
          {history.length === 0 ? (
            <EmptyState
              icon={Timer}
              title="No sessions yet"
              body="Start your first study session to begin tracking your progress. Every minute you log feeds your streak, analytics and goals."
              action={!active ? <Button icon={Play} onClick={start} disabled={activeSubjects.length === 0}>Start now</Button> : undefined}
            />
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, sessions]) => (
                <div key={day} className="card p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-faint">{dayGroupsLabel(day)}</h3>
                    <span className="text-[12px] font-bold text-mute tnum">{fmtDuration(sessions.reduce((a, s) => a + s.durationSec, 0))}</span>
                  </div>
                  <ul className="divide-y divide-line/60">
                    {sessions.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        subject={subjectOf(data.subjects, s.subjectId)}
                        chapterTitle={data.chapters.find((c) => c.id === s.chapterId)?.title}
                        onDelete={() => {
                          deleteSessionSafe(s.id);
                          toast({ title: "Session deleted", tone: "info" });
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* Imported indirectly to keep the top import list focused */
import { deleteSession } from "../store/store";
function deleteSessionSafe(id: string) {
  deleteSession(id);
}

/* ---------- Manual log ---------- */

function LogPastForm() {
  const { data } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const subjects = (data?.subjects ?? []).filter((s) => !s.archived);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sid = subjectId || subjects[0]?.id || "";
    if (!isValidKey(date) || !notFutureKey(date)) {
      setErr("Date can't be in the future.");
      return;
    }
    const h = Number(hours);
    const m = Number(minutes);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) {
      setErr("Duration must be a positive amount of time.");
      return;
    }
    const res = logSession({ subjectId: sid, chapterId: null, dateKeyStr: date, minutes: h * 60 + m, notes });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    toast({ title: "Session logged", desc: `${fmtDuration(res.value.durationSec)} on ${fmtDay(date, true)}.` });
    setErr(null);
    setNotes("");
    setOpen(false);
  };

  return (
    <div className="mt-5 border-t border-line pt-4">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-[13px] font-bold text-mute hover:text-ink transition-colors" aria-expanded={open}>
        <span className="inline-flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Log a past session manually
        </span>
        <ChevronDown className={cx("w-4 h-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3.5 anim-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject">
              <Select value={subjectId || subjects[0]?.id || ""} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours">
              <Input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Minutes">
              <Input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Note (optional)">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you cover?" />
          </Field>
          {err && <p className="text-xs font-medium text-rust" role="alert">{err}</p>}
          <Button type="submit" variant="subtle" className="w-full">Log session</Button>
        </form>
      )}
    </div>
  );
}
