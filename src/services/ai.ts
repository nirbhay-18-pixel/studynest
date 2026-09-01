import type { AIConfig, Chapter, ChatMessage, Goal, Profile, StudySession, Subject, Task } from "../types";
import { fmtDuration, fmtHours } from "../lib/utils";
import {
  calcStreaks,
  goalProgress,
  nextUp,
  subjectOf,
  subjectProgress,
  syllabus,
  totalSec,
  weekToDateSec,
} from "../lib/stats";

export interface AssistantContext {
  profile: Profile;
  subjects: Subject[];
  chapters: Chapter[];
  tasks: Task[];
  sessions: StudySession[];
  goals: Goal[];
}

export const aiConfigured = (c: AIConfig): boolean => c.endpoint.trim().length > 0;

/**
 * Ask the study assistant.
 *
 * If an OpenAI-compatible endpoint is configured in Settings, we call it directly
 * (in production this request should be proxied through a serverless function so
 * the API key never ships to the browser — see README). Otherwise a deterministic
 * offline study coach answers using the user's real StudyNest data.
 */
export async function askAssistant(
  history: ChatMessage[],
  context: AssistantContext,
  config: AIConfig
): Promise<string> {
  if (aiConfigured(config)) {
    return callRemote(history, context, config);
  }
  await new Promise((r) => setTimeout(r, 550)); // thinking beat so the state is perceptible
  return offlineCoach(history, context);
}

async function callRemote(history: ChatMessage[], context: AssistantContext, config: AIConfig): Promise<string> {
  const system = buildSystemPrompt(context);
  const messages = [
    { role: "system", content: system },
    ...history.slice(-14).map((m) => ({ role: m.role, content: m.content })),
  ];
  let res: Response;
  try {
    res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.model || undefined, messages, temperature: 0.4 }),
    });
  } catch {
    throw new Error("Could not reach the AI endpoint. Check your connection and the endpoint URL in Settings.");
  }
  if (!res.ok) {
    throw new Error(`The AI endpoint responded with ${res.status}. Verify the URL, model and API key in Settings.`);
  }
  const data: unknown = await res.json();
  const content =
    (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("The AI endpoint returned an empty response.");
  return content;
}

function buildSystemPrompt(ctx: AssistantContext): string {
  const syl = syllabus(ctx.chapters);
  return [
    "You are the StudyNest study assistant: concise, encouraging, practical.",
    `Student profile: preparing for ${ctx.profile.prepType.toUpperCase()}, daily goal ${Math.round(ctx.profile.dailyGoalMin / 60 * 10) / 10}h.`,
    `Syllabus: ${syl.done}/${syl.total} topics done. Subjects: ${ctx.subjects.filter((s) => !s.archived).map((s) => s.name).join(", ") || "none yet"}.`,
    "Format answers with short lines, '- ' bullets and **bold** for emphasis.",
  ].join("\n");
}

/* ---------- offline study coach (no provider configured) ---------- */

function offlineCoach(history: ChatMessage[], ctx: AssistantContext): string {
  const last = [...history].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
  const active = ctx.subjects.filter((s) => !s.archived);

  if (/(plan|schedule|week|timetable)/.test(last)) return studyPlan(ctx, active);
  if (/(next|what should|suggest|pick)/.test(last)) return whatNext(ctx, active);
  if (/(quiz|practice|question|test me)/.test(last)) return quizMe(last, ctx);
  if (/(progress|summary|stats|how am i)/.test(last)) return progressSummary(ctx);
  if (/(revise|revision|remember|forget)/.test(last)) return revisionTips(ctx);
  if (/(streak|consistent|motivat|procrastinat|focus|lazy)/.test(last)) return consistency(ctx);
  if (/(explain|teach|understand|concept)/.test(last)) return explainScaffold(last);
  if (/(mistake|wrong|error|silly)/.test(last)) return mistakeReview(ctx);
  return capabilities(ctx);
}

function header(title: string): string {
  return `### ${title}`;
}

