import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { Chapter, Goal, GoalKind, StudySession, Subject, Task } from "../types";
import { dateKey, parseKey, todayKey } from "./utils";

const MIN_SESSION_SEC = 60; // a day only counts toward streaks with >= 1 min studied

export const totalSec = (sessions: StudySession[]): number => sessions.reduce((a, s) => a + s.durationSec, 0);

export const secondsOnDay = (sessions: StudySession[], key: string): number =>
  sessions.reduce((a, s) => (dateKey(new Date(s.startedAt)) === key ? a + s.durationSec : a), 0);

export const lastNDayKeys = (n: number): string[] => {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dateKey(addDays(new Date(), -i)));
  return out;
};

export function weekToDateSec(sessions: StudySession[]): number {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return sessions.reduce((a, s) => (new Date(s.startedAt) >= start ? a + s.durationSec : a), 0);
}

/* ---------- streaks ---------- */

export interface Streaks {
  current: number;
  longest: number;
  totalDays: number;
}

export function calcStreaks(sessions: StudySession[]): Streaks {
  const days = new Set(
    sessions.filter((s) => s.durationSec >= MIN_SESSION_SEC).map((s) => dateKey(new Date(s.startedAt)))
  );
  if (days.size === 0) return { current: 0, longest: 0, totalDays: 0 };
  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseKey(sorted[i - 1]);
    run = dateKey(addDays(prev, 1)) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  let current = 0;
  let cursor = startOfDay(new Date());
  if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1); // today not studied yet: streak still alive
  while (days.has(dateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, totalDays: days.size };
}

/* ---------- syllabus ---------- */

export function subjectProgress(chapters: Chapter[], subjectId: string): { done: number; total: number; pct: number } {
  const own = chapters.filter((c) => c.subjectId === subjectId);
  const done = own.filter((c) => c.completed).length;
  return { done, total: own.length, pct: own.length ? Math.round((done / own.length) * 100) : 0 };
}

export const subjectSeconds = (sessions: StudySession[], subjectId: string): number =>
  sessions.reduce((a, s) => (s.subjectId === subjectId ? a + s.durationSec : a), 0);

export function syllabus(chapters: Chapter[]): { done: number; total: number; pct: number } {
  const done = chapters.filter((c) => c.completed).length;
  return { done, total: chapters.length, pct: chapters.length ? Math.round((done / chapters.length) * 100) : 0 };
}

export const subjectOf = (subjects: Subject[], id: string | null): Subject | undefined =>
  subjects.find((s) => s.id === id);

export const chapterOf = (chapters: Chapter[], id: string | null): Chapter | undefined =>
  chapters.find((c) => c.id === id);

