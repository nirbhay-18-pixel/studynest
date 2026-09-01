import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  ListPlus,
  Search,
  SearchX,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import type { FlatTopic, Importance, SubjectCode, SyllabusTopic } from "../data/syllabus/types";
import { FLAT_TOPICS, SYLLABUS, searchSyllabus, subjectDef, TOTAL_TOPICS, TOTAL_UNITS } from "../data/syllabus";
import type { StudySession, TopicProgress, TopicStatus } from "../types";
import {
  IMPORTANCE_META,
  importanceReason,
  overallAgg,
  pyqAgg,
  recommendedNext,
  setPendingTopic,
  STATUS_META,
  STATUS_ORDER,
  subjectAgg,
  subjectColors,
  topicSeconds,
  unitAgg,
} from "../lib/syllabusStats";
import { addTask, savePyq, setTopicStatus, updateTopicFields, useApp } from "../store/store";
import { Badge, Button, Field, Input, ProgressBar, Ring, Select, Textarea } from "../components/ui";
import { Modal, useToast } from "../components/overlays";
import { cx, fmtDuration, fmtDay, relDue, todayKey } from "../lib/utils";

type ImpFilter = "all" | Importance;
type StatusFilter = "all" | TopicStatus;

export default function SyllabusPage() {
  const { data } = useApp();
  const [subject, setSubject] = useState<SubjectCode | null>(null);
  const [unitN, setUnitN] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [impFilter, setImpFilter] = useState<ImpFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalId, setModalId] = useState<string | null>(null);

  const prog = data?.syllabus ?? {};
  const overall = useMemo(() => overallAgg(prog), [prog]);
  const results = useMemo(() => searchSyllabus(query), [query]);
  const searching = query.trim().length >= 2;
  const modalTopic = modalId ? FLAT_TOPICS.find((t) => t.id === modalId) ?? null : null;

  const openTopic = (t: FlatTopic) => {
    setSubject(t.subject);
    setUnitN(t.unitN);
    setModalId(t.id);
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 anim-in">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display font-extrabold text-[26px] tracking-tight text-ink leading-none">JEE Main 2026</h1>
            <Badge tone="pine" className="!h-6">Official NTA Baseline</Badge>
            <span className="font-mono text-[11px] font-bold text-faint border border-line rounded-md px-1.5 py-0.5 bg-raise">
              {SYLLABUS.version}
            </span>
          </div>
          <p className="text-sm text-mute mt-2 max-w-2xl">
            {SYLLABUS.exam} · {TOTAL_UNITS} units · {TOTAL_TOPICS} trackable topics · {overall.completed} completed ({overall.pct}%)
          </p>
        </div>
        <div className="w-full sm:w-80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search syllabus — try “Kirchhoff”, “Bayes”, “SN1”"
              className="!pl-9"
              aria-label="Search the syllabus"
            />
          </div>
        </div>
      </div>

      {searching ? (
        <SearchResults results={results} query={query} prog={prog} onOpen={openTopic} />
      ) : subject === null ? (
        <SubjectOverview prog={prog} onOpen={(code) => { setSubject(code); setUnitN(null); }} />
      ) : (
        <SubjectView
          code={subject}
          unitN={unitN}
          setUnitN={setUnitN}
          impFilter={impFilter}
          setImpFilter={setImpFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          prog={prog}
          onBack={() => setSubject(null)}
          onOpen={(id) => setModalId(id)}
        />
      )}

      {modalTopic && data && (
        <TopicModal topic={modalTopic} progress={prog[modalTopic.id]} sessions={data.sessions} onClose={() => setModalId(null)} />
      )}
    </>
  );
}

/* ================= overview ================= */

