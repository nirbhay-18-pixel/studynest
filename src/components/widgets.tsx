import type { ReactNode } from "react";
import { Archive, ArchiveRestore, BookOpen, CalendarDays, Flag, Flame, Hourglass, ListChecks, Pencil, Repeat, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Chapter, Goal, StudySession, Subject, Task } from "../types";
import { cx, fmtDuration, fmtHours, relDue } from "../lib/utils";
import { subjectProgress } from "../lib/stats";
import type { GoalProgress } from "../lib/stats";
import { Badge, CheckButton, PRIORITY_META, ProgressBar, SubjectGlyph } from "./ui";
import { Menu } from "./overlays";

/* ---------- Page scaffold ---------- */

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6 anim-in">
      <div>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-tight tracking-tight text-ink">{title}</h1>
        {sub && <p className="text-sm text-mute mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: ReactNode;
  accent?: "pine" | "ember" | "moss";
}) {
  return (
    <div className="card px-4 py-3.5 flex items-center gap-3.5 anim-in">
      <span
        className={cx(
          "w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0",
          accent === "ember" ? "bg-emberwash text-ember" : accent === "moss" ? "bg-mossash text-moss" : "bg-pinewash text-pine"
        )}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</p>
        <p className="font-display font-bold text-xl text-ink leading-tight tnum truncate">{value}</p>
        {sub && <p className="text-[11px] text-mute leading-tight truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- States ---------- */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "border-2 border-dashed border-line rounded-2xl flex flex-col items-center justify-center text-center anim-in",
        compact ? "px-6 py-8" : "px-6 py-14"
      )}
    >
      <span className="w-12 h-12 rounded-2xl bg-raise border border-line text-faint inline-flex items-center justify-center mb-3.5">
        <Icon className="w-5.5 h-5.5" aria-hidden="true" />
      </span>
      <h3 className="font-display font-bold text-[16px] text-ink">{title}</h3>
      <p className="text-sm text-mute mt-1.5 max-w-sm leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-14" />
      ))}
    </div>
  );
}

/* ---------- Badges ---------- */

export function DueBadge({ dateKey }: { dateKey: string }) {
  const rel = relDue(dateKey);
  const tone = rel.tone === "overdue" ? "text-rust bg-rustwash" : rel.tone === "today" ? "text-ember bg-emberwash" : "text-mute bg-raise border border-line";
  return (
    <span className={cx("inline-flex items-center gap-1 h-5.5 px-2 rounded-md text-[11px] font-bold", tone)}>
      <CalendarDays className="w-3 h-3" aria-hidden="true" />
      {rel.label}
    </span>
  );
}

export function SubjectChip({ subject }: { subject: Subject | undefined }) {
  if (!subject) return null;
  return (
    <span className="inline-flex items-center gap-1.5 h-5.5 px-2 rounded-md text-[11px] font-bold bg-raise border border-line text-mute">
      <span className="w-2 h-2 rounded-full" style={{ background: subject.color }} aria-hidden="true" />
      {subject.name}
    </span>
  );
}

/* ---------- Subject card ---------- */