function whatNext(ctx: AssistantContext, active: Subject[]): string {
  const picks = nextUp(ctx.chapters);
  if (picks.length === 0) {
    return `${header("You're clear 🎉")}\nNo open topics left in your syllabus. Add the next block of chapters, or use this window for timed mock tests and revision.`;
  }
  const lines = picks.map((c, i) => {
    const sub = subjectOf(ctx.subjects, c.subjectId);
    const why =
      c.priority === "high"
        ? "high priority"
        : c.targetDate
          ? `target ${c.targetDate}`
          : "queued up";
    return `- **${i + 1}. ${c.title}** (${sub?.name ?? "—"}) — ${why}`;
  });
  return [
    header("Study this next"),
    `Based on ${active.length} active subjects, here's the highest-value order right now:`,
    ...lines,
    "",
    `Suggested block: **50 minutes** on *${picks[0].title}*, then a 10-minute break and 5 minutes recalling what you covered from memory.`,
  ].join("\n");
}

function studyPlan(ctx: AssistantContext, active: Subject[]): string {
  const open = nextUp(ctx.chapters, 100);
  const goalH = Math.max(1, Math.round(ctx.profile.dailyGoalMin / 60));
  if (open.length === 0) {
    return `${header("Weekly plan")}\nYour syllabus list is empty, so add chapters first — then I'll spread them across the week against your ${goalH}h daily target.`;
  }
  const days = Math.max(1, Math.ceil(open.length / Math.max(1, goalH)));
  const perDay = Math.min(open.length, Math.max(1, goalH));
  const plan = Array.from({ length: Math.min(7, days) }, (_, i) => {
    const slice = open.slice(i * perDay, (i + 1) * perDay);
    if (slice.length === 0) return null;
    const items = slice.map((c) => `${subjectOf(ctx.subjects, c.subjectId)?.name ?? "—"} · ${c.title}`).join(", ");
    return `- **Day ${i + 1}:** ${items}`;
  }).filter(Boolean) as string[];
  return [
    header(`7-day attack plan (${goalH}h/day)`),
    `You have **${open.length} open topics** across ${active.length} subjects. At your daily goal, here's a realistic split:`,
    ...plan,
    "",
    `- Keep evenings for **active recall** (close the book, write what you remember).`,
    `- End day 7 with a mixed timed quiz across everything you covered.`,
  ].join("\n");
}

function quizMe(last: string, ctx: AssistantContext): string {
  const after = last.split(/quiz me on|practice (questions )?(on|for)|about/)[1];
  const picks = nextUp(ctx.chapters);
  const topic = after?.trim() || picks[0]?.title || "your next topic";
  return [
    header(`Active-recall quiz — ${topic}`),
    "Answer these from memory first, then check your notes. No peeking:",
    `- Define ${topic} in one sentence, as if teaching a classmate.`,
    `- Write the 3 most important formulas / facts for **${topic}** from memory.`,
    `- What is the most common mistake people make in ${topic} — and why does it happen?`,
    `- Sketch (or describe) how ${topic} connects to the previous chapter you finished.`,
    `- Create one exam-style question on ${topic} and answer it in under 5 minutes.`,
    "",
    "Afterwards, grade yourself honestly: anything you couldn't retrieve goes back on tomorrow's list.",
  ].join("\n");
}

function progressSummary(ctx: AssistantContext): string {
  const syl = syllabus(ctx.chapters);
  const streak = calcStreaks(ctx.sessions);
  const week = weekToDateSec(ctx.sessions);
  const top = [...ctx.subjects]
    .map((s) => ({ s, p: subjectProgress(ctx.chapters, s.id) }))
    .filter((x) => x.p.total > 0)
    .sort((a, b) => b.p.pct - a.p.pct)[0];
  const openGoals = ctx.goals.filter((g) => !goalProgress(g, ctx.sessions, ctx.chapters, ctx.tasks).achieved);
  return [
    header("Your progress, honestly"),
    `- Syllabus: **${syl.done}/${syl.total}** topics done (${syl.pct}%) — total ${fmtHours(totalSec(ctx.sessions) )} logged all-time.`,
    `- This week: **${fmtDuration(week)}** so far.`,
    `- Streak: **${streak.current} day${streak.current === 1 ? "" : "s"}** (best: ${streak.longest}).`,
    top ? `- Strongest subject: **${top.s.name}** at ${top.p.pct}% of its syllabus.` : `- Add subjects and chapters to unlock per-subject insights.`,
    openGoals.length ? `- Still open: ${openGoals.map((g) => `"${g.title}"`).join(", ")}.` : `- All tracked goals are achieved. Set a harder one.`,
  ].join("\n");
}

