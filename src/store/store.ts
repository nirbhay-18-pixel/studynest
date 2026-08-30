import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  AIConfig,
  AuthUser,
  Chapter,
  ChatMessage,
  Goal,
  PrepType,
  Priority,
  Profile,
  Result,
  StoredAccount,
  StudySession,
  Subject,
  Task,
  Theme,
  TimerState,
  UserData,
} from "../types";
import { keys, loadJSON, normalizeAccounts, normalizeUserData, removeKey, saveJSON } from "../lib/storage";
import { nowISO, todayKey, uid } from "../lib/utils";
import { generateSample } from "../data/sample";
import { askAssistant } from "../services/ai";

/* ================= state ================= */

export interface AppState {
  status: "boot" | "ready";
  user: AuthUser | null;
  data: UserData | null;
  chatBusy: boolean;
}

let state: AppState = { status: "boot", user: null, data: null, chatBusy: false };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getState = (): AppState => state;

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

/** Re-render on an interval while `active` — used by the timer (display only; math is timestamp-based). */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}

/* ================= helpers ================= */

async function sha256(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Non-secure context fallback (demo auth only — production uses Supabase Auth).
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return `fb_${(h >>> 0).toString(16)}`;
  }
}

const defaultTimer = (): TimerState => ({
  active: false,
  paused: false,
  startedAt: null,
  accumulatedSec: 0,
  subjectId: null,
  chapterId: null,
});

const defaultData = (name: string): UserData => ({
  profile: { name, prepType: "other", dailyGoalMin: 120, theme: "light", onboarded: false },
  subjects: [],
  chapters: [],
  tasks: [],
  sessions: [],
  goals: [],
  chat: [],
  timer: defaultTimer(),
  aiConfig: { endpoint: "", model: "", apiKey: "" },
  sample: false,
  createdAt: nowISO(),
});

function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle("dark", t === "dark");
  saveJSON(keys.theme, t);
}

function persist(): void {
  if (state.user && state.data) saveJSON(keys.data(state.user.id), state.data);
}

function commit(fn: (d: UserData) => UserData): void {
  if (!state.data) return;
  state = { ...state, data: fn(state.data) };
  persist();
  emit();
}

const pub = (a: StoredAccount): AuthUser => ({ id: a.id, name: a.name, email: a.email, createdAt: a.createdAt });

/* ================= boot ================= */

void (async function boot() {
  const sess = loadJSON<{ userId: string; exp: number } | null>(
    keys.session,
    (raw) => {
      const r = raw as { userId?: unknown; exp?: unknown } | null;
      return r && typeof r.userId === "string" && typeof r.exp === "number" ? { userId: r.userId, exp: r.exp } : null;
    },
    null
  );
  if (sess && sess.exp > Date.now()) {
    const accounts = loadJSON(keys.users, normalizeAccounts, []);
    const acc = accounts.find((a) => a.id === sess.userId);
    if (acc) {
      const data = loadJSON(keys.data(acc.id), normalizeUserData, null) ?? defaultData(acc.name);
      state = { status: "ready", user: pub(acc), data, chatBusy: false };
      applyTheme(data.profile.theme);
      return;
    }
  }
  state = { ...state, status: "ready" };
  emit();
})();

/* ================= auth ================= */

const accounts = (): StoredAccount[] => loadJSON(keys.users, normalizeAccounts, []);
const saveAccounts = (list: StoredAccount[]) => saveJSON(keys.users, list);

export async function signUp(name: string, email: string, password: string): Promise<Result> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2) return { ok: false, error: "Please enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return { ok: false, error: "That email address doesn't look valid." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const list = accounts();
  if (list.some((a) => a.email === cleanEmail)) return { ok: false, error: "An account with this email already exists. Try signing in." };
  const salt = uid();
  const acc: StoredAccount = {
    id: uid(),
    name: cleanName,
    email: cleanEmail,
    passHash: await sha256(salt + password),
    salt,
    createdAt: nowISO(),
  };
  saveAccounts([...list, acc]);
  saveJSON(keys.session, { userId: acc.id, exp: Date.now() + 30 * 86400000 });
  const data = defaultData(cleanName);
  state = { status: "ready", user: pub(acc), data, chatBusy: false };
  applyTheme(data.profile.theme);
  persist();
  emit();
  return { ok: true, value: undefined };
}

export async function signIn(email: string, password: string): Promise<Result> {
  const cleanEmail = email.trim().toLowerCase();
  const acc = accounts().find((a) => a.email === cleanEmail);
  if (!acc) return { ok: false, error: "No account found for this email. Create one first." };
  const hash = await sha256(acc.salt + password);
  if (hash !== acc.passHash) return { ok: false, error: "Incorrect password. Please try again." };
  saveJSON(keys.session, { userId: acc.id, exp: Date.now() + 30 * 86400000 });
  const data = loadJSON(keys.data(acc.id), normalizeUserData, null) ?? defaultData(acc.name);
  state = { status: "ready", user: pub(acc), data, chatBusy: false };
  applyTheme(data.profile.theme);
  emit();
  return { ok: true, value: undefined };
}

