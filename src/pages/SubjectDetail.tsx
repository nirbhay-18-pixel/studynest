import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Play, Plus, StickyNote } from "lucide-react";
import type { Chapter, Priority } from "../types";
import {
  addChapter,
  deleteChapter,
  deleteSubject,
  setSubjectArchived,
  startTimer,
  toggleChapter,
  updateChapter,
  useApp,
} from "../store/store";
import { subjectProgress, subjectSeconds } from "../lib/stats";
import { PRIORITY_META, PriorityBadge } from "../components/ui";
import { Button, CheckButton, Field, Input, Ring, Select, SubjectGlyph, Textarea } from "../components/ui";
import { Confirm, Menu, Modal, useToast } from "../components/overlays";
import { cx, fmtDuration, isValidKey, notFutureKey } from "../lib/utils";
import { DueBadge, EmptyState } from "../components/widgets";
import { PREP_TERMS } from "../data/presets";

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [deleting, setDeleting] = useState<Chapter | null>(null);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState(false);

  const subject = data?.subjects.find((s) => s.id === id);
  const chapters = useMemo(() => (data?.chapters ?? []).filter((c) => c.subjectId === id), [data, id]);

  const sorted = useMemo(() => {
    const open = chapters
      .filter((c) => !c.completed)
      .sort((a, b) => {
        const p = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
        if (p !== 0) return p;
        if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    const done = chapters.filter((c) => c.completed).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { open, done };
  }, [chapters]);

  if (!data) return null;
  if (!subject) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Subject not found"
        body="It may have been deleted. Head back to your subjects list."
        action={
          <Link to="/subjects">
            <Button variant="outline" icon={ArrowLeft}>Back to subjects</Button>
          </Link>
        }
      />
    );
  }

  const prog = subjectProgress(data.chapters, subject.id);
  const secs = subjectSeconds(data.sessions, subject.id);
  const sessionCount = data.sessions.filter((s) => s.subjectId === subject.id).length;
  const terms = PREP_TERMS[data.profile.prepType];

  return (
    <>
      <Link to="/subjects" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-mute hover:text-pine transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All subjects
      </Link>

      {/* Subject header */}
      <div className="card p-5 sm:p-6 mb-5 anim-in">
        <div className="flex flex-wrap items-start gap-4">
          <span className="w-14 h-14 rounded-2xl text-white inline-flex items-center justify-center shrink-0" style={{ background: subject.color }}>
            <SubjectGlyph icon={subject.icon} className="w-7 h-7" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-extrabold text-[24px] tracking-tight text-ink leading-tight">{subject.name}</h1>
              {subject.archived && <span className="text-[10.5px] font-extrabold uppercase tracking-wider bg-raise border border-line text-mute px-2 py-0.5 rounded-md">Archived</span>}
            </div>
            {subject.description && <p className="text-sm text-mute mt-1">{subject.description}</p>}
            <div className="flex items-center gap-5 mt-3 text-[13px] text-mute flex-wrap">
              <span className="tnum"><strong className="text-ink">{prog.done}/{prog.total}</strong> {terms.unitPlural} done</span>
              <span className="tnum"><strong className="text-ink">{fmtDuration(secs)}</strong> studied</span>
              <span className="tnum"><strong className="text-ink">{sessionCount}</strong> sessions</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Ring pct={prog.pct} size={56} stroke={6} color={subject.color}>
              <span className="font-display font-extrabold text-[13px] text-ink tnum">{prog.pct}%</span>
            </Ring>
            <Button
              icon={Play}
              onClick={() => {
                startTimer(subject.id, null);
                nav("/study");
                toast({ title: "Timer started", desc: `Session running for ${subject.name}.` });
              }}
            >
              Study now
            </Button>
            <Menu
              items={[
                { label: subject.archived ? "Restore subject" : "Archive subject", onClick: () => { setSubjectArchived(subject.id, !subject.archived); toast({ title: subject.archived ? "Subject restored" : "Subject archived", tone: "info" }); } },
                { label: "Delete subject", danger: true, onClick: () => setConfirmDeleteSubject(true) },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Chapters */}
        <div className="space-y-4">
          <AddChapterForm subjectId={subject.id} unitName={terms.unit} />

          {chapters.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarPlus}
              title={`No ${terms.unitPlural} yet`}
              body={`Break ${subject.name} into ${terms.unitPlural} — each one you can complete, prioritize and give a target date.`}
            />
          ) : (
            <>
              <section className="card p-3 anim-in">
                <h2 className="px-2.5 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">
                  Open · {sorted.open.length}
                </h2>
                {sorted.open.length === 0 ? (
                  <p className="text-sm text-mute px-2.5 pb-2.5">Everything's done here. Outstanding.</p>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {sorted.open.map((c) => (
                      <ChapterRow key={c.id} chapter={c} onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
                    ))}
                  </ul>
                )}
              </section>
              {sorted.done.length > 0 && (
                <section className="card p-3 anim-in opacity-90">
                  <h2 className="px-2.5 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">
                    Completed · {sorted.done.length}
                  </h2>
                  <ul className="divide-y divide-line/60">
                    {sorted.done.map((c) => (
                      <ChapterRow key={c.id} chapter={c} onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {/* Side tips */}
        <aside className="card p-5 anim-in lg:sticky lg:top-20">
          <h2 className="font-display font-bold text-[15px] text-ink mb-3">Working this subject</h2>
          <ul className="space-y-2.5 text-[13px] text-mute leading-relaxed">
            <li className="flex gap-2.5"><span className="text-pine font-extrabold">1.</span> Attack high-priority {terms.unitPlural} first — they're sorted to the top.</li>
            <li className="flex gap-2.5"><span className="text-pine font-extrabold">2.</span> Give scary {terms.unitPlural} a target date; deadlines focus the mind.</li>
            <li className="flex gap-2.5"><span className="text-pine font-extrabold">3.</span> Drop quick notes on each {terms.unit} so revision takes minutes, not hours.</li>
            <li className="flex gap-2.5"><span className="text-pine font-extrabold">4.</span> Mark complete only after you can recall the key ideas without looking.</li>
          </ul>
        </aside>
      </div>

      {editing && <ChapterModal chapter={editing} unitName={terms.unit} onClose={() => setEditing(null)} />}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteChapter(deleting.id);
            toast({ title: `${terms.unit[0].toUpperCase() + terms.unit.slice(1)} removed`, desc: deleting.title, tone: "info" });
          }
        }}
        title={`Delete "${deleting?.title}"?`}
        body="This removes the chapter and its notes. Study sessions already logged are kept."
        confirmLabel="Delete"
      />

      <Confirm
        open={confirmDeleteSubject}
        onClose={() => setConfirmDeleteSubject(false)}
        onConfirm={() => {
          deleteSubject(subject.id);
          toast({ title: `"${subject.name}" deleted`, tone: "info" });
          nav("/subjects");
        }}
        title={`Delete "${subject.name}"?`}
        body={`This permanently removes the subject and all ${chapters.length} of its ${terms.unitPlural}. Session history stays in analytics.`}
        confirmLabel="Delete subject"
      />
    </>
  );
}

