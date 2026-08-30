import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Clock, Flame, ListTodo, Play, Sparkles, Timer, TrendingUp } from "lucide-react";
import { loadSampleData, startTimer, toggleTask, useApp } from "../store/store";
import {
  calcStreaks,
  dailyTotals,
  goalProgress,
  nextUp,
  subjectOf,
  subjectSeconds,
  syllabus,
  tasksDueToday,
  weekToDateSec,
} from "../lib/stats";
import { fmtDayLong, fmtDuration, fmtHours, timeGreeting, todayKey } from "../lib/utils";
import { secondsOnDay } from "../lib/stats";
import { Badge, Button, PriorityBadge, ProgressBar, Ring, SubjectGlyph } from "../components/ui";
import { BarChart } from "../components/charts";
import { EmptyState, PageHeader, SessionRow, StatCard, SubjectChip } from "../components/widgets";
import { PREP_TERMS } from "../data/presets";
import { useToast, Confirm } from "../components/overlays";
import { useState } from "react";
import { SYLLABUS } from "../data/syllabus";
import {
  overallAgg,
  pyqAgg,
  recommendedNext,
  setPendingTopic,
  subjectAgg,
  subjectColors,
} from "../lib/syllabusStats";
import { Badge, ProgressBar, Ring } from "../components/ui";
import { GraduationCap } from "lucide-react";

