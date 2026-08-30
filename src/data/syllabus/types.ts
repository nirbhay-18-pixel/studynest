/**
 * Immutable syllabus reference types.
 * Official syllabus content lives ONLY in the versioned data files (jee2026-*.ts)
 * and is never mixed with user progress — progress is stored separately per user,
 * keyed by the stable topic id, so a future syllabus version (e.g. JEE-MAIN-2027)
 * can reuse the same ids and existing progress keeps working.
 */

export type SubjectCode = "physics" | "chemistry" | "mathematics";
export type Importance = "high" | "medium" | "low";

export interface SyllabusTopic {
  id: string; // stable across syllabus versions, e.g. JEE26-P-U12-T21
  name: string; // official topic wording — never paraphrased
  importance: Importance; // preparation priority from PYQ trend analysis (not a guarantee)
  trendScore: number; // 0–100 trend strength across recent papers (2024–2026 weighted)
  reason?: string; // "why it matters" for HIGH topics; generic fallback used otherwise
  aliases?: string[]; // search aliases (e.g. SN1/SN2 under substitution mechanisms)
}

export interface SyllabusUnit {
  n: number; // official unit number within the subject
  name: string; // official unit title
  category?: string; // Chemistry only: Physical / Inorganic / Organic / Practical
  topics: SyllabusTopic[];
}

export interface SyllabusSubjectDef {
  code: SubjectCode;
  name: string;
  units: SyllabusUnit[];
}

export interface SyllabusVersionDef {
  version: string; // "JEE-MAIN-2026"
  label: string; // "JEE Main 2026 — Official NTA Baseline"
  exam: string; // "JEE Main Paper 1 (B.E./B.Tech.)"
  sourceNote: string;
  subjects: SyllabusSubjectDef[];
}

/** Topic flattened with its full path — used for search and detail views. */
export interface FlatTopic extends SyllabusTopic {
  subject: SubjectCode;
  subjectName: string;
  unitN: number;
  unitName: string;
  category?: string;
}

/** Seed tuple: [officialName, importance, trendScore, reason?, aliases?] */
export type TopicSeed = [string, Importance, number, string?, string[]?];

export const pad2 = (n: number): string => String(n).padStart(2, "0");