function SubjectOverview({ prog, onOpen }: { prog: Record<string, TopicProgress>; onOpen: (c: SubjectCode) => void }) {
  const recs = useMemo(() => recommendedNext(prog, 3), [prog]);
  const pyq = useMemo(() => pyqAgg(prog), [prog]);
  const overall = overallAgg(prog);

  return (
    <div className="space-y-5">
      {/* Subject cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {SYLLABUS.subjects.map((sub) => {
          const agg = subjectAgg(sub.code, prog);
          return (
            <button
              key={sub.code}
              onClick={() => onOpen(sub.code)}
              className="card p-5 text-left hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] transition-all duration-200 group anim-in"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-[19px] text-ink leading-tight group-hover:text-pine transition-colors">
                    {sub.name}
                  </h2>
                  <p className="text-[12px] font-bold text-faint mt-0.5 uppercase tracking-wider">{sub.units.length} Units</p>
                </div>
                <Ring pct={agg.pct} size={54} color={subjectColors[sub.code]}>
                  <span className="font-display font-extrabold text-[13px] text-ink tnum">{agg.pct}%</span>
                </Ring>
              </div>
              <ProgressBar pct={agg.pct} color={subjectColors[sub.code]} thin className="mb-3.5" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-display font-bold text-[16px] text-ink tnum">{agg.completed}<span className="text-faint text-[12px] font-semibold">/{agg.total}</span></p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Done</p>
                </div>
                <div>
                  <p className="font-display font-bold text-[16px] text-rust tnum">{agg.highRemaining}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-faint">High left</p>
                </div>
                <div>
                  <p className="font-display font-bold text-[16px] text-ember tnum">{agg.learning}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-faint">In progress</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        {/* Recommended next */}
        <section className="card p-5 lg:col-span-3 anim-in">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4.5 h-4.5 text-ember" aria-hidden="true" />
            <h2 className="font-display font-bold text-[16px] text-ink">Recommended next</h2>
            <span className="text-[11px] font-bold text-faint uppercase tracking-wider ml-auto">Trend-based · not a prediction</span>
          </div>
          {recs.length === 0 ? (
            <p className="text-sm text-mute">Every topic in the syllabus is completed — extraordinary. Open a subject to review or set revision targets.</p>
          ) : (
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r.topic.id}>
                  <RecommendedRow rec={r} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Snapshot */}
        <section className="card p-5 lg:col-span-2 anim-in">
          <h2 className="font-display font-bold text-[16px] text-ink mb-4">Syllabus snapshot</h2>
          <div className="flex items-center gap-4 mb-4">
            <Ring pct={overall.pct} size={72} stroke={7}>
              <span className="font-display font-extrabold text-[16px] text-ink tnum">{overall.pct}%</span>
            </Ring>
            <div className="text-[13px] text-mute leading-relaxed">
              <p><strong className="text-ink">{overall.completed}</strong> of <strong className="text-ink">{overall.total}</strong> topics completed</p>
              <p><strong className="text-rust">{overall.highRemaining}</strong> high-priority still open</p>
              <p><strong className="text-ember">{overall.learning}</strong> being learned right now</p>
            </div>
          </div>
          <div className="border-t border-line pt-3.5 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="font-display font-bold text-[18px] text-ink tnum">{pyq.accuracy === null ? "—" : `${pyq.accuracy}%`}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">PYQ accuracy</p>
              <p className="text-[11px] text-faint tnum">{pyq.attempted} attempted</p>
            </div>
            <div>
              <p className="font-display font-bold text-[18px] text-ink tnum">{overall.revisionPending}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Awaiting revision</p>
              <p className="text-[11px] text-faint">recall queue</p>
            </div>
          </div>
          <p className="text-[11.5px] text-faint mt-4 leading-relaxed border-t border-line pt-3.5">
            {SYLLABUS.sourceNote}
          </p>
        </section>
      </div>
    </div>
  );
}

function RecommendedRow({ rec }: { rec: { topic: FlatTopic; reason: string } }) {
  const nav = useNavigate();
  const imp = IMPORTANCE_META[rec.topic.importance];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-line bg-raise/50 hover:border-linex transition-colors">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subjectColors[rec.topic.subject] }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink truncate">{rec.topic.name}</p>
        <p className="text-[12px] text-mute truncate">
          {rec.topic.subjectName} · U{rec.topic.unitN} {rec.topic.unitName} — {rec.reason}
        </p>
      </div>
      <Badge tone={rec.topic.importance === "high" ? "rust" : rec.topic.importance === "medium" ? "ember" : "moss"}>{imp.label}</Badge>
      <Button size="xs" variant="subtle" onClick={() => { setPendingTopic(rec.topic.id); nav("/study"); }}>
        <Timer className="w-3.5 h-3.5" aria-hidden="true" /> Study
      </Button>
    </div>
  );
}

/* ================= subject view ================= */