export function signOut(): void {
  removeKey(keys.session);
  state = { status: "ready", user: null, data: null, chatBusy: false };
  document.documentElement.classList.remove("dark");
  emit();
}

export function deleteAccount(): void {
  if (!state.user) return;
  saveAccounts(accounts().filter((a) => a.id !== state.user?.id));
  removeKey(keys.data(state.user.id));
  removeKey(keys.session);
  state = { status: "ready", user: null, data: null, chatBusy: false };
  document.documentElement.classList.remove("dark");
  emit();
}

/* ================= profile & settings ================= */

export function updateProfile(patch: Partial<Pick<Profile, "name" | "prepType" | "dailyGoalMin" | "onboarded">>): void {
  commit((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
}

export function completeOnboarding(prepType: PrepType, dailyGoalMin: number): void {
  commit((d) => ({ ...d, profile: { ...d.profile, prepType, dailyGoalMin, onboarded: true } }));
}

export function setTheme(t: Theme): void {
  commit((d) => ({ ...d, profile: { ...d.profile, theme: t } }));
  applyTheme(t);
}

export function setAIConfig(patch: Partial<AIConfig>): void {
  commit((d) => ({ ...d, aiConfig: { ...d.aiConfig, ...patch } }));
}

/* ================= subjects & chapters ================= */

export function addSubject(input: { name: string; color: string; icon: string; description: string }): Subject {
  const subject: Subject = {
    id: uid(),
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    description: input.description.trim(),
    archived: false,
    createdAt: nowISO(),
  };
  commit((d) => ({ ...d, subjects: [...d.subjects, subject] }));
  return subject;
}

export function updateSubject(id: string, patch: Partial<Omit<Subject, "id">>): void {
  commit((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
}

export function setSubjectArchived(id: string, archived: boolean): void {
  commit((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, archived } : s)) }));
}

export function deleteSubject(id: string): void {
  commit((d) => ({
    ...d,
    subjects: d.subjects.filter((s) => s.id !== id),
    chapters: d.chapters.filter((c) => c.subjectId !== id),
    tasks: d.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
  }));
}

export function addChapter(subjectId: string, input: { title: string; priority: Priority; targetDate: string | null }): Chapter {
  const chapter: Chapter = {
    id: uid(),
    subjectId,
    title: input.title.trim(),
    completed: false,
    completedAt: null,
    priority: input.priority,
    targetDate: input.targetDate,
    notes: "",
    createdAt: nowISO(),
  };
  commit((d) => ({ ...d, chapters: [...d.chapters, chapter] }));
  return chapter;
}

export function addChaptersBulk(subjectId: string, titles: string[], priority: Priority = "medium"): void {
  const now = nowISO();
  const rows: Chapter[] = titles.map((title) => ({
    id: uid(),
    subjectId,
    title: title.trim(),
    completed: false,
    completedAt: null,
    priority,
    targetDate: null,
    notes: "",
    createdAt: now,
  }));
  commit((d) => ({ ...d, chapters: [...d.chapters, ...rows] }));
}