export default function Dashboard() {
  const { data } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [confirmSample, setConfirmSample] = useState(false);

  const stats = useMemo(() => {
    if (!data) return null;
    const { sessions, chapters, tasks, subjects, goals, profile } = data;
    const today = todayKey();
    const todaySec = secondsOnDay(sessions, today);
    const streaks = calcStreaks(sessions);
    const week = weekToDateSec(sessions);
    const syl = syllabus(chapters);
    const weekDays = dailyTotals(sessions, 7);
    const upNext = nextUp(chapters.filter((c) => subjects.some((s) => s.id === c.subjectId && !s.archived)));
    const due = tasksDueToday(tasks);
    const recent = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 4);
    const weekAgoDays = weekDays.slice(0, 6).reduce((a, d) => a + d.sec, 0);
    const goalPcts = goals.map((g) => ({ g, p: goalProgress(g, sessions, chapters, tasks) })).slice(0, 3);
    const bestSubject = [...subjects]
      .filter((s) => !s.archived)
      .map((s) => ({ s, sec: subjectSeconds(sessions.filter((x) => new Date(x.startedAt) > new Date(Date.now() - 7 * 86400000)), s.id) }))
      .sort((a, b) => b.sec - a.sec)[0];
    return { todaySec, streaks, week, syl, weekDays, upNext, due, recent, weekAgoDays, goalPcts, bestSubject, profile };
  }, [data]);

  if (!data || !stats) return null;
  const { profile } = stats;
  const terms = PREP_TERMS[profile.prepType];
  const dayGoalSec = profile.dailyGoalMin * 60;
  const isEmpty = data.subjects.length === 0 && data.sessions.length === 0 && data.tasks.length === 0;

  const insights: string[] = [];
  if (stats.week > stats.weekAgoDays && stats.weekAgoDays > 0) {
    insights.push(`You're up ${Math.round(((stats.week - stats.weekAgoDays) / stats.weekAgoDays) * 100)}% vs the previous 6 days. Momentum is real — protect it.`);
  } else if (stats.weekAgoDays > stats.week && stats.week > 0) {
    insights.push(`Pace is down vs earlier this week. One focused 25-minute block today resets the trend.`);
  }
  if (stats.bestSubject && stats.bestSubject.sec > 0) {
    insights.push(`${stats.bestSubject.s.name} took ${fmtHours(stats.bestSubject.sec)} of your last 7 days — ${
      stats.syl.total ? `it's at ${Math.round((stats.syl.done / Math.max(1, stats.syl.total)) * 100)}% overall syllabus.` : "nice focus."
    }`);
  }
  if (stats.streaks.current >= 3) {
    insights.push(`${stats.streaks.current}-day streak alive. Streaks survive on minimum viable days — even 15 minutes counts.`);
  }
  const overdue = data.chapters.filter((c) => !c.completed && c.targetDate && c.targetDate < todayKey());
  if (overdue.length > 0) insights.push(`${overdue.length} ${terms.unit}${overdue.length > 1 ? "s" : ""} passed ${overdue.length > 1 ? "their" : "its"} target date. Re-target or tackle first today.`);
  if (profile.prepType === "jee") {
    const jAgg = overallAgg(data.syllabus);
    if (jAgg.highRemaining > 0)
      insights.push(`${jAgg.highRemaining} high-priority JEE topics are still open — the Syllabus page ranks what to hit next by recent-paper trend.`);
  }
  if (insights.length === 0 && stats.syl.total > 0) insights.push(`Steady beats heroic: aim for ${fmtDuration(dayGoalSec)} today and the syllabus takes care of itself.`);
  if (insights.length === 0) insights.push("Tip: add your subjects and chapters first — everything in StudyNest gets smarter with a structured syllabus.");

  return (
    <>
      <PageHeader
        title={`${timeGreeting()}, ${profile.name.split(" ")[0]}.`}
        sub={`${fmtDayLong(todayKey())} · ${terms.exam} track · daily goal ${fmtDuration(dayGoalSec)}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={ListTodo} onClick={() => nav("/tasks")}>
              <span className="hidden sm:inline">New task</span>
            </Button>
            <Button size="sm" icon={Play} onClick={() => nav("/study")}>
              Start session
            </Button>
          </>
        }
      />

      {isEmpty && (
        <div className="card p-6 sm:p-8 mb-6 anim-in flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="w-13 h-13 rounded-2xl bg-pinewash text-pine inline-flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 className="font-display font-bold text-lg text-ink">Your nest is empty — let's fix that</h2>
            <p className="text-sm text-mute mt-1 max-w-xl">
              Create your first subject to start organizing the syllabus, or load a realistic sample workspace to explore every feature first.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setConfirmSample(true)}>
              Load sample data
            </Button>
            <Button onClick={() => nav("/subjects")}>Create subject</Button>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="card px-4 py-3.5 flex items-center gap-3.5 anim-in">
          <Ring pct={dayGoalSec ? (stats.todaySec / dayGoalSec) * 100 : 0} size={46} stroke={5} color={stats.todaySec >= dayGoalSec ? "var(--pine)" : "var(--ember)"}>
            <Clock className="w-4 h-4 text-mute" aria-hidden="true" />
          </Ring>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Today</p>
            <p className="font-display font-bold text-xl text-ink leading-tight tnum">{fmtDuration(stats.todaySec)}</p>
            <p className="text-[11px] text-mute tnum truncate">{dayGoalSec ? Math.round((stats.todaySec / dayGoalSec) * 100) : 0}% of goal</p>
          </div>
        </div>
        <StatCard icon={Flame} label="Streak" value={`${stats.streaks.current} day${stats.streaks.current === 1 ? "" : "s"}`} sub={`Best: ${stats.streaks.longest}`} accent="ember" />
        <StatCard icon={TrendingUp} label="This week" value={fmtDuration(stats.week)} sub={`${data.sessions.length} sessions total`} />
        <StatCard icon={BookOpen} label="Syllabus" value={`${stats.syl.pct}%`} sub={`${stats.syl.done}/${stats.syl.total} ${terms.unitPlural}`} accent="moss" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <section className="card p-5 anim-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-[16px] text-ink">Last 7 days</h2>
              <Link to="/analytics" className="text-[12.5px] font-bold text-pine hover:underline inline-flex items-center gap-1">
                Analytics <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
            {data.sessions.length === 0 ? (
              <EmptyState
                compact
                icon={Timer}
                title="No study time yet"
                body="Start your first study session to begin tracking your progress."
                action={<Button size="sm" icon={Play} onClick={() => nav("/study")}>Start timer</Button>}
              />
            ) : (
              <BarChart
                data={stats.weekDays.map((d) => ({ label: fmtWeekday(d.key), sec: d.sec, hint: `${fmtDayLong(d.key)} — ${fmtDuration(d.sec)}` }))}
                goalSec={dayGoalSec}
              />
            )}
          </section>

          <section className="card p-5 anim-in">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display font-bold text-[16px] text-ink">Today's tasks</h2>
              <Link to="/tasks" className="text-[12.5px] font-bold text-pine hover:underline inline-flex items-center gap-1">
                All tasks <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
            {stats.due.length === 0 ? (
              <p className="text-sm text-mute py-2 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-faint" aria-hidden="true" /> Nothing due today. Future-you says thanks.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {stats.due.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        toggleTask(t.id);
                        if (!t.completed) toast({ title: "Task done ✓", desc: t.title });
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line bg-surface hover:border-linex transition-colors text-left group"
                    >
                      <span className="w-4.5 h-4.5 rounded-md border-2 border-linex group-hover:border-pine transition-colors shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium text-ink flex-1 truncate">{t.title}</span>
                      <PriorityBadge p={t.priority} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 anim-in">
            <h2 className="font-display font-bold text-[16px] text-ink mb-3.5">Recent sessions</h2>
            {stats.recent.length === 0 ? (
              <p className="text-sm text-mute py-1">Sessions you complete will appear here.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {stats.recent.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    subject={subjectOf(data.subjects, s.subjectId)}
                    chapterTitle={data.chapters.find((c) => c.id === s.chapterId)?.title}
                    onDelete={() => undefined}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <section className="card p-5 anim-in relative overflow-hidden">
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emberwash" aria-hidden="true" />
            <h2 className="font-display font-bold text-[16px] text-ink relative">Consistency</h2>
            <div className="flex items-center gap-4 mt-3 relative">
              <span className="w-12 h-12 rounded-2xl bg-emberwash text-ember inline-flex items-center justify-center">
                <Flame className="w-6 h-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display font-extrabold text-[26px] leading-none text-ink tnum">
                  {stats.streaks.current} <span className="text-sm font-bold text-mute">day{stats.streaks.current === 1 ? "" : "s"}</span>
                </p>
                <p className="text-[12px] text-mute mt-1">A day counts with ≥ 1 minute studied</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4" aria-label="Last seven days activity">
              {stats.weekDays.map((d) => (
                <span
                  key={d.key}
                  title={`${fmtDayLong(d.key)}: ${fmtDuration(d.sec)}`}
                  className="flex-1 h-8 rounded-md"
                  style={{ background: d.sec > 0 ? "color-mix(in srgb, var(--ember) 65%, var(--raise))" : "var(--raise)", border: "1px solid var(--line)" }}
                />
              ))}
            </div>
          </section>

          <section className="card p-5 anim-in">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display font-bold text-[16px] text-ink">Up next</h2>
              <Link to="/subjects" className="text-[12.5px] font-bold text-pine hover:underline">
                Subjects
              </Link>
            </div>
            {stats.upNext.length === 0 ? (
              <p className="text-sm text-mute py-1">No open {terms.unitPlural}. Add more or enjoy the breather.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.upNext.map((c) => (
                  <li key={c.id}>
                    <Link to={`/subjects/${c.subjectId}`} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-raise transition-colors group">
                      <span className="w-8 h-8 rounded-lg text-white inline-flex items-center justify-center shrink-0 mt-0.5" style={{ background: subjectOf(data.subjects, c.subjectId)?.color ?? "var(--faint)" }}>
                        <SubjectGlyph icon={subjectOf(data.subjects, c.subjectId)?.icon ?? "book"} className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink leading-snug group-hover:text-pine transition-colors">{c.title}</span>
                        <span className="flex items-center gap-2 mt-1">
                          <SubjectChip subject={subjectOf(data.subjects, c.subjectId)} />
                          <PriorityBadge p={c.priority} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {stats.goalPcts.length > 0 && (
            <section className="card p-5 anim-in">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="font-display font-bold text-[16px] text-ink">Goals</h2>
                <Link to="/goals" className="text-[12.5px] font-bold text-pine hover:underline">
                  All goals
                </Link>
              </div>
              <ul className="space-y-3.5">
                {stats.goalPcts.map(({ g, p }) => (
                  <li key={g.id}>
                    <div className="flex justify-between text-[12.5px] mb-1">
                      <span className="font-semibold text-ink truncate mr-2">{g.title}</span>
                      <span className="font-bold text-mute tnum shrink-0">
                        {p.cur}/{p.target} {p.unit}
                      </span>
                    </div>
                    <ProgressBar pct={p.pct} color={p.achieved ? "var(--pine)" : "var(--ember)"} thin />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5 anim-in border-pine/25 bg-gradient-to-b from-pinewash/60 to-surface">
            <h2 className="font-display font-bold text-[16px] text-ink flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4.5 h-4.5 text-pine" aria-hidden="true" /> Insight
            </h2>
            <p className="text-[13.5px] text-mute leading-relaxed">{insights[0]}</p>
            <Link to="/assistant" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-pine hover:underline mt-3">
              Ask the assistant <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>

      <Confirm
        open={confirmSample}
        onClose={() => setConfirmSample(false)}
        onConfirm={() => {
          loadSampleData();
          toast({ title: "Sample workspace loaded", desc: "Clearly demo data — wipe it anytime from Settings → Data." });
        }}
        title="Load sample data?"
        body="This replaces your current subjects, chapters, tasks, sessions and goals with a realistic demo dataset. Your profile and settings stay."
        confirmLabel="Load sample"
      />
    </>
  );
}

function fmtWeekday(key: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(key + "T12:00:00").getDay()];
}