/* ---------- Add chapter ---------- */

function AddChapterForm({ subjectId, unitName }: { subjectId: string; unitName: string }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [target, setTarget] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr(`Give the ${unitName} a name.`);
      return;
    }
    if (target && (!isValidKey(target) || !notFutureKey(target))) {
      setErr("Target date can't be in the future.");
      return;
    }
    addChapter(subjectId, { title, priority, targetDate: target || null });
    toast({ title: `${unitName[0].toUpperCase() + unitName.slice(1)} added`, desc: title.trim() });
    setTitle("");
    setTarget("");
    setPriority("medium");
    setErr(null);
  };

  return (
    <form onSubmit={submit} className="card p-3.5 anim-in">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErr(null); }}
          placeholder={`Add a ${unitName}… e.g. Rotational Motion`}
          className="flex-1"
          invalid={!!err}
          aria-label={`New ${unitName} title`}
        />
        <div className="flex gap-2.5">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-28" aria-label="Priority">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="w-38" aria-label="Target date (optional)" />
          <Button type="submit" icon={Plus} className="shrink-0">Add</Button>
        </div>
      </div>
      {err && <p className="text-xs font-medium text-rust mt-2" role="alert">{err}</p>}
    </form>
  );
}

/* ---------- Chapter row ---------- */

function ChapterRow({ chapter: c, onEdit, onDelete }: { chapter: Chapter; onEdit: () => void; onDelete: () => void }) {
  const toast = useToast();
  return (
    <li className="group flex items-center gap-3 px-2.5 py-2.5 hover:bg-raise rounded-lg transition-colors">
      <CheckButton
        checked={c.completed}
        onToggle={() => {
          toggleChapter(c.id);
          if (!c.completed) toast({ title: "Marked complete", desc: c.title });
        }}
        label={`Mark ${c.title} ${c.completed ? "incomplete" : "complete"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-semibold leading-snug transition-colors", c.completed ? "text-faint line-through" : "text-ink")}>{c.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <PriorityBadge p={c.priority} />
          {c.targetDate && <DueBadge dateKey={c.targetDate} />}
          {c.notes && (
            <span className="inline-flex items-center gap-1 text-[11px] text-faint" title={c.notes}>
              <StickyNote className="w-3 h-3" aria-hidden="true" /> note
            </span>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
        <Menu
          items={[
            { label: "Edit", onClick: onEdit },
            { label: "Delete", danger: true, onClick: onDelete },
          ]}
        />
      </div>
    </li>
  );
}

/* ---------- Chapter modal ---------- */

function ChapterModal({ chapter, unitName, onClose }: { chapter: Chapter; unitName: string; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(chapter.title);
  const [priority, setPriority] = useState<Priority>(chapter.priority);
  const [target, setTarget] = useState(chapter.targetDate ?? "");
  const [notes, setNotes] = useState(chapter.notes);
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setErr("Title can't be empty.");
      return;
    }
    if (target && (!isValidKey(target) || !notFutureKey(target))) {
      setErr("Target date can't be in the future.");
      return;
    }
    updateChapter(chapter.id, { title: title.trim(), priority, targetDate: target || null, notes: notes.trim() });
    toast({ title: `${unitName[0].toUpperCase() + unitName.slice(1)} updated` });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${unitName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={err ?? undefined}>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); setErr(null); }} invalid={!!err} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Target date">
            <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" hint="Formulas to remember, resource links, weak spots…">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional notes" />
        </Field>
      </div>
    </Modal>
  );
}


