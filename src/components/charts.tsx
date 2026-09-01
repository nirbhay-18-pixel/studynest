import { cx, fmtDay, fmtDuration } from "../lib/utils";

/* All charts are hand-rolled SVG/div — no chart library, keeps the visual language exact. */

/* ---------- Vertical day/week bars ---------- */

export function BarChart({
  data,
  goalSec,
  height = 132,
  showLabels = true,
}: {
  data: Array<{ label: string; sec: number; hint: string }>;
  goalSec?: number;
  height?: number;
  showLabels?: boolean;
}) {
  const max = Math.max(goalSec ?? 0, ...data.map((d) => d.sec), 1);
  return (
    <div>
      <div className="relative flex items-end gap-[6px]" style={{ height }}>
        {goalSec !== undefined && goalSec > 0 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-ember/50 z-0 pointer-events-none"
            style={{ bottom: `${(goalSec / max) * 100}%` }}
            title={`Daily goal: ${fmtDuration(goalSec)}`}
          />
        )}
        {data.map((d, i) => {
          const h = Math.max(d.sec > 0 ? 4 : 2, (d.sec / max) * 100);
          const isToday = i === data.length - 1;
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end group relative min-w-0">
              <div
                className={cx("w-full rounded-t-[4px] transition-all duration-500 group-hover:brightness-110", d.sec === 0 && "opacity-60")}
                style={{
                  height: `${h}%`,
                  background: isToday ? "var(--ember)" : d.sec === 0 ? "var(--linex)" : "var(--pine)",
                }}
                title={d.hint}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-[6px] mt-1.5">
          {data.map((d, i) => (
            <span key={i} className="flex-1 text-center text-[10px] font-semibold text-faint truncate">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Donut ---------- */

export function Donut({
  slices,
  size = 168,
  thickness = 22,
  centerTop,
  centerBottom,
}: {
  slices: Array<{ name: string; color: string; value: number }>;
  size?: number;
  thickness?: number;
  centerTop: string;
  centerBottom: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--raise)" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const off = acc * c;
            acc += frac;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, dash - 2)} ${c - dash + 2}`}
                strokeDashoffset={-off}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray 0.7s ease" }}
              >
                <title>{`${s.name}: ${fmtDuration(s.value)}`}</title>
              </circle>
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-extrabold text-[20px] text-ink tnum leading-none">{centerTop}</span>
        <span className="text-[11px] font-semibold text-faint mt-1">{centerBottom}</span>
      </div>
    </div>
  );
}

/* ---------- GitHub-style heatmap ---------- */

export function Heatmap({ weeks }: { weeks: Array<{ cells: Array<{ key: string; sec: number }> }> }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex gap-[3px]">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.cells.map((cell) => (
              <div
                key={cell.key}
                title={`${fmtDay(cell.key, true)} — ${cell.sec < 0 ? "upcoming" : cell.sec === 0 ? "no study" : fmtDuration(cell.sec)}`}
                className="w-[13px] h-[13px] rounded-[3.5px] border border-line/60 transition-colors hover:scale-125 hover:border-pine"
                style={{ background: cell.sec < 0 ? "transparent" : heatColor(cell.sec) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-faint">
        Less
        {[0, 20, 70, 140, 240].map((m) => (
          <span key={m} className="w-[13px] h-[13px] rounded-[3.5px] border border-line/60" style={{ background: heatColor(m * 60) }} />
        ))}
        More
      </div>
    </div>
  );
}

function heatColor(sec: number): string {
  if (sec <= 0) return "var(--raise)";
  const m = sec / 60;
  if (m < 30) return "color-mix(in srgb, var(--pine) 32%, var(--raise))";
  if (m < 90) return "color-mix(in srgb, var(--pine) 58%, var(--raise))";
  if (m < 180) return "color-mix(in srgb, var(--pine) 80%, var(--raise))";
  return "var(--pine)";
}

/* ---------- Horizontal progress rows ---------- */

export function ProgressRows({
  rows,
}: {
  rows: Array<{ label: string; color: string; done: number; total: number; pct: number }>;
}) {
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between text-[13px] mb-1.5">
            <span className="font-semibold text-ink flex items-center gap-2 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} aria-hidden="true" />
              {r.label}
            </span>
            <span className="text-xs font-bold text-mute tnum ml-3 shrink-0">
              {r.done}/{r.total} · {r.pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-raise border border-line/70 overflow-hidden">
            <div className="h-full rounded-full bar-grow" style={{ width: `${r.pct}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