export function SubjectCard({
  subject,
  chapters,
  seconds,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  subject: Subject;
  chapters: Chapter[];
  seconds: number;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const p = subjectProgress(chapters, subject.id);
  return (
    <article
      className="card p-4 flex flex-col gap-3 hover:shadow-[var(--shadow-pop)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group anim-in"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      tabIndex={0}
      aria-label={`Open subject ${subject.name}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-xl inline-flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
          style={{ background: subject.color }}
        >
          <SubjectGlyph icon={subject.icon} className="w-5.5 h-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[15.5px] text-ink leading-tight truncate">{subject.name}</h3>
          <p className="text-xs text-mute truncate mt-0.5">
            {subject.description || `${p.total} ${p.total === 1 ? "chapter" : "chapters"}`}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            items={[
              { label: "Edit", icon: EditIcon, onClick: onEdit },
              { label: subject.archived ? "Restore" : "Archive", icon: ArchiveIconFor(subject.archived), onClick: onArchive },
              { label: "Delete", icon: TrashIcon, danger: true, onClick: onDelete },
            ]}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-faint mb-1.5">
          <span>
            {p.done}/{p.total} done
          </span>
          <span className="tnum">{p.pct}%</span>
        </div>
        <ProgressBar pct={p.pct} color={subject.color} thin />
      </div>
      <div className="flex items-center justify-between text-xs text-mute">
        <span className="tnum">{seconds > 0 ? fmtDuration(seconds) : "No time logged"}</span>
        <span className="text-pine font-bold text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
      </div>
    </article>
  );
}

const EditIcon = Pencil;
const TrashIcon = Trash2;
const ArchiveIconFor = (archived: boolean) => (archived ? ArchiveRestore : Archive);

/* ---------- Task row ---------- */

export function TaskItem({
  task,
  subject,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  subject: Subject | undefined;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-line bg-surface hover:border-linex transition-colors anim-in">
      <CheckButton checked={task.completed} onToggle={onToggle} label={`Mark "${task.title}" ${task.completed ? "incomplete" : "complete"}`} />
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium leading-snug transition-colors", task.completed ? "text-faint line-through" : "text-ink")}>
          {task.title}
        </p>
        {(subject || task.dueDate) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {subject && <SubjectChip subject={subject} />}
            {task.dueDate && <DueBadge dateKey={task.dueDate} />}
            <span className="inline-flex items-center" style={{ color: PRIORITY_META[task.priority].color }} title={`${PRIORITY_META[task.priority].label} priority`}>
              <Flag className="w-3 h-3" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Menu
          items={[
            { label: "Edit", icon: EditIcon, onClick: onEdit },
            { label: "Delete", icon: TrashIcon, danger: true, onClick: onDelete },
          ]}
        />
      </div>
    </li>
  );
}

/* ---------- Goal card ---------- */

export const GOAL_KIND_ICONS: Record<Goal["kind"], LucideIcon> = {
  hours: Hourglass,
  chapters: BookOpen,
  sessions: Repeat,
  streak: Flame,
  tasks: ListChecks,
};

export function GoalCard({ goal, progress, onDelete }: { goal: Goal; progress: GoalProgress; onDelete: () => void }) {
  const KindIcon = GOAL_KIND_ICONS[goal.kind];
  return (
    <article className={cx("card p-4 flex flex-col gap-3 anim-in relative overflow-hidden", progress.achieved && "border-pine/40")}>
      {progress.achieved && (
        <span className="absolute top-0 right-0 bg-pine text-white dark:text-[#0d1a13] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-bl-xl">
          Achieved
        </span>
      )}
      <div className="flex items-start gap-3 pr-10">
        <span className="w-9 h-9 rounded-lg bg-emberwash text-ember inline-flex items-center justify-center shrink-0">
          <KindIcon className="w-4.5 h-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{goal.title}</h3>
          <p className="text-xs text-mute mt-0.5">
            {progress.windowLabel}
            {goal.deadline && !progress.achieved ? ` · due ${relDue(goal.deadline).label.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <Menu items={[{ label: "Delete goal", icon: TrashIcon, danger: true, onClick: onDelete }]} />
        </div>
      </div>
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <span className="font-display font-bold text-lg text-ink tnum">
            {progress.cur}
            <span className="text-faint font-semibold text-[13px]"> / {progress.target} {progress.unit}</span>
          </span>
          <span className="text-xs font-bold tnum" style={{ color: progress.achieved ? "var(--pine)" : "var(--mute)" }}>
            {progress.pct}%
          </span>
        </div>
        <ProgressBar pct={progress.pct} color={progress.achieved ? "var(--pine)" : "var(--ember)"} />
      </div>
    </article>
  );
}

/* ---------- Session row ---------- */

export function SessionRow({
  session,
  subject,
  chapterTitle,
  topicLabel,
  onDelete,
}: {
  session: StudySession;
  subject: Subject | undefined;
  chapterTitle?: string;
  /** Optional syllabus topic tag (e.g. "Current Electricity · Kirchhoff's laws"). */
  topicLabel?: string;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-raise transition-colors">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subject?.color ?? "var(--faint)" }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{subject?.name ?? "Removed subject"}</p>
        {topicLabel ? (
          <p className="text-xs font-medium text-pine truncate">
            {topicLabel}
            {chapterTitle ? ` · ${chapterTitle}` : ""}
          </p>
        ) : (
          chapterTitle && <p className="text-xs text-mute truncate">{chapterTitle}</p>
        )}
        {session.notes && <p className="text-xs text-faint italic truncate mt-0.5">“{session.notes}”</p>}
      </div>
      <span className="text-sm font-bold text-ink tnum">{fmtDuration(session.durationSec)}</span>
      <Badge tone="mute" className="hidden sm:inline-flex tnum">{fmtHours(session.durationSec)}</Badge>
      <button
        onClick={onDelete}
        aria-label="Delete session"
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-faint hover:text-rust transition-all"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </li>
  );
}