export function updateChapter(id: string, patch: Partial<Omit<Chapter, "id">>): void {
  commit((d) => ({ ...d, chapters: d.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
}

export function toggleChapter(id: string): void {
  commit((d) => ({
    ...d,
    chapters: d.chapters.map((c) =>
      c.id === id ? { ...c, completed: !c.completed, completedAt: c.completed ? null : nowISO() } : c
    ),
  }));
}

export function deleteChapter(id: string): void {
  commit((d) => ({ ...d, chapters: d.chapters.filter((c) => c.id !== id) }));
}

/* ================= tasks ================= */

export function addTask(input: { title: string; subjectId: string | null; dueDate: string | null; priority: Priority }): Task {
  const task: Task = {
    id: uid(),
    title: input.title.trim(),
    subjectId: input.subjectId,
    dueDate: input.dueDate,
    priority: input.priority,
    completed: false,
    completedAt: null,
    createdAt: nowISO(),
  };
  commit((d) => ({ ...d, tasks: [...d.tasks, task] }));
  return task;
}

export function updateTask(id: string, patch: Partial<Omit<Task, "id">>): void {
  commit((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}

export function toggleTask(id: string): void {
  commit((d) => ({
    ...d,
    tasks: d.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, completedAt: t.completed ? null : nowISO() } : t)),
  }));
}

export function deleteTask(id: string): void {
  commit((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
}

/* ================= sessions & timer ================= */

export function logSession(input: {
  subjectId: string;
  chapterId: string | null;
  dateKeyStr: string;
  minutes: number;
  notes: string;
}): Result<StudySession> {
  if (!input.subjectId) return { ok: false, error: "Pick a subject for the session." };
  if (!input.dateKeyStr || input.dateKeyStr !== todayKey() && input.dateKeyStr > todayKey()) {
    return { ok: false, error: "Session date can't be in the future." };
  }
  const minutes = Math.round(input.minutes);
  if (!Number.isFinite(minutes) || minutes < 1) return { ok: false, error: "Duration must be at least 1 minute." };
  if (minutes > 24 * 60) return { ok: false, error: "A single session can't exceed 24 hours." };
  const [y, m, dd] = input.dateKeyStr.split("-").map(Number);
  const startedAt = new Date(y, m - 1, dd, new Date().getHours(), new Date().getMinutes()).toISOString();
  const session: StudySession = {
    id: uid(),
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    startedAt,
    durationSec: minutes * 60,
    notes: input.notes.trim(),
    createdAt: nowISO(),
  };
  commit((d) => ({ ...d, sessions: [...d.sessions, session] }));
  return { ok: true, value: session };
}

export function deleteSession(id: string): void {
  commit((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
}

export function timerElapsed(t: TimerState, nowMs: number = Date.now()): number {
  if (!t.active) return 0;
  const live = !t.paused && t.startedAt !== null ? Math.max(0, (nowMs - t.startedAt) / 1000) : 0;
  return t.accumulatedSec + live;
}

export function startTimer(subjectId: string, chapterId: string | null): void {
  commit((d) => ({
    ...d,
    timer: { active: true, paused: false, startedAt: Date.now(), accumulatedSec: 0, subjectId, chapterId },
  }));
}

export function pauseTimer(): void {
  commit((d) => {
    const t = d.timer;
    if (!t.active || t.paused || t.startedAt === null) return d;
    return { ...d, timer: { ...t, paused: true, accumulatedSec: t.accumulatedSec + (Date.now() - t.startedAt) / 1000, startedAt: null } };
  });
}

export function resumeTimer(): void {
  commit((d) => {
    const t = d.timer;
    if (!t.active || !t.paused) return d;
    return { ...d, timer: { ...t, paused: false, startedAt: Date.now() } };
  });
}

export function discardTimer(): void {
  commit((d) => ({ ...d, timer: { ...defaultTimer(), subjectId: d.timer.subjectId, chapterId: d.timer.chapterId } }));
}

export type StopResult = { ok: true; session: StudySession } | { ok: false; reason: "empty" | "short" };

export function stopTimer(note: string): StopResult {
  const t = state.data?.timer;
  if (!t || !t.active || !t.subjectId) return { ok: false, reason: "empty" };
  const sec = Math.floor(timerElapsed(t));
  if (sec < 30) {
    discardTimer();
    return { ok: false, reason: "short" };
  }
  const session: StudySession = {
    id: uid(),
    subjectId: t.subjectId,
    chapterId: t.chapterId,
    startedAt: new Date(Date.now() - sec * 1000).toISOString(),
    durationSec: sec,
    notes: note.trim(),
    createdAt: nowISO(),
  };
  commit((d) => ({
    ...d,
    sessions: [...d.sessions, session],
    timer: { ...defaultTimer(), subjectId: d.timer.subjectId, chapterId: d.timer.chapterId },
  }));
  return { ok: true, session };
}

/* ================= goals ================= */

export function addGoal(input: { title: string; kind: Goal["kind"]; target: number; deadline: string | null }): Goal {
  const goal: Goal = {
    id: uid(),
    title: input.title.trim(),
    kind: input.kind,
    target: Math.max(1, Math.round(input.target)),
    deadline: input.deadline,
    createdAt: nowISO(),
  };
  commit((d) => ({ ...d, goals: [...d.goals, goal] }));
  return goal;
}

export function deleteGoal(id: string): void {
  commit((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
}

/* ================= assistant chat ================= */

export async function sendChat(text: string): Promise<void> {
  const d = state.data;
  if (!d || !text.trim()) return;
  const userMsg: ChatMessage = { id: uid(), role: "user", content: text.trim(), createdAt: nowISO() };
  commit((cur) => ({ ...cur, chat: [...cur.chat, userMsg] }));
  state = { ...state, chatBusy: true };
  emit();
  try {
    const content = await askAssistant(
      [...state.data!.chat],
      {
        profile: state.data!.profile,
        subjects: state.data!.subjects,
        chapters: state.data!.chapters,
        tasks: state.data!.tasks,
        sessions: state.data!.sessions,
        goals: state.data!.goals,
      },
      state.data!.aiConfig
    );
    commit((cur) => ({
      ...cur,
      chat: [...cur.chat, { id: uid(), role: "assistant", content, createdAt: nowISO() }],
    }));
  } catch (err) {
    commit((cur) => ({
      ...cur,
      chat: [
        ...cur.chat,
        {
          id: uid(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong while contacting the assistant.",
          createdAt: nowISO(),
          error: true,
        },
      ],
    }));
  } finally {
    state = { ...state, chatBusy: false };
    emit();
  }
}

export function clearChat(): void {
  commit((d) => ({ ...d, chat: [] }));
}

/* ================= data management ================= */

export function loadSampleData(): void {
  const sample = generateSample();
  commit((d) => ({ ...d, ...sample, sample: true }));
}

export function clearAllData(): void {
  commit((d) => ({
    ...d,
    subjects: [],
    chapters: [],
    tasks: [],
    sessions: [],
    goals: [],
    chat: [],
    timer: defaultTimer(),
    sample: false,
  }));
}

export function exportJSON(): string {
  return JSON.stringify(state.data, null, 2);
}
