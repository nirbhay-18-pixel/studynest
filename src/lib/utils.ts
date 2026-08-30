import { format, parseISO, differenceInCalendarDays, startOfDay, isValid } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export const uid = (): string => uuidv4();
export const nowISO = (): string => new Date().toISOString();

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- dates ---------- */

export const dateKey = (d: Date): string => format(d, "yyyy-MM-dd");
export const todayKey = (): string => dateKey(new Date());

export function parseKey(key: string): Date {
  const d = parseISO(key);
  return isValid(d) ? d : new Date();
}

export const isValidKey = (key: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(key) && isValid(parseISO(key));

export const notFutureKey = (key: string): boolean =>
  differenceInCalendarDays(parseISO(key), startOfDay(new Date())) <= 0;

export function fmtDay(key: string, withYear = false): string {
  return format(parseKey(key), withYear ? "MMM d, yyyy" : "MMM d");
}

export function fmtDayLong(key: string): string {
  return format(parseKey(key), "EEEE, MMMM d");
}

export function relDue(key: string): { label: string; tone: "overdue" | "today" | "soon" | "later" } {
  const diff = differenceInCalendarDays(parseISO(key), startOfDay(new Date()));
  if (diff < 0) return { label: `${-diff}d overdue`, tone: "overdue" };
  if (diff === 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  if (diff <= 7) return { label: `In ${diff} days`, tone: "soon" };
  return { label: format(parseISO(key), "MMM d"), tone: "later" };
}

export const daysUntil = (key: string): number => differenceInCalendarDays(parseISO(key), startOfDay(new Date()));

/* ---------- durations ---------- */

export function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return sec > 0 ? "<1m" : "0m";
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m % 60}m`;
}

export function fmtHours(sec: number): string {
  const h = sec / 3600;
  if (h === 0) return "0h";
  if (h < 10) return `${(Math.round(h * 10) / 10).toString().replace(/\.0$/, "")}h`;
  return `${Math.round(h)}h`;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export function fmtTimeOfDay(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/* ---------- misc ---------- */

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function downloadFile(filename: string, text: string, type = "application/json"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
