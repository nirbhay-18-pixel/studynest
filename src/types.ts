export type PrepType = "jee" | "neet" | "upsc" | "school" | "college" | "coding" | "other";
export type Priority = "low" | "medium" | "high";
export type Theme = "light" | "dark";
export type GoalKind = "hours" | "chapters" | "sessions" | "streak" | "tasks";
export type TaskFilter = "all" | "today" | "upcoming" | "done";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Profile {
  name: string;
  prepType: PrepType;
  dailyGoalMin: number;
  theme: Theme;
  onboarded: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string; // hex
  icon: string; // key into SUBJECT_ICONS
  description: string;
  archived: boolean;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  priority: Priority;
  targetDate: string | null; // yyyy-mm-dd
  notes: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string | null;
  dueDate: string | null; // yyyy-mm-dd
  priority: Priority;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  chapterId: string | null;
  startedAt: string; // ISO
  durationSec: number;
  notes: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  target: number;
  deadline: string | null; // yyyy-mm-dd
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  error?: boolean;
}

export interface TimerState {
  active: boolean;
  paused: boolean;
  startedAt: number | null; // epoch ms of last (re)start
  accumulatedSec: number; // banked seconds from previous segments
  subjectId: string | null;
  chapterId: string | null;
}

export interface AIConfig {
  endpoint: string; // OpenAI-compatible chat/completions URL
  model: string;
  apiKey: string;
}

export interface UserData {
  profile: Profile;
  subjects: Subject[];
  chapters: Chapter[];
  tasks: Task[];
  sessions: StudySession[];
  goals: Goal[];
  chat: ChatMessage[];
  timer: TimerState;
  aiConfig: AIConfig;
  sample: boolean;
  createdAt: string;
}

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passHash: string;
  salt: string;
  createdAt: string;
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
