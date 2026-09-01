import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ListTodo, Plus } from "lucide-react";
import type { Priority, Task, TaskFilter } from "../types";
import { addTask, deleteTask, toggleTask, updateTask, useApp } from "../store/store";
import { subjectOf } from "../lib/stats";
import { PRIORITY_META } from "../components/ui";
import { Button, Field, Input, Segmented, Select } from "../components/ui";
import { Modal, useToast, Confirm } from "../components/overlays";
import { todayKey } from "../lib/utils";
import { EmptyState, PageHeader, TaskItem } from "../components/widgets";

type SortKey = "due" | "priority" | "newest";

export default function TasksPage() {
  const { data } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("due");
  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const activeSubjects = useMemo(() => (data?.subjects ?? []).filter((s) => !s.archived), [data]);

  const { open, done } = useMemo(() => {
    if (!data) return { open: [] as Task[], done: [] as Task[] };
    const today = todayKey();
    let list = data.tasks.filter((t) => subjectFilter === "all" || t.subjectId === subjectFilter);
    list = list.filter((t) => {
      if (filter === "done") return t.completed;
      if (t.completed) return false;
      if (filter === "today") return !!t.dueDate && t.dueDate <= today;
      if (filter === "upcoming") return !t.dueDate || t.dueDate > today;
      return true;
    });
    const sortFn = (a: Task, b: Task) => {
      if (sort === "due") {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sort === "priority") {
        const p = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
        return p !== 0 ? p : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      }
      return b.createdAt.localeCompare(a.createdAt);
    };
    const openList = list.filter((t) => !t.completed).sort(sortFn);
    const doneList = list.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { open: openList, done: doneList };
  }, [data, filter, subjectFilter, sort]);

  if (!data) return null;

  const quickAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return;
    addTask({ title: quick, subjectId: null, dueDate: null, priority: "medium" });
    toast({ title: "Task added", desc: quick.trim() });
    setQuick("");
  };

  const shown = filter === "done" ? done : open;

  return (
    <>
      <PageHeader
        title="Tasks"
        sub={`${open.length} open · ${done.length} completed`}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />

      <form onSubmit={quickAdd} className="card p-3 mb-5 anim-in flex gap-2.5">
        <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Quick add a task… (Enter saves it as Medium, no due date)" className="flex-1" aria-label="Quick task title" />
        <Button type="submit" variant="subtle" disabled={!quick.trim()}>
          Add
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <Segmented
          options={[
            { value: "all", label: "All open" },
            { value: "today", label: "Today" },
            { value: "upcoming", label: "Upcoming" },
            { value: "done", label: "Done" },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-40" aria-label="Filter by subject">
          <option value="all">All subjects</option>
          {activeSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-40 ml-auto" aria-label="Sort tasks">
          <option value="due">Sort · due date</option>
          <option value="priority">Sort · priority</option>
          <option value="newest">Sort · newest</option>
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={filter === "done" ? "Nothing completed yet" : "You're all caught up"}
          body={
            filter === "done"
              ? "Check off a task and it will land here with a timestamp."
              : filter === "today"
                ? "No tasks due today. Add one, or enjoy the clear runway."
                : "No open tasks match this view. Add the next action for your prep."
          }
          action={
            <Button icon={Plus} variant={filter === "done" ? "outline" : "primary"} onClick={() => setCreating(true)}>
              New task
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <ul className="space-y-2">
            {shown.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                subject={subjectOf(data.subjects, t.subjectId)}
                onToggle={() => {
                  toggleTask(t.id);
                  if (!t.completed) toast({ title: "Task done ✓", desc: t.title });
                }}
                onEdit={() => setEditing(t)}
                onDelete={() => setDeleting(t)}
              />
            ))}
          </ul>

          {filter === "all" && done.length > 0 && (
            <section>
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint mb-2.5">Completed · {done.length}</h2>
              <ul className="space-y-2 opacity-75">
                {done.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    subject={subjectOf(data.subjects, t.subjectId)}
                    onToggle={() => toggleTask(t.id)}
                    onEdit={() => setEditing(t)}
                    onDelete={() => setDeleting(t)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {(creating || editing) && (
        <TaskModal
          key={editing?.id ?? "new"}
          task={editing ?? undefined}
          subjects={activeSubjects}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteTask(deleting.id);
            toast({ title: "Task deleted", desc: deleting.title, tone: "info" });
          }
        }}
        title="Delete task?"
        body={`"${deleting?.title}" will be permanently removed.`}
        confirmLabel="Delete"
      />
    </>
  );
}

function TaskModal({ task, subjects, onClose }: { task?: Task; subjects: Array<{ id: string; name: string }>; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(task?.title ?? "");
  const [subjectId, setSubjectId] = useState(task?.subjectId ?? "");
  const [due, setDue] = useState(task?.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setErr("Task title can't be empty.");
      return;
    }
    const payload = { title: title.trim(), subjectId: subjectId || null, dueDate: due || null, priority };
    if (task) {
      updateTask(task.id, payload);
      toast({ title: "Task updated" });
    } else {
      addTask(payload);
      toast({ title: "Task created", desc: payload.title });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{task ? "Save changes" : "Create task"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={err ?? undefined}>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); setErr(null); }} placeholder="e.g. Solve 30 PYQs from Thermodynamics" invalid={!!err} autoFocus />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