/** Rank incomplete chapters: high priority first, then nearest target date. */
export function nextUp(chapters: Chapter[], limit = 3): Chapter[] {
  const w = { high: 0, medium: 1, low: 2 } as const;
  return chapters
    .filter((c) => !c.completed)
    .sort((a, b) => {
      const p = w[a.priority] - w[b.priority];
      if (p !== 0) return p;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate) return -1;
      if (b.targetDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, limit);
}

/* ---------- goals ---------- */

export interface GoalProgress {
  cur: number;
  target: number;
  pct: number;
  unit: string;
  achieved: boolean;
  windowLabel: string;
}

export function goalProgress(
  goal: Goal,
  sessions: StudySession[],
  chapters: Chapter[],
  tasks: Task[]
): GoalProgress {
  const now = new Date();
  const from = startOfMonth(now);
  const to = goal.deadline ? startOfDay(parseISO(goal.deadline)) : now;
  const inWindow = (iso: string | null): boolean => {
    if (!iso) return false;
    const d = new Date(iso);
    return isWithinInterval(d, { start: from, end: to > now ? now : to });
  };
  const monthLabel = to > now ? "this month" : `by ${goal.deadline}`;

  let cur = 0;
  let unit = "";
  let target = goal.target;
  let windowLabel = monthLabel;

  switch (goal.kind) {
    case "hours": {
      const sec = sessions.reduce((a, s) => (inWindow(s.startedAt) ? a + s.durationSec : a), 0);
      cur = Math.round((sec / 3600) * 10) / 10;
      unit = "hrs";
      break;
    }
    case "chapters":
      cur = chapters.filter((c) => c.completed && inWindow(c.completedAt)).length;
      unit = "chapters";
      break;
    case "sessions":
      cur = sessions.filter((s) => inWindow(s.startedAt)).length;
      unit = "sessions";
      break;
    case "tasks":
      cur = tasks.filter((t) => t.completed && inWindow(t.completedAt)).length;
      unit = "tasks";
      break;
    case "streak": {
      cur = calcStreaks(sessions).current;
      unit = "days";
      windowLabel = "right now";
      break;
    }
  }
  const pct = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 0;
  return { cur, target, pct, unit, achieved: pct >= 100, windowLabel };
}

export const GOAL_KIND_META: Record<GoalKind, { label: string; unit: string; hint: string }> = {
  hours: { label: "Study hours", unit: "hours", hint: "Logged session time this month" },
  chapters: { label: "Chapters finished", unit: "chapters", hint: "Chapters marked complete this month" },
  sessions: { label: "Sessions", unit: "sessions", hint: "Study sessions this month" },
  streak: { label: "Day streak", unit: "days", hint: "Consecutive study days (≥ 1 min)" },
  tasks: { label: "Tasks completed", unit: "tasks", hint: "Tasks checked off this month" },
};

/* ---------- analytics aggregates ---------- */

export function dailyTotals(sessions: StudySession[], days: number): Array<{ key: string; sec: number }> {
  return lastNDayKeys(days).map((key) => ({ key, sec: secondsOnDay(sessions, key) }));
}

export function weeklyTotals(sessions: StudySession[], weeks: number): Array<{ label: string; sec: number }> {
  const out: Array<{ label: string; sec: number }> = [];
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const end = addDays(start, 7);
    const sec = sessions.reduce((a, s) => {
      const d = new Date(s.startedAt);
      return d >= start && d < end ? a + s.durationSec : a;
    }, 0);
    out.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, sec });
  }
  return out;
}

export function heatmapWeeks(
  sessions: StudySession[],
  weeks: number
): Array<{ cells: Array<{ key: string; sec: number }> }> {
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const out: Array<{ cells: Array<{ key: string; sec: number }> }> = [];
  const perDay = new Map<string, number>();
  for (const s of sessions) {
    const k = dateKey(new Date(s.startedAt));
    perDay.set(k, (perDay.get(k) ?? 0) + s.durationSec);
  }
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const cells = Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, d);
      const key = dateKey(day);
      return { key, sec: day > new Date() ? -1 : (perDay.get(key) ?? 0) };
    });
    out.push({ cells });
  }
  return out;
}

export function subjectDistribution(
  sessions: StudySession[],
  subjects: Subject[]
): Array<{ id: string; name: string; color: string; sec: number }> {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.durationSec);
  const rows = [...map.entries()]
    .map(([id, sec]) => {
      const sub = subjects.find((s) => s.id === id);
      return { id, name: sub?.name ?? "Removed subject", color: sub?.color ?? "#8b978a", sec };
    })
    .sort((a, b) => b.sec - a.sec);
  return rows;
}

export const avgSessionSec = (sessions: StudySession[]): number =>
  sessions.length ? Math.round(totalSec(sessions) / sessions.length) : 0;

export function consistencyPct(sessions: StudySession[], days = 14): number {
  const keys = lastNDayKeys(days);
  const studied = keys.filter((k) => secondsOnDay(sessions, k) >= MIN_SESSION_SEC).length;
  return Math.round((studied / days) * 100);
}

export function overdueChapters(chapters: Chapter[]): Chapter[] {
  const today = todayKey();
  return chapters.filter((c) => !c.completed && c.targetDate && c.targetDate < today);
}

export function tasksDueToday(tasks: Task[]): Task[] {
  const today = todayKey();
  return tasks
    .filter((t) => !t.completed && t.dueDate && differenceInCalendarDays(parseISO(t.dueDate), startOfDay(new Date())) <= 0)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}
