import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, CalendarCheck, Flame, Timer } from "lucide-react";
import { useApp } from "../store/store";
import {
  avgSessionSec,
  calcStreaks,
  consistencyPct,
  heatmapWeeks,
  subjectDistribution,
  subjectProgress,
  totalSec,
  weeklyTotals,
} from "../lib/stats";
import { dateKey, fmtDay, fmtDuration, fmtHours } from "../lib/utils";
import { BarChart, Donut, Heatmap, ProgressRows } from "../components/charts";
import { EmptyState, PageHeader, StatCard } from "../components/widgets";
import { Button } from "../components/ui";
import { useNavigate } from "react-router-dom";

export default function AnalyticsPage() {
  const { data } = useApp();
  const nav = useNavigate();

  const stats = useMemo(() => {
    if (!data) return null;
    const { sessions, subjects, chapters } = data;
    const streaks = calcStreaks(sessions);
    const weekly = weeklyTotals(sessions, 10);
    const dist = subjectDistribution(sessions, subjects);
    const heat = heatmapWeeks(sessions, 16);
    const rows = subjects
      .filter((s) => !s.archived)
      .map((s) => {
        const p = subjectProgress(chapters, s.id);
        return { label: s.name, color: s.color, done: p.done, total: p.total, pct: p.pct };
      })
      .filter((r) => r.total > 0);
    return { sessions, streaks, weekly, dist, heat, rows };
  }, [data]);

  if (!data || !stats) return null;
  const noData = stats.sessions.length === 0;

  return (
    <>
      <PageHeader title="Analytics" sub="Honest numbers from your logged sessions — no invented stats, ever." />

      {noData ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing to chart yet"
          body="Analytics light up once you log study time. Run a session with the timer or log one manually — weekly trends, subject split and your heatmap will appear here."
          action={<Button icon={Timer} onClick={() => nav("/study")}>Go to Study</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={Timer} label="Total time" value={fmtHours(totalSec(stats.sessions))} sub={`${fmtDuration(totalSec(stats.sessions))} exact`} />
            <StatCard icon={Activity} label="Sessions" value={String(stats.sessions.length)} sub={`Avg ${fmtDuration(avgSessionSec(stats.sessions))}`} accent="moss" />
            <StatCard icon={CalendarCheck} label="Consistency" value={`${consistencyPct(stats.sessions)}%`} sub="of last 14 days studied" />
            <StatCard icon={Flame} label="Current streak" value={`${stats.streaks.current} days`} sub={`Longest: ${stats.streaks.longest} · ${stats.streaks.totalDays} study days total`} accent="ember" />
          </div>

          <div className="grid lg:grid-cols-5 gap-4 items-start">
            <section className="card p-5 lg:col-span-3 anim-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-[16px] text-ink">Weekly study time</h2>
                <span className="text-[11px] font-bold text-faint uppercase tracking-wider">Last 10 weeks · Mon–Sun</span>
              </div>
              <BarChart
                data={stats.weekly.map((w) => ({ label: w.label, sec: w.sec, hint: `Week of ${w.label} — ${fmtDuration(w.sec)}` }))}
                height={168}
              />
            </section>

            <section className="card p-5 lg:col-span-2 anim-in">
              <h2 className="font-display font-bold text-[16px] text-ink mb-4">Subject split</h2>
              <div className="flex items-center gap-5 flex-wrap">
                <Donut
                  slices={stats.dist.slice(0, 6).map((d) => ({ name: d.name, color: d.color, value: d.sec }))}
                  centerTop={fmtHours(totalSec(stats.sessions))}
                  centerBottom="total"
                />
                <ul className="flex-1 min-w-36 space-y-2">
                  {stats.dist.slice(0, 6).map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} aria-hidden="true" />
                      <span className="text-ink font-semibold truncate flex-1">{d.name}</span>
                      <span className="text-mute tnum font-bold">{Math.round((d.sec / Math.max(1, totalSec(stats.sessions))) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="grid lg:grid-cols-5 gap-4 items-start">
            <section className="card p-5 lg:col-span-3 anim-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-[16px] text-ink">Consistency map</h2>
                <span className="text-[11px] font-bold text-faint uppercase tracking-wider">16 weeks</span>
              </div>
              <Heatmap weeks={stats.heat} />
            </section>

            <section className="card p-5 lg:col-span-2 anim-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-[16px] text-ink">Syllabus progress</h2>
                <Link to="/subjects" className="text-[12.5px] font-bold text-pine hover:underline">Subjects</Link>
              </div>
              {stats.rows.length === 0 ? (
                <p className="text-sm text-mute">Add chapters to your subjects to see completion bars here. <Link to="/subjects" className="text-pine font-bold hover:underline">Open subjects</Link></p>
              ) : (
                <ProgressRows rows={stats.rows} />
              )}
            </section>
          </div>

          <section className="card p-5 anim-in">
            <h2 className="font-display font-bold text-[16px] text-ink mb-4">Busiest days</h2>
            <BusiestDays />
          </section>
        </div>
      )}
    </>
  );
}

function BusiestDays() {
  const { data } = useApp();
  const top = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const s of data.sessions) {
      const k = dateKey(new Date(s.startedAt));
      map.set(k, (map.get(k) ?? 0) + s.durationSec);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);
  if (top.length === 0) return null;
  const max = top[0][1];
  return (
    <ul className="space-y-2.5">
      {top.map(([day, sec]) => (
        <li key={day} className="flex items-center gap-3">
          <span className="w-24 text-[12.5px] font-bold text-mute shrink-0">{fmtDay(day, true)}</span>
          <div className="flex-1 h-5 rounded-md bg-raise border border-line/70 overflow-hidden">
            <div className="h-full rounded-md bar-grow" style={{ width: `${(sec / max) * 100}%`, background: "color-mix(in srgb, var(--pine) 75%, var(--raise))" }} />
          </div>
          <span className="text-[12.5px] font-bold text-ink tnum w-16 text-right">{fmtDuration(sec)}</span>
        </li>
      ))}
    </ul>
  );
}