function SubjectView({
  code,
  unitN,
  setUnitN,
  impFilter,
  setImpFilter,
  statusFilter,
  setStatusFilter,
  prog,
  onBack,
  onOpen,
}: {
  code: SubjectCode;
  unitN: number | null;
  setUnitN: (n: number | null) => void;
  impFilter: ImpFilter;
  setImpFilter: (f: ImpFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  prog: Record<string, TopicProgress>;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const sub = subjectDef(code);
  const agg = subjectAgg(code, prog);
  const [mobileUnitsOpen, setMobileUnitsOpen] = useState(false);

  const matches = (t: SyllabusTopic): boolean =>
    (impFilter === "all" || t.importance === impFilter) &&
    (statusFilter === "all" || (prog[t.id]?.status ?? "not_started") === statusFilter);

  const unitsToShow = unitN === null ? sub.units : sub.units.filter((u) => u.n === unitN);
  const unitTopics = (n: number): FlatTopic[] => FLAT_TOPICS.filter((t) => t.subject === code && t.unitN === n);
  const visibleCount = unitsToShow.reduce((a, u) => a + unitTopics(u.n).filter(matches).length, 0);
  const filtersActive = impFilter !== "all" || statusFilter !== "all";

  return (
    <div className="anim-in">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-mute hover:text-ink transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All subjects
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
        <h1 className="font-display font-extrabold text-[22px] tracking-tight text-ink">{sub.name}</h1>
        <span className="text-[12px] font-bold text-faint uppercase tracking-wider">{sub.units.length} units · {agg.total} topics</span>
        <div className="flex items-center gap-2 ml-auto min-w-40">
          <ProgressBar pct={agg.pct} color={subjectColors[code]} thin className="flex-1" />
          <span className="text-[12.5px] font-extrabold text-ink tnum">{agg.pct}%</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[270px_1fr] gap-5 items-start">
        {/* Unit list */}
        <aside className="lg:sticky lg:top-20">
          <button
            className="lg:hidden w-full card px-4 py-3 flex items-center justify-between text-sm font-bold text-ink"
            onClick={() => setMobileUnitsOpen((o) => !o)}
            aria-expanded={mobileUnitsOpen}
          >
            {unitN === null ? "All units" : `Unit ${unitN} — ${sub.units.find((u) => u.n === unitN)?.name}`}
            <ChevronDown className={cx("w-4 h-4 text-mute transition-transform", mobileUnitsOpen && "rotate-180")} aria-hidden="true" />
          </button>
          <nav className={cx("card p-1.5 mt-2 lg:mt-0 max-h-[60vh] lg:max-h-[calc(100vh-120px)] overflow-y-auto", !mobileUnitsOpen && "hidden lg:block")} aria-label="Syllabus units">
            <UnitItem active={unitN === null} label="All units" detail={`${agg.completed}/${agg.total} done`} onClick={() => { setUnitN(null); setMobileUnitsOpen(false); }} />
            {sub.units.map((u) => {
              const ua = unitAgg(code, u.n, prog);
              return (
                <UnitItem
                  key={u.n}
                  active={unitN === u.n}
                  label={`U${u.n} · ${u.name}`}
                  detail={`${ua.completed}/${ua.total}`}
                  pct={ua.pct}
                  color={subjectColors[code]}
                  onClick={() => { setUnitN(u.n); setMobileUnitsOpen(false); }}
                />
              );
            })}
          </nav>
        </aside>

        {/* Topics */}
        <section className="min-w-0">
          {/* Filters */}
          <div className="card p-3.5 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by priority">
              <Flag className="w-3.5 h-3.5 text-faint shrink-0" aria-hidden="true" />
              {(["all", "high", "medium", "low"] as ImpFilter[]).map((f) => (
                <FilterChip key={f} active={impFilter === f} onClick={() => setImpFilter(f)} color={f === "all" ? undefined : IMPORTANCE_META[f as Importance].color}>
                  {f === "all" ? "All priorities" : f === "high" ? "High Priority" : IMPORTANCE_META[f as Importance].label}
                </FilterChip>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by status">
              <Target className="w-3.5 h-3.5 text-faint shrink-0" aria-hidden="true" />
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All statuses</FilterChip>
              {STATUS_ORDER.map((s) => (
                <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} color={STATUS_META[s].dot}>
                  {STATUS_META[s].label}
                </FilterChip>
              ))}
            </div>
            {filtersActive && (
              <span className="text-[12px] font-bold text-mute tnum ml-auto">{visibleCount} topic{visibleCount === 1 ? "" : "s"} match</span>
            )}
          </div>

          {visibleCount === 0 ? (
            <div className="card p-8 text-center">
              <SearchX className="w-7 h-7 text-faint mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-bold text-ink">No topics match these filters</p>
              <p className="text-[13px] text-mute mt-1">Every topic stays in the syllabus — LOW priority never means removed. Loosen a filter to see them.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unitsToShow.map((u) => {
                const topics = unitTopics(u.n).filter(matches);
                if (topics.length === 0) return null;
                const ua = unitAgg(code, u.n, prog);
                return (
                  <div key={u.n} className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-line flex items-center gap-3 bg-raise/40">
                      <span className="font-mono text-[11px] font-extrabold text-faint">U{String(u.n).padStart(2, "0")}</span>
                      <h3 className="font-display font-bold text-[15px] text-ink flex-1 truncate">{u.name}</h3>
                      {u.category && <Badge tone="mute">{u.category}</Badge>}
                      <span className="text-[12px] font-bold text-mute tnum shrink-0">{ua.completed}/{ua.total}</span>
                    </div>
                    <ul className="divide-y divide-line/60">
                      {topics.map((t) => (
                        <TopicRow key={t.id} topic={t} progress={prog[t.id]} onOpen={() => onOpen(t.id)} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UnitItem({ active, label, detail, pct, color, onClick }: { active: boolean; label: string; detail: string; pct?: number; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
        active ? "bg-pinewash" : "hover:bg-raise"
      )}
      aria-current={active ? "true" : undefined}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cx("text-[13px] font-semibold truncate", active ? "text-pine" : "text-ink")}>{label}</span>
        <span className="text-[11px] font-bold text-faint tnum shrink-0">{detail}</span>
      </span>
      {pct !== undefined && (
        <span className="block mt-1.5 h-1 rounded-full bg-line/70 overflow-hidden">
          <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
        </span>
      )}
    </button>
  );
}

function FilterChip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-bold border transition-all",
        active ? "border-pine bg-pinewash text-pine" : "border-line text-mute hover:border-linex hover:text-ink"
      )}
    >
      {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ================= topic row + status pill ================= */

function TopicRow({ topic, progress, onOpen }: { topic: FlatTopic; progress: TopicProgress | undefined; onOpen: () => void }) {
  const { data } = useApp();
  const status = progress?.status ?? "not_started";
  const imp = IMPORTANCE_META[topic.importance];
  const sec = data ? topicSeconds(data.sessions, topic.id) : 0;
  const attempted = progress?.pyqAttempted ?? 0;
  const acc = attempted > 0 && progress ? Math.round((Math.min(progress.pyqCorrect, attempted) / attempted) * 100) : null;
  const overdue = progress?.targetDate && progress.targetDate < todayKey() && status !== "completed";

  return (
    <li className="group">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        className={cx(
          "w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-raise/70",
          status === "completed" && "opacity-70"
        )}
      >
        <StatusPill status={status} onChange={(s) => setTopicStatus(topic.id, s)} />
        <span className={cx("min-w-0 flex-1 text-[13.5px] font-semibold leading-snug", status === "completed" ? "text-mute line-through decoration-2" : "text-ink")}>
          {topic.name}
        </span>
        {overdue && <Badge tone="rust"><CalendarClock className="w-3 h-3" aria-hidden="true" />{relDue(progress!.targetDate!).label}</Badge>}
        {acc !== null && <Badge tone="mute" className="tnum hidden sm:inline-flex">{acc}% PYQ</Badge>}
        {sec > 0 && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11.5px] font-bold text-faint tnum shrink-0">
            <Clock className="w-3 h-3" aria-hidden="true" /> {fmtDuration(sec)}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10.5px] font-extrabold uppercase tracking-wide shrink-0"
          style={{ color: imp.color, background: imp.wash }}
          title={`Trend-based preparation priority: ${imp.label}`}
        >
          {imp.label}
        </span>
        <ChevronRight className="w-4 h-4 text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
      </div>
    </li>
  );
}

export function StatusPill({ status, onChange, small }: { status: TopicStatus; onChange: (s: TopicStatus) => void; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const meta = STATUS_META[status];
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${meta.label}. Change status`}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-md border border-line font-bold transition-colors hover:border-linex bg-surface",
          small ? "h-5.5 px-1.5 text-[10px]" : "h-6 px-2 text-[10.5px] uppercase tracking-wide"
        )}
        style={{ color: meta.dot }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
        {meta.label}
      </button>
      {open && (
        <div className="absolute left-0 top-7.5 z-30 min-w-36 bg-surface border border-line rounded-xl shadow-[var(--shadow-pop)] p-1 anim-pop" role="listbox">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === status}
              onClick={(e) => { e.stopPropagation(); setOpen(false); if (s !== status) onChange(s); }}
              className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[12.5px] font-semibold text-ink hover:bg-raise transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_META[s].dot }} aria-hidden="true" />
              <span className="flex-1">{STATUS_META[s].label}</span>
              {s === status && <Check className="w-3.5 h-3.5 text-pine" strokeWidth={3} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= search ================= */

function SearchResults({ results, query, prog, onOpen }: { results: ReturnType<typeof searchSyllabus>; query: string; prog: Record<string, TopicProgress>; onOpen: (t: FlatTopic) => void }) {
  return (
    <section className="card overflow-hidden anim-in" aria-label={`Search results for ${query}`}>
      <div className="px-4 py-3 border-b border-line bg-raise/40 flex items-center gap-2">
        <Search className="w-4 h-4 text-mute" aria-hidden="true" />
        <p className="text-[13px] font-bold text-ink">
          {results.length === 0 ? "No matches" : `${results.length} match${results.length === 1 ? "" : "es"}`}
          <span className="text-mute font-semibold"> for “{query.trim()}”</span>
        </p>
      </div>
      {results.length === 0 ? (
        <div className="p-8 text-center">
          <SearchX className="w-7 h-7 text-faint mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-ink">Nothing in the official syllabus matches that</p>
          <p className="text-[13px] text-mute mt-1 max-w-md mx-auto">
            Try an official term — e.g. “Kirchhoff” finds Physics → Current Electricity, “Bayes” finds Mathematics → Statistics and Probability.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line/60">
          {results.map(({ topic }) => {
            const status = prog[topic.id]?.status ?? "not_started";
            const imp = IMPORTANCE_META[topic.importance];
            return (
              <li key={topic.id}>
                <button onClick={() => onOpen(topic)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-raise/70 transition-colors">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: subjectColors[topic.subject] }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-ink truncate">{topic.name}</span>
                    <span className="block text-[11.5px] font-semibold text-mute truncate">
                      {topic.subjectName} → U{topic.unitN} {topic.unitName}
                      {topic.category ? ` · ${topic.category}` : ""}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: STATUS_META[status].dot }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[status].dot }} aria-hidden="true" />
                    {STATUS_META[status].label}
                  </span>
                  <span className="inline-flex items-center h-5 px-1.5 rounded-md text-[10.5px] font-extrabold uppercase" style={{ color: imp.color, background: imp.wash }}>
                    {imp.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ================= topic detail modal ================= */

function TopicModal({ topic, progress, sessions, onClose }: { topic: FlatTopic; progress: TopicProgress | undefined; sessions: StudySession[]; onClose: () => void }) {
  const toast = useToast();
  const nav = useNavigate();
  const status = progress?.status ?? "not_started";
  const imp = IMPORTANCE_META[topic.importance];
  const sec = topicSeconds(sessions, topic.id);

  const [attempted, setAttempted] = useState(String(progress?.pyqAttempted ?? 0));
  const [correct, setCorrect] = useState(String(progress?.pyqCorrect ?? 0));
  const [pyqErr, setPyqErr] = useState<string | null>(null);
  const [notes, setNotes] = useState(progress?.notes ?? "");

  const a = Number(attempted) || 0;
  const c = Number(correct) || 0;
  const acc = a > 0 ? Math.round((Math.min(c, a) / a) * 100) : null;

  const saveNotes = () => {
    if (notes !== (progress?.notes ?? "")) {
      updateTopicFields(topic.id, { notes });
      toast({ title: "Notes saved" });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Topic details"
      wide
      footer={
        <>
          <Button
            variant="outline"
            icon={ListPlus}
            onClick={() => {
              addTask({
                title: `PYQ practice: ${topic.name}`,
                subjectId: null,
                dueDate: progress?.targetDate ?? null,
                priority: topic.importance,
              });
              toast({ title: "Task created", desc: `“PYQ practice: ${topic.name}” added to Tasks.` });
            }}
          >
            Create task
          </Button>
          <Button
            icon={Timer}
            onClick={() => {
              setPendingTopic(topic.id);
              onClose();
              nav("/study");
            }}
          >
            Study this topic
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* identity */}
        <div>
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-faint mb-1.5">
            {topic.subjectName} · Unit {topic.unitN} — {topic.unitName}
            {topic.category ? ` · ${topic.category} Chemistry` : ""}
          </p>
          <h3 className="font-display font-extrabold text-[21px] text-ink leading-tight">{topic.name}</h3>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-extrabold uppercase tracking-wide" style={{ color: imp.color, background: imp.wash }}>
              <Flag className="w-3 h-3" aria-hidden="true" /> {imp.label} priority
            </span>
            <span className="inline-flex items-center gap-2 text-[11.5px] font-bold text-mute">
              Trend
              <span className="w-20 h-1.5 rounded-full bg-line overflow-hidden inline-block">
                <span className="block h-full rounded-full" style={{ width: `${topic.trendScore}%`, background: imp.color }} />
              </span>
              <span className="tnum">{topic.trendScore}/100</span>
            </span>
            <span className="font-mono text-[10.5px] font-bold text-faint border border-line rounded px-1.5 py-0.5 bg-raise">{topic.id}</span>
          </div>
        </div>

        {/* why it matters */}
        <div className="rounded-xl border border-line bg-raise/50 p-3.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint mb-1">Why it matters</p>
          <p className="text-[13px] text-mute leading-relaxed">{importanceReason(topic)}</p>
        </div>

        {/* status */}
        <div>
          <p className="text-[13px] font-semibold text-ink mb-2">Topic status</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Set topic status">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => { setTopicStatus(topic.id, s); toast({ title: `Marked: ${STATUS_META[s].label}` }); }}
                aria-pressed={status === s}
                className={cx(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-bold border transition-all",
                  status === s ? "border-pine bg-pinewash text-pine shadow-sm" : "border-line text-mute hover:border-linex hover:text-ink"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[s].dot }} aria-hidden="true" />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[12px] text-faint font-semibold">
            <span>Study time: <strong className="text-mute tnum">{fmtDuration(sec)}</strong></span>
            {progress?.lastReviewed && <span>Last reviewed: <strong className="text-mute">{fmtDay(progress.lastReviewed, true)}</strong></span>}
            {progress?.lastPyqDate && <span>Last PYQ practice: <strong className="text-mute">{fmtDay(progress.lastPyqDate, true)}</strong></span>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* target + personal priority */}
          <div className="space-y-3.5">
            <Field label="Target date" hint="Optional — shows a due badge across the app">
              <Input
                type="date"
                value={progress?.targetDate ?? ""}
                onChange={(e) => updateTopicFields(topic.id, { targetDate: e.target.value || null })}
              />
            </Field>
            <Field label="Personal priority" hint="Your own override — the syllabus priority stays visible above">
              <Select
                value={progress?.personalPriority ?? ""}
                onChange={(e) =>
                  updateTopicFields(topic.id, { personalPriority: (e.target.value || null) as "low" | "medium" | "high" | null })
                }
              >
                <option value="">Follow syllabus ({imp.label})</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>

          {/* PYQ */}
          <div className="rounded-xl border border-line p-3.5">
            <p className="text-[13px] font-semibold text-ink mb-2.5">PYQ practice</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Attempted">
                <Input type="number" min={0} inputMode="numeric" value={attempted} onChange={(e) => { setAttempted(e.target.value); setPyqErr(null); }} />
              </Field>
              <Field label="Correct">
                <Input type="number" min={0} inputMode="numeric" value={correct} onChange={(e) => { setCorrect(e.target.value); setPyqErr(null); }} />
              </Field>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[12.5px] font-bold text-mute tnum">
                Accuracy: <strong className={cx(acc === null ? "text-faint" : acc >= 70 ? "text-moss" : acc >= 45 ? "text-ember" : "text-rust")}>{acc === null ? "—" : `${acc}%`}</strong>
                {a > 0 && <span className="text-faint font-semibold"> · {Math.max(0, a - c)} incorrect</span>}
              </p>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  const res = savePyq(topic.id, Number(attempted), Number(correct));
                  if (!res.ok) setPyqErr(res.error);
                  else { setPyqErr(null); toast({ title: "PYQ log saved", desc: acc === null ? undefined : `Accuracy ${acc}% on ${a} attempted.` }); }
                }}
              >
                Save PYQs
              </Button>
            </div>
            {pyqErr && <p className="text-xs font-medium text-rust mt-2" role="alert">{pyqErr}</p>}
            <p className="text-[11px] text-faint mt-2">Accuracy is calculated from your numbers — nothing is invented.</p>
          </div>
        </div>

        {/* notes */}
        <Field label="Notes" hint="Saved when you leave the field">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Formulas, traps, revision cues…" className="min-h-24" />
        </Field>
      </div>
    </Modal>
  );
}
