import type { FlatTopic, SubjectCode, SyllabusSubjectDef } from "../data/syllabus/types";
import { FLAT_TOPICS, SYLLABUS } from "../data/syllabus";
import type { StudySession, TopicProgress, TopicStatus } from "../types";

/* ---------- metadata ---------- */

export const STATUS_META: Record<TopicStatus, { label: string; short: string; dot: string }> = {
  not_started: { label: "Not Started", short: "New", dot: "var(--faint)" },
  learning: { label: "Learning", short: "Learning", dot: "var(--ember)" },
  practicing: { label: "Practicing", short: "Practicing", dot: "var(--pine)" },
  revision: { label: "Revision", short: "Revision", dot: "var(--moss)" },
  completed: { label: "Completed", short: "Done", dot: "var(--pinedeep)" },
};

export const STATUS_ORDER: TopicStatus[] = ["not_started", "learning", "practicing", "revision", "completed"];

export const IMPORTANCE_META: Record<FlatTopic["importance"], { label: string; color: string; wash: string; rank: number }> = {
  high: { label: "High", color: "var(--rust)", wash: "var(--rustwash)", rank: 0 },
  medium: { label: "Medium", color: "var(--ember)", wash: "var(--emberwash)", rank: 1 },
  low: { label: "Low", color: "var(--moss)", wash: "var(--mossash)", rank: 2 },
};

/** Honest default explanations — never phrased as predictions or guarantees. */
export function importanceReason(t: FlatTopic): string {
  if (t.reason) return t.reason;
  switch (t.importance) {
    case "high":
      return "High priority because this area has appeared consistently across recent JEE Main papers (2024–2026 trend).";
    case "medium":
      return "Medium priority — this area shows up regularly but less predictably in recent papers.";
    default:
      return "Lower recent-paper frequency, but it remains part of the official syllabus — keep it on your coverage list.";
  }
}

/* ---------- progress ---------- */

export interface ProgAgg {
  total: number;
  completed: number;
  pct: number;
  highRemaining: number;
  learning: number; // learning + practicing
  revisionPending: number; // status === revision (learned, awaiting revision)
  notStarted: number;
}

export function statusOf(p: TopicProgress | undefined): TopicStatus {
  return p?.status ?? "not_started";
}

export const isCompleted = (p: TopicProgress | undefined): boolean => statusOf(p) === "completed";

function aggregate(topics: FlatTopic[], prog: Record<string, TopicProgress>): ProgAgg {
  let completed = 0;
  let highRemaining = 0;
  let learning = 0;
  let revisionPending = 0;
  let notStarted = 0;
  for (const t of topics) {
    const s = statusOf(prog[t.id]);
    if (s === "completed") completed++;
    else {
      if (t.importance === "high") highRemaining++;
      if (s === "learning" || s === "practicing") learning++;
      else if (s === "revision") revisionPending++;
      else notStarted++;
    }
  }
  const total = topics.length;
  return {
    total,
    completed,
    pct: total ? Math.round((completed / total) * 100) : 0,
    highRemaining,
    learning,
    revisionPending,
    notStarted,
  };
}

export const subjectAgg = (code: SubjectCode, prog: Record<string, TopicProgress>): ProgAgg =>
  aggregate(FLAT_TOPICS.filter((t) => t.subject === code), prog);

export const overallAgg = (prog: Record<string, TopicProgress>): ProgAgg => aggregate(FLAT_TOPICS, prog);

export const unitAgg = (code: SubjectCode, unitN: number, prog: Record<string, TopicProgress>): ProgAgg =>
  aggregate(FLAT_TOPICS.filter((t) => t.subject === code && t.unitN === unitN), prog);

/* ---------- PYQ aggregates ---------- */

export interface PyqAgg {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number | null; // null when nothing attempted — never fake a number
}

export function pyqAgg(prog: Record<string, TopicProgress>, topics: FlatTopic[] = FLAT_TOPICS): PyqAgg {
  let attempted = 0;
  let correct = 0;
  for (const t of topics) {
    const p = prog[t.id];
    if (!p) continue;
    attempted += p.pyqAttempted;
    correct += Math.min(p.pyqCorrect, p.pyqAttempted);
  }
  return {
    attempted,
    correct,
    incorrect: Math.max(0, attempted - correct),
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
  };
}

/* ---------- study time per topic (derived, never stored) ---------- */

export const topicSeconds = (sessions: StudySession[], refId: string): number =>
  sessions.reduce((a, s) => (s.topicRefId === refId ? a + s.durationSec : a), 0);

/* ---------- recommendation engine ---------- */

export interface Recommendation {
  topic: FlatTopic;
  reason: string;
}

const IMP_W = { high: 3, medium: 2, low: 1 } as const;
const STATUS_W: Record<TopicStatus, number> = {
  not_started: 30,
  learning: 22,
  practicing: 15,
  revision: 8,
  completed: -1000, // never recommend completed topics
};

const today = (): string => new Date().toISOString().slice(0, 10);

/** Rank open topics: HIGH + untouched first, then in-flight momentum, then overdue targets. */
export function recommendedNext(prog: Record<string, TopicProgress>, limit = 3): Recommendation[] {
  const scored = FLAT_TOPICS.map((t) => {
    const s = statusOf(prog[t.id]);
    let score = IMP_W[t.importance] * 26 + STATUS_W[s] + t.trendScore * 0.25;
    const target = prog[t.id]?.targetDate;
    if (target && target <= today() && s !== "completed") score += 24;
    return { t, s, score };
  })
    .filter((x) => x.s !== "completed")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ t, s }) => ({ topic: t, reason: reasonFor(t, s) }));
}

function reasonFor(t: FlatTopic, s: TopicStatus): string {
  const imp = IMPORTANCE_META[t.importance].label;
  switch (s) {
    case "not_started":
      return `${imp} priority and not started.`;
    case "learning":
      return `${imp} priority and already in progress — keep the momentum.`;
    case "practicing":
      return `${imp} priority; problem practice is underway — push it to revision.`;
    case "revision":
      return `Learned and waiting for revision — a quick recall pass would lock it in.`;
    default:
      return `${imp} priority topic.`;
  }
}

/* ---------- dashboard helpers ---------- */

export function topicsInStatus(prog: Record<string, TopicProgress>, statuses: TopicStatus[], limit = 6): FlatTopic[] {
  return FLAT_TOPICS.filter((t) => statuses.includes(statusOf(prog[t.id]))).slice(0, limit);
}

/** Topics whose target date has passed and are not completed. */
export function overdueTopics(prog: Record<string, TopicProgress>, limit = 6): FlatTopic[] {
  const t = today();
  return FLAT_TOPICS.filter((x) => {
    const p = prog[x.id];
    return p?.targetDate && p.targetDate <= t && statusOf(p) !== "completed";
  }).slice(0, limit);
}

export const subjectColors: Record<SubjectCode, string> = {
  physics: "#3e6b8f",
  chemistry: "#5f7d3c",
  mathematics: "#c07a26",
};

export const subjectDefs: SyllabusSubjectDef[] = SYLLABUS.subjects;

/* ---------- one-shot handoff: "Study this topic" → timer prefill ---------- */

let pendingTopic: string | null = null;
export const setPendingTopic = (id: string | null): void => {
  pendingTopic = id;
};
export const takePendingTopic = (): string | null => {
  const v = pendingTopic;
  pendingTopic = null;
  return v;
};
