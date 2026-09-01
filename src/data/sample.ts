import { addDays, setHours, setMinutes } from "date-fns";
import { uid } from "../lib/utils";
import type { Chapter, Goal, StudySession, Subject, Task } from "../types";

/**
 * Builds a realistic demo dataset. It is clearly flagged via `sample: true`
 * and can be wiped from Settings → Data at any time.
 */
export function generateSample(): {
  subjects: Subject[];
  chapters: Chapter[];
  tasks: Task[];
  sessions: StudySession[];
  goals: Goal[];
} {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const ago = (days: number, h: number, m: number) => setMinutes(setHours(addDays(now, -days), h), m);

  const subjects: Subject[] = [
    { id: uid(), name: "Physics", color: "#3e6b8f", icon: "atom", description: "Mechanics block first, then thermo.", archived: false, createdAt: iso(ago(24, 10, 0)) },
    { id: uid(), name: "Chemistry", color: "#5f7d3c", icon: "flask", description: "NCERT line-by-line + PYQs.", archived: false, createdAt: iso(ago(24, 10, 2)) },
    { id: uid(), name: "Mathematics", color: "#c07a26", icon: "calc", description: "Daily practice mixed sets.", archived: false, createdAt: iso(ago(23, 9, 0)) },
  ];
  const [phy, chem, math] = subjects;

  const mk = (subjectId: string, title: string, completed: boolean, daysAgo: number, priority: Chapter["priority"], target: number | null, notes = ""): Chapter => ({
    id: uid(),
    subjectId,
    title,
    completed,
    completedAt: completed ? iso(ago(daysAgo, 18, 0)) : null,
    priority,
    targetDate: target !== null ? (() => { const d = addDays(now, target); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })() : null,
    notes,
    createdAt: iso(ago(22, 9, 0)),
  });

  const chapters: Chapter[] = [
    mk(phy.id, "Kinematics", true, 12, "high", null, "Graphs practise done."),
    mk(phy.id, "Laws of Motion", true, 8, "high", null),
    mk(phy.id, "Work, Energy & Power", true, 4, "high", null, "Revisit collisions."),
    mk(phy.id, "Rotational Motion", false, 0, "high", 5, "Hardest block — morning slot."),
    mk(phy.id, "Thermodynamics", false, 0, "medium", 10),
    mk(phy.id, "Electrostatics", false, 0, "low", 18),
    mk(chem.id, "Mole Concept", true, 10, "high", null),
    mk(chem.id, "Atomic Structure", true, 6, "medium", null),
    mk(chem.id, "Chemical Bonding", false, 0, "high", 4),
    mk(chem.id, "Organic Basics (GOC)", false, 0, "high", 8, "Make a reaction map."),
    mk(chem.id, "Coordination Compounds", false, 0, "low", 16),
    mk(math.id, "Quadratic Equations", true, 9, "medium", null),
    mk(math.id, "Sequences & Series", true, 5, "medium", null),
    mk(math.id, "Trigonometry", false, 0, "medium", 6),
    mk(math.id, "Coordinate Geometry", false, 0, "high", 3),
    mk(math.id, "Calculus — Limits", false, 0, "medium", 12),
  ];

  const tasks: Task[] = [
    { id: uid(), title: "Finish Rotational Motion problem set (30 Qs)", subjectId: phy.id, dueDate: key(addDays(now, 1)), priority: "high", completed: false, completedAt: null, createdAt: iso(ago(3, 9, 0)) },
    { id: uid(), title: "Revise Chemical Bonding notes", subjectId: chem.id, dueDate: key(now), priority: "medium", completed: false, completedAt: null, createdAt: iso(ago(2, 20, 0)) },
    { id: uid(), title: "Mixed timed quiz — Coordinate Geometry", subjectId: math.id, dueDate: key(addDays(now, 2)), priority: "medium", completed: false, completedAt: null, createdAt: iso(ago(1, 21, 0)) },
    { id: uid(), title: "Re-solve wrong PYQs from Kinematics", subjectId: phy.id, dueDate: key(addDays(now, -1)), priority: "high", completed: false, completedAt: null, createdAt: iso(ago(4, 19, 0)) },
    { id: uid(), title: "Make Atomic Structure formula sheet", subjectId: chem.id, dueDate: key(addDays(now, -2)), priority: "low", completed: true, completedAt: iso(ago(2, 17, 30)), createdAt: iso(ago(5, 10, 0)) },
    { id: uid(), title: "Watch GOC lecture series part 2", subjectId: chem.id, dueDate: key(addDays(now, 4)), priority: "low", completed: false, completedAt: null, createdAt: iso(ago(1, 9, 30)) },
  ];

  const plan: Array<[number, number, number, number, number]> = [
    // [daysAgo, hour, minutes, subjectIndex, extraMin]
    [13, 17, 30, 0, 95], [13, 20, 0, 1, 50],
    [12, 16, 45, 0, 120], [11, 18, 0, 2, 75], [11, 21, 0, 1, 40],
    [10, 17, 15, 1, 100],
    [9, 16, 30, 2, 85], [9, 19, 30, 0, 45],
    [8, 17, 0, 0, 110],
    [7, 18, 15, 1, 65], [7, 20, 30, 2, 55],
    [6, 17, 0, 2, 90],
    [5, 16, 45, 1, 70], [5, 19, 0, 0, 50],
    [4, 17, 30, 0, 105], [4, 21, 0, 2, 35],
    [3, 18, 0, 1, 80],
    [2, 17, 15, 2, 95], [2, 20, 15, 0, 45],
    [1, 16, 30, 0, 125], [1, 19, 45, 1, 60],
    [0, 8, 30, 0, 55],
  ];

  // Tag sample sessions with real JEE Main 2026 syllabus topics so syllabus
  // study-time views have honest, consistent demo data.
  const topicTags: string[][] = [
    ["JEE26-P-U12-T21", "JEE26-P-U11-T14", "JEE26-P-U17-T05"],
    ["JEE26-C-U07-T23", "JEE26-C-U08-T15"],
    ["JEE26-M-U11-T09", "JEE26-M-U08-T12", "JEE26-M-U03-T09"],
  ];

  const sessions: StudySession[] = plan.map(([d, h, m, si, dur], i) => ({
    id: uid(),
    subjectId: subjects[si].id,
    chapterId: null,
    topicRefId: topicTags[si % 3][i % topicTags[si % 3].length],
    startedAt: iso(ago(d, h, m)),
    durationSec: dur * 60,
    notes: i % 5 === 0 ? "Focused block, phone away." : "",
    createdAt: iso(ago(d, h, m)),
  }));

  const goals: Goal[] = [
    { id: uid(), title: "Study 40 hours this month", kind: "hours", target: 40, deadline: null, createdAt: iso(ago(10, 9, 0)) },
    { id: uid(), title: "Finish 6 more chapters", kind: "chapters", target: 6, deadline: null, createdAt: iso(ago(10, 9, 1)) },
    { id: uid(), title: "Hold a 7-day streak", kind: "streak", target: 7, deadline: null, createdAt: iso(ago(6, 9, 0)) },
  ];

  return { subjects, chapters, tasks, sessions, goals };
}

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
