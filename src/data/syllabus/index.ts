import type { FlatTopic, SubjectCode, SyllabusSubjectDef, SyllabusVersionDef } from "./types";
import { MATH_UNITS } from "./jee2026-math";
import { PHYSICS_UNITS } from "./jee2026-physics";
import { CHEMISTRY_UNITS } from "./jee2026-chemistry";

/**
 * Syllabus registry.
 *
 * JEE-MAIN-2026 is the current official NTA baseline. When NTA releases the
 * official JEE Main 2027 syllabus, add a new entry here (JEE-MAIN-2027) built
 * from the same stable topic ids wherever topics continue — user progress is
 * keyed by topic id, so it survives the version change untouched.
 * Never delete an older version from this registry.
 */

const SUBJECTS: SyllabusSubjectDef[] = [
  { code: "physics", name: "Physics", units: PHYSICS_UNITS },
  { code: "chemistry", name: "Chemistry", units: CHEMISTRY_UNITS },
  { code: "mathematics", name: "Mathematics", units: MATH_UNITS },
];

export const SYLLABUS: SyllabusVersionDef = {
  version: "JEE-MAIN-2026",
  label: "JEE Main 2026 — Official NTA Baseline",
  exam: "JEE Main Paper 1 (B.E./B.Tech.)",
  sourceNote:
    "Complete official syllabus as published by NTA for JEE (Main) 2026. Topic importance reflects PYQ-trend analysis (2024–2026 weighted) and is a preparation priority — NTA does not publish chapter-wise weightage, and no appearance is ever guaranteed.",
  subjects: SUBJECTS,
};

export const SYLLABUS_VERSIONS: SyllabusVersionDef[] = [SYLLABUS];

/* ---------- derived indices (computed once) ---------- */

export const FLAT_TOPICS: FlatTopic[] = SYLLABUS.subjects.flatMap((sub) =>
  sub.units.flatMap((unit) =>
    unit.topics.map((t) => ({
      ...t,
      subject: sub.code,
      subjectName: sub.name,
      unitN: unit.n,
      unitName: unit.name,
      category: unit.category,
    }))
  )
);

const BY_ID = new Map<string, FlatTopic>(FLAT_TOPICS.map((t) => [t.id, t]));

export const getTopic = (id: string): FlatTopic | undefined => BY_ID.get(id);

export const subjectDef = (code: SubjectCode): SyllabusSubjectDef =>
  SYLLABUS.subjects.find((s) => s.code === code) ?? SYLLABUS.subjects[0];

export const SUBJECT_META: Record<SubjectCode, { name: string; short: string }> = {
  physics: { name: "Physics", short: "PHY" },
  chemistry: { name: "Chemistry", short: "CHE" },
  mathematics: { name: "Mathematics", short: "MAT" },
};

export const unitTopicCount = (code: SubjectCode): number =>
  subjectDef(code).units.reduce((a, u) => a + u.topics.length, 0);

export const TOTAL_TOPICS = FLAT_TOPICS.length;
export const TOTAL_UNITS = SYLLABUS.subjects.reduce((a, s) => a + s.units.length, 0);

/* ---------- search ---------- */

export interface SearchResult {
  topic: FlatTopic;
  matchedIn: "topic" | "unit" | "subject" | "alias";
}

/** Case-insensitive search across subject, unit, topic and aliases ("Kirchhoff", "Bayes", "SN1"…). */
export function searchSyllabus(query: string, limit = 40): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: SearchResult[] = [];
  for (const t of FLAT_TOPICS) {
    const topicL = t.name.toLowerCase();
    const unitL = t.unitName.toLowerCase();
    const subjectL = t.subjectName.toLowerCase();
    let matchedIn: SearchResult["matchedIn"] | null = null;
    if (topicL.includes(q)) matchedIn = "topic";
    else if (t.aliases?.some((a) => a.toLowerCase().includes(q))) matchedIn = "alias";
    else if (unitL.includes(q)) matchedIn = "unit";
    else if (subjectL.includes(q)) matchedIn = "subject";
    if (matchedIn) {
      // topic-name matches first, prefix matches before substring matches
      const rank =
        (matchedIn === "topic" ? 0 : matchedIn === "alias" ? 1 : matchedIn === "unit" ? 2 : 3) * 1000 +
        (topicL.startsWith(q) ? 0 : 100) +
        topicL.indexOf(q);
      out.push({ topic: t, matchedIn, rank: rank } as SearchResult & { rank: number });
    }
  }
  return out
    .sort((a, b) => (a as SearchResult & { rank: number }).rank - (b as SearchResult & { rank: number }).rank)
    .slice(0, limit)
    .map(({ topic, matchedIn }) => ({ topic, matchedIn }));
}
