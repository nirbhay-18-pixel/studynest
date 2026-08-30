import type { StoredAccount, UserData } from "../types";

/**
 * Centralized storage layer.
 *
 * Everything that touches localStorage goes through this module so that:
 *  - malformed / corrupted JSON never crashes the app (validated + defaulted),
 *  - keys are namespaced and versioned,
 *  - the backing store can later be swapped for Supabase without touching the UI
 *    (see supabase/schema.sql — the shapes below mirror those tables 1:1).
 */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function loadJSON<T>(key: string, validate: (raw: unknown) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    const valid = validate(parsed);
    return valid ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — app keeps working in memory.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export const keys = {
  users: "sn.users.v1",
  session: "sn.session.v1",
  theme: "sn.theme",
  data: (userId: string) => `sn.data.${userId}.v1`,
};

/* ---------- validators ---------- */

const str = (v: unknown, dflt: string): string => (typeof v === "string" ? v : dflt);
const num = (v: unknown, dflt: number): number => (typeof v === "number" && Number.isFinite(v) ? v : dflt);
const bool = (v: unknown, dflt: boolean): boolean => (typeof v === "boolean" ? v : dflt);

function list<T>(v: unknown, map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  return v.map(map).filter((x): x is T => x !== null);
}

export function normalizeAccounts(raw: unknown): StoredAccount[] {
  return list(raw, (a) => {
    if (!isObj(a) || typeof a.id !== "string" || typeof a.email !== "string") return null;
    return {
      id: a.id,
      name: str(a.name, "Student"),
      email: a.email.toLowerCase(),
      passHash: str(a.passHash, ""),
      salt: str(a.salt, ""),
      createdAt: str(a.createdAt, new Date().toISOString()),
    };
  });
}

export function normalizeUserData(raw: unknown): UserData | null {
  if (!isObj(raw)) return null;
  const p = isObj(raw.profile) ? raw.profile : {};
  const theme = p.theme === "dark" ? "dark" : "light";
  const prep = ["jee", "neet", "upsc", "school", "college", "coding", "other"].includes(p.prepType as string)
    ? (p.prepType as UserData["profile"]["prepType"])
    : "other";
  const timer = isObj(raw.timer) ? raw.timer : {};
  const ai = isObj(raw.aiConfig) ? raw.aiConfig : {};

  return {
    profile: {
      name: str(p.name, "Student"),
      prepType: prep,
      dailyGoalMin: num(p.dailyGoalMin, 120),
      theme,
      onboarded: bool(p.onboarded, false),
    },
    subjects: list(raw.subjects, (s) => {
      if (!isObj(s) || typeof s.id !== "string") return null;
      return {
        id: s.id,
        name: str(s.name, "Untitled subject"),
        color: str(s.color, "#1f5b46"),
        icon: str(s.icon, "book"),
        description: str(s.description, ""),
        archived: bool(s.archived, false),
        createdAt: str(s.createdAt, new Date().toISOString()),
      };
    }),
    chapters: list(raw.chapters, (c) => {
      if (!isObj(c) || typeof c.id !== "string" || typeof c.subjectId !== "string") return null;
      const pr = ["low", "medium", "high"].includes(c.priority as string) ? (c.priority as "low" | "medium" | "high") : "medium";
      return {
        id: c.id,
        subjectId: c.subjectId,
        title: str(c.title, "Untitled topic"),
        completed: bool(c.completed, false),
        completedAt: typeof c.completedAt === "string" ? c.completedAt : null,
        priority: pr,
        targetDate: typeof c.targetDate === "string" ? c.targetDate : null,
        notes: str(c.notes, ""),
        createdAt: str(c.createdAt, new Date().toISOString()),
      };
    }),
    tasks: list(raw.tasks, (t) => {
      if (!isObj(t) || typeof t.id !== "string") return null;
      const pr = ["low", "medium", "high"].includes(t.priority as string) ? (t.priority as "low" | "medium" | "high") : "medium";
      return {
        id: t.id,
        title: str(t.title, "Untitled task"),
        subjectId: typeof t.subjectId === "string" ? t.subjectId : null,
        dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
        priority: pr,
        completed: bool(t.completed, false),
        completedAt: typeof t.completedAt === "string" ? t.completedAt : null,
        createdAt: str(t.createdAt, new Date().toISOString()),
      };
    }),
    sessions: list(raw.sessions, (s) => {
      if (!isObj(s) || typeof s.id !== "string" || typeof s.subjectId !== "string") return null;
      const dur = num(s.durationSec, 0);
      if (dur <= 0) return null;
      return {
        id: s.id,
        subjectId: s.subjectId,
        chapterId: typeof s.chapterId === "string" ? s.chapterId : null,
        topicRefId: typeof s.topicRefId === "string" ? s.topicRefId : null,
        startedAt: str(s.startedAt, new Date().toISOString()),
        durationSec: Math.round(dur),
        notes: str(s.notes, ""),
        createdAt: str(s.createdAt, new Date().toISOString()),
      };
    }),
    goals: list(raw.goals, (g) => {
      if (!isObj(g) || typeof g.id !== "string") return null;
      const kind = ["hours", "chapters", "sessions", "streak", "tasks"].includes(g.kind as string)
        ? (g.kind as UserData["goals"][number]["kind"])
        : "hours";
      return {
        id: g.id,
        title: str(g.title, "Untitled goal"),
        kind,
        target: Math.max(1, num(g.target, 1)),
        deadline: typeof g.deadline === "string" ? g.deadline : null,
        createdAt: str(g.createdAt, new Date().toISOString()),
      };
    }),
    chat: list(raw.chat, (m) => {
      if (!isObj(m) || typeof m.id !== "string") return null;
      return {
        id: m.id,
        role: m.role === "user" ? "user" : "assistant",
        content: str(m.content, ""),
        createdAt: str(m.createdAt, new Date().toISOString()),
        error: bool(m.error, false),
      } as UserData["chat"][number];
    }),
    timer: {
      active: bool(timer.active, false),
      paused: bool(timer.paused, false),
      startedAt: typeof timer.startedAt === "number" ? timer.startedAt : null,
      accumulatedSec: Math.max(0, num(timer.accumulatedSec, 0)),
      subjectId: typeof timer.subjectId === "string" ? timer.subjectId : null,
      chapterId: typeof timer.chapterId === "string" ? timer.chapterId : null,
      topicRefId: typeof timer.topicRefId === "string" ? timer.topicRefId : null,
    },
    aiConfig: {
      endpoint: str(ai.endpoint, ""),
      model: str(ai.model, ""),
      apiKey: str(ai.apiKey, ""),
    },
    syllabus: normalizeSyllabus(raw.syllabus),
    sample: bool(raw.sample, false),
    createdAt: str(raw.createdAt, new Date().toISOString()),
  };
}

/** Validate the per-topic progress map; malformed entries are repaired, never trusted. */
function normalizeSyllabus(raw: unknown): UserData["syllabus"] {
  const out: UserData["syllabus"] = {};
  if (!isObj(raw)) return out;
  const STATUSES = ["not_started", "learning", "practicing", "revision", "completed"];
  const PRIORITIES = ["low", "medium", "high"];
  for (const [refId, v] of Object.entries(raw)) {
    if (typeof refId !== "string" || !isObj(v)) continue;
    out[refId] = {
      status: STATUSES.includes(v.status as string) ? (v.status as UserData["syllabus"][string]["status"]) : "not_started",
      notes: str(v.notes, ""),
      targetDate: typeof v.targetDate === "string" ? v.targetDate : null,
      personalPriority: PRIORITIES.includes(v.personalPriority as string)
        ? (v.personalPriority as "low" | "medium" | "high")
        : null,
      pyqAttempted: Math.max(0, Math.round(num(v.pyqAttempted, 0))),
      pyqCorrect: Math.max(0, Math.round(num(v.pyqCorrect, 0))),
      lastPyqDate: typeof v.lastPyqDate === "string" ? v.lastPyqDate : null,
      lastReviewed: typeof v.lastReviewed === "string" ? v.lastReviewed : null,
      updatedAt: str(v.updatedAt, new Date().toISOString()),
    };
  }
  return out;
}
