import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, BookOpen, Plus } from "lucide-react";
import type { Subject } from "../types";
import { addSubject, deleteSubject, setSubjectArchived, updateSubject, useApp } from "../store/store";
import { subjectProgress, subjectSeconds } from "../lib/stats";
import { Button, Field, Input, Segmented, SubjectGlyph, Textarea } from "../components/ui";
import { SUBJECT_COLORS, SUBJECT_ICON_KEYS } from "../data/presets";
import { Confirm, Modal, useToast } from "../components/overlays";
import { cx } from "../lib/utils";
import { EmptyState, PageHeader, SubjectCard } from "../components/widgets";

export default function SubjectsPage() {
  const { data } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; subject: Subject } | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const subjects = useMemo(() => (data?.subjects ?? []).filter((s) => (tab === "active" ? !s.archived : s.archived)), [data, tab]);
  const activeCount = data?.subjects.filter((s) => !s.archived).length ?? 0;
  const archivedCount = data?.subjects.filter((s) => s.archived).length ?? 0;

  if (!data) return null;

  return (
    <>
      <PageHeader
        title="Subjects"
        sub="Your syllabus, organized. Open a subject to manage its chapters."
        actions={
          <Button icon={Plus} onClick={() => setModal({ mode: "create" })}>
            New subject
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <Segmented
          options={[
            { value: "active", label: `Active · ${activeCount}` },
            { value: "archived", label: `Archived · ${archivedCount}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "archived" && archivedCount > 0 && (
          <p className="text-[12.5px] text-faint">Archived subjects keep their history and can be restored safely.</p>
        )}
      </div>

      {subjects.length === 0 ? (
        tab === "active" ? (
          <EmptyState
            icon={BookOpen}
            title={data.subjects.length === 0 ? "No subjects yet" : "Nothing active right now"}
            body={
              data.subjects.length === 0
                ? "Create your first subject to start organizing your syllabus into chapters you can track and complete."
                : "All your subjects are archived. Restore one from the Archived tab, or create something new."
            }
            action={
              <Button icon={Plus} onClick={() => setModal({ mode: "create" })}>
                Create subject
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Archive} title="No archived subjects" body="When you archive a subject it rests here — hidden from lists but never mixed with active data." />
        )
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              chapters={data.chapters}
              seconds={subjectSeconds(data.sessions, s.id)}
              onOpen={() => nav(`/subjects/${s.id}`)}
              onEdit={() => setModal({ mode: "edit", subject: s })}
              onArchive={() => {
                setSubjectArchived(s.id, !s.archived);
                toast(
                  s.archived
                    ? { title: `"${s.name}" restored`, desc: "Back on your active list." }
                    : { title: `"${s.name}" archived`, desc: "Find it under the Archived tab anytime." }
                );
              }}
              onDelete={() => setDeleting(s)}
            />
          ))}
        </div>
      )}

      {modal && <SubjectModal key={modal.mode === "edit" ? modal.subject.id : "new"} initial={modal.mode === "edit" ? modal.subject : undefined} onClose={() => setModal(null)} />}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const chCount = data.chapters.filter((c) => c.subjectId === deleting.id).length;
          deleteSubject(deleting.id);
          toast({ title: `"${deleting.name}" deleted`, desc: chCount > 0 ? `${chCount} chapter${chCount > 1 ? "s" : ""} removed with it. Session history is kept.` : "Its session history is kept.", tone: "info" });
        }}
        title={`Delete "${deleting?.name}"?`}
        body={`This permanently removes the subject and its ${data.chapters.filter((c) => c.subjectId === deleting?.id).length} chapter(s). Logged study sessions stay in your analytics. This can't be undone.`}
        confirmLabel="Delete subject"
      />
    </>
  );
}

function SubjectModal({ initial, onClose }: { initial?: Subject; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
  const [icon, setIcon] = useState(initial?.icon ?? "book");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    if (name.trim().length < 1) {
      setErr("Subject name can't be empty.");
      return;
    }
    if (name.trim().length > 40) {
      setErr("Keep the name under 40 characters.");
      return;
    }
    if (initial) {
      updateSubject(initial.id, { name: name.trim(), color, icon, description: description.trim() });
      toast({ title: "Subject updated", desc: name.trim() });
    } else {
      const s = addSubject({ name, color, icon, description });
      toast({ title: "Subject created", desc: `Now add its chapters inside "${s.name}".` });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit subject" : "New subject"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{initial ? "Save changes" : "Create subject"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={err ?? undefined}>
          <Input value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="e.g. Physics" maxLength={40} invalid={!!err} autoFocus />
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={cx("w-8 h-8 rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-offset-2 ring-offset-surface scale-110")}
                style={{ background: c, ["--tw-ring-color" as string]: c }}
              >
                {color === c && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto text-white" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-6 gap-2">
            {SUBJECT_ICON_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setIcon(k)}
                aria-label={`Icon ${k}`}
                aria-pressed={icon === k}
                className={cx(
                  "h-10 rounded-lg border inline-flex items-center justify-center transition-all",
                  icon === k ? "border-pine bg-pinewash text-pine" : "border-line text-mute hover:border-linex hover:text-ink"
                )}
              >
                <SubjectGlyph icon={k} className="w-4.5 h-4.5" />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Description (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Strategy, resources, exam weightage…" maxLength={140} />
        </Field>
      </div>
    </Modal>
  );
}