function revisionTips(ctx: AssistantContext): string {
  const done = ctx.chapters.filter((c) => c.completed).slice(-5).map((c) => c.title);
  return [
    header("Revise faster, keep more"),
    "- Use **spaced repetition**: review a topic 1 day, 3 days, 7 days and 21 days after first learning it.",
    "- Revise by **retrieval**, not re-reading: close the notes and write everything you remember, then check gaps.",
    "- Keep a one-page **error log** — silly mistakes repeated are marks lost twice.",
    done.length ? `- Good revision candidates from your recent completions: ${done.map((t) => `**${t}**`).join(", ")}.` : "- Finish a few chapters first and I'll point at what to revise.",
    "- Cap revision at 20% of a session; the rest should be new material or problems.",
  ].join("\n");
}

function consistency(ctx: AssistantContext): string {
  const streak = calcStreaks(ctx.sessions);
  const goalMin = ctx.profile.dailyGoalMin;
  return [
    header("Protecting the streak"),
    streak.current > 0
      ? `You're on **${streak.current} day${streak.current === 1 ? "" : "s"}** right now — the rule: never miss twice.`
      : "No active streak right now — the next session restarts it. A streak is just the next day, repeated.",
    `- Shrink the bar: on bad days do **15 minutes minimum**. Consistency beats intensity.`,
    `- Your daily goal is ${Math.round((goalMin / 60) * 10) / 10}h — split it into two blocks with a real break between.`,
    `- Start sessions at the **same time and place**; the cue does half the work.`,
    `- Put the timer in StudyNest before touching any material — starting is the bottleneck, not studying.`,
  ].join("\n");
}

function explainScaffold(last: string): string {
  const topic = last.replace(/.*(explain|teach me|understand)/, "").replace(/[?.!]/g, "").trim() || "the concept";
  return [
    header(`Breaking down: ${topic}`),
    `The offline coach can't generate a full explanation without an AI provider connected (add one in **Settings → AI Assistant**). Meanwhile, use the Feynman method — it usually beats a passive read:`,
    `- Write *${topic}* at the top of a blank page.`,
    `- Explain it in plain words as if to a 12-year-old. No jargon allowed.`,
    `- Mark every spot where you stall or hand-wave — those are your real gaps.`,
    `- Re-read the source **only for the gaps**, then rewrite the page.`,
    `- Finish when you can predict what comes next in the derivation/argument before reading it.`,
  ].join("\n");
}

function mistakeReview(ctx: AssistantContext): string {
  const overdue = ctx.chapters.filter((c) => !c.completed && c.targetDate).length;
  return [
    header("Turning mistakes into marks"),
    "- After every practice set, sort errors into 3 buckets: **concept gap**, **silly mistake**, **time pressure**.",
    "- Concept gaps → relearn the chapter section today, not this week.",
    "- Silly mistakes → add each one to an error log and re-read the log before the next test.",
    "- Time pressure → practise with a timer at 90% of real exam time.",
    overdue ? `- You have ${overdue} topics with target dates still open — a timed mixed set would show where you actually stand.` : "",
  ].filter(Boolean).join("\n");
}

function capabilities(ctx: AssistantContext): string {
  const n = ctx.chapters.filter((c) => !c.completed).length;
  return [
    header("StudyNest Assistant"),
    `I'm currently running as the **offline study coach** — I answer from your real StudyNest data (${ctx.subjects.length} subjects, ${n} open topics). Try:`,
    "- *What should I study next?* — I'll rank your open topics.",
    "- *Build my weekly study plan* — a day-by-day split against your goal.",
    "- *Quiz me on Rotational Motion* — active-recall prompts.",
    "- *Summarize my progress* — honest numbers from your sessions.",
    "",
    "For free-form concept explanations, connect an OpenAI-compatible endpoint in **Settings → AI Assistant**.",
  ].join("\n");
}
