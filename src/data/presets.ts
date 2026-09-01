import type { PrepType } from "../types";

export const PREP_OPTIONS: Array<{ value: PrepType; label: string; icon: string; blurb: string }> = [
  { value: "jee", label: "JEE", icon: "atom", blurb: "Physics, Chemistry, Maths" },
  { value: "neet", label: "NEET", icon: "leaf", blurb: "Physics, Chemistry, Biology" },
  { value: "upsc", label: "UPSC", icon: "landmark", blurb: "GS, CSAT, optional" },
  { value: "school", label: "School", icon: "school", blurb: "Class syllabus & exams" },
  { value: "college", label: "College", icon: "grad", blurb: "Semesters & credits" },
  { value: "coding", label: "Coding", icon: "code", blurb: "DSA, projects, interviews" },
  { value: "other", label: "Other", icon: "star", blurb: "Anything else" },
];

export const PREP_TERMS: Record<PrepType, { unit: string; unitPlural: string; exam: string }> = {
  jee: { unit: "chapter", unitPlural: "chapters", exam: "JEE" },
  neet: { unit: "chapter", unitPlural: "chapters", exam: "NEET" },
  upsc: { unit: "topic", unitPlural: "topics", exam: "UPSC" },
  school: { unit: "chapter", unitPlural: "chapters", exam: "your exams" },
  college: { unit: "unit", unitPlural: "units", exam: "your semester" },
  coding: { unit: "topic", unitPlural: "topics", exam: "interviews" },
  other: { unit: "topic", unitPlural: "topics", exam: "your exam" },
};

export const SUBJECT_COLORS = [
  "#1f5b46",
  "#5f7d3c",
  "#c07a26",
  "#b23c31",
  "#3e6b8f",
  "#7b5aa6",
  "#a34d7c",
  "#2f7f74",
  "#8a6d3b",
  "#556b2f",
];

export const SUBJECT_ICON_KEYS = [
  "book",
  "flask",
  "atom",
  "calc",
  "globe",
  "code",
  "scale",
  "brain",
  "pen",
  "chart",
  "leaf",
  "landmark",
] as const;

export type SubjectIconKey = (typeof SUBJECT_ICON_KEYS)[number];

interface PresetSubject {
  name: string;
  icon: SubjectIconKey;
  color: string;
  chapters: string[];
}

export const PREP_PRESETS: Record<PrepType, PresetSubject[]> = {
  jee: [
    { name: "Physics", icon: "atom", color: "#3e6b8f", chapters: ["Kinematics", "Laws of Motion", "Work, Energy & Power", "Rotational Motion", "Thermodynamics", "Electrostatics"] },
    { name: "Chemistry", icon: "flask", color: "#5f7d3c", chapters: ["Mole Concept", "Atomic Structure", "Chemical Bonding", "Organic Basics (GOC)", "Coordination Compounds"] },
    { name: "Mathematics", icon: "calc", color: "#c07a26", chapters: ["Quadratic Equations", "Sequences & Series", "Trigonometry", "Coordinate Geometry", "Calculus — Limits", "Probability"] },
  ],
  neet: [
    { name: "Physics", icon: "atom", color: "#3e6b8f", chapters: ["Kinematics", "Laws of Motion", "Thermodynamics", "Current Electricity", "Optics"] },
    { name: "Chemistry", icon: "flask", color: "#5f7d3c", chapters: ["Some Basic Concepts", "Structure of Atom", "Chemical Bonding", "p-Block Elements", "Biomolecules"] },
    { name: "Biology", icon: "leaf", color: "#1f5b46", chapters: ["Cell — The Unit of Life", "Human Physiology", "Genetics & Evolution", "Plant Physiology", "Ecology"] },
  ],
  upsc: [
    { name: "Polity", icon: "scale", color: "#7b5aa6", chapters: ["Constitutional Framework", "Fundamental Rights", "Parliament", "Judiciary", "Local Government"] },
    { name: "History", icon: "landmark", color: "#b23c31", chapters: ["Ancient India", "Medieval India", "Modern India", "Freedom Struggle"] },
    { name: "Geography", icon: "globe", color: "#2f7f74", chapters: ["Physical Geography", "Indian Climate", "Rivers & Drainage", "World Mapping"] },
    { name: "Economy", icon: "chart", color: "#c07a26", chapters: ["National Income", "Money & Banking", "Fiscal Policy", "External Sector"] },
  ],
  school: [
    { name: "Mathematics", icon: "calc", color: "#c07a26", chapters: ["Number Systems", "Algebra", "Geometry", "Statistics"] },
    { name: "Science", icon: "flask", color: "#5f7d3c", chapters: ["Physics chapters", "Chemistry chapters", "Biology chapters"] },
    { name: "English", icon: "book", color: "#3e6b8f", chapters: ["Reading Skills", "Writing Skills", "Literature Reader"] },
  ],
  college: [
    { name: "Core Course 1", icon: "book", color: "#1f5b46", chapters: ["Unit 1", "Unit 2", "Unit 3", "Unit 4"] },
    { name: "Core Course 2", icon: "brain", color: "#7b5aa6", chapters: ["Unit 1", "Unit 2", "Unit 3", "Unit 4"] },
  ],
  coding: [
    { name: "Data Structures", icon: "code", color: "#3e6b8f", chapters: ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Trees", "Graphs", "Heaps"] },
    { name: "Algorithms", icon: "brain", color: "#c07a26", chapters: ["Sorting & Searching", "Recursion & Backtracking", "Dynamic Programming", "Greedy", "Graph Algorithms"] },
    { name: "System Design", icon: "chart", color: "#5f7d3c", chapters: ["Basics & Scaling", "Databases", "Caching", "Message Queues"] },
  ],
  other: [
    { name: "Main Subject", icon: "book", color: "#1f5b46", chapters: ["Part 1", "Part 2", "Part 3"] },
  ],
};

export const CHAT_SUGGESTIONS = [
  "What should I study next?",
  "Build my weekly study plan",
  "Quiz me on my next topic",
  "Summarize my progress",
  "How do I revise faster?",
  "Why am I losing my streak?",
];
