import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Target } from "lucide-react";
import confetti from "canvas-confetti";
import type { GoalKind } from "../types";
import { addGoal, deleteGoal, useApp } from "../store/store";
import { goalProgress, GOAL_KIND_META } from "../lib/stats";
import { Button, Field, Input, Select } from "../components/ui";
import { Confirm, Modal, useToast } from "../components/overlays";
import { isValidKey } from "../lib/utils";
import { EmptyState, GoalCard, PageHeader } from "../components/widgets";
import type { Goal } from "../types";

export default function GoalsPage() {
  const { data } = useApp();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  const rows = useMemo(
    () => (data?.goals ?? []).map((g) => ({ goal: g, p: goalProgress(g, data!.sessions, data!.chapters, data!.tasks) })),
    [data]
  );

  // Celebrate the exact moment a goal tips over 100%.
  const achievedBefore = useRef<Set<string>>(new Set(rows.filter((r) => r.p.achieved).map((r) => r.goal.id)));
  useEffect(() => {
    const now = rows.filter((r) => r.p.achieved).map((r) => r.goal.id);
    const fresh = now.filter((id) => !achievedBefore.current.has(id));
    achievedBefore.current = new Set(now);
    if (fresh.length > 0) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#1f5b46", "#e9c46a", "#c07a26"] });
      const g = rows.find((r) => r.goal.id === fresh[0])?.goal;
      if (g) toast({ title: "Goal achieved 🎉", desc: `"${g.title}" just hit 100%.` });
    }
  }, [rows, toast]);

  if (!data) return null;

  return (
    <>
      <PageHeader
        title="Goals"
        sub="Targets computed live from your real sessions, chapters and streaks — never invented."
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            New goal
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          body="Set a goal and give your study plan a clear target — hours this month, chapters to finish, or a streak to hold."
          action={
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Create your first goal
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(({ goal, p }) => (
            <GoalCard key={goal.id} goal={goal} progress={p} onDelete={() => setDeleting(goal)} />
          ))}
        </div>
      )}

      <div className="card p-5 mt-6 anim-in">
        <h2 className="font-display font-bold text-[15px] text-ink mb-3">How progress is measured</h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px] text-mute">
          {(Object.keys(GOAL_KIND_META) as GoalKind[]).map((k) => (
            <li key={k} className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pine mt-1.5 shrink-0" aria-hidden="true" />
              <span><strong className="text-ink">{GOAL_KIND_META[k].label}:</strong> {GOAL_KIND_META[k].hint}.</span>
            </li>
          ))}
        </ul>
      </div>

      {creating && <GoalModal onClose={() => setCreating(false)} />}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteGoal(deleting.id);
            toast({ title: "Goal deleted", desc: deleting.title, tone: "info" });
          }
        }}
        title="Delete goal?"
        body={`"${deleting?.title}" will be removed. Your underlying study data is untouched.`}
        confirmLabel="Delete"
      />
    </>
  );
}

function GoalModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<GoalKind>("hours");
  const [target, setTarget] = useState("40");
  const [deadline, setDeadline] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const meta = GOAL_KIND_META[kind];
  const defaults: Record<GoalKind, string> = { hours: "40", chapters: "6", sessions: "20", streak: "7", tasks: "15" };

  const save = () => {
    const t = Number(target);
    if (!title.trim()) return setErr("Give the goal a title.");
    if (!Number.isFinite(t) || t < 1 || t > 100000) return setErr(`Target must be at least 1 ${meta.unit}.`);
    if (deadline && !isValidKey(deadline)) return setErr("That deadline date is invalid.");
    addGoal({ title, kind, target: t, deadline: kind === "streak" ? null : deadline || null });
    toast({ title: "Goal created", desc: `${title.trim()} — ${t} ${meta.unit}.` });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New goal"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create goal</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={err ?? undefined}>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErr(null); }}
            placeholder={kind === "hours" ? "e.g. Study 40 hours this month" : kind === "streak" ? "e.g. Hold a 7-day streak" : `e.g. Finish ${defaults[kind]} ${meta.unit}`}
            invalid={!!err}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select
              value={kind}
              onChange={(e) => {
                const k = e.target.value as GoalKind;
                setKind(k);
                setTarget(defaults[k]);
                setErr(null);
              }}
            >
              {(Object.keys(GOAL_KIND_META) as GoalKind[]).map((k) => (
                <option key={k} value={k}>{GOAL_KIND_META[k].label}</option>
              ))}
            </Select>
          </Field>
          <Field label={`Target (${meta.unit})`}>
            <Input type="number" min={1} value={target} onChange={(e) => { setTarget(e.target.value); setErr(null); }} inputMode="numeric" />
          </Field>
        </div>
        {kind !== "streak" && (
          <Field label="Deadline (optional)" hint="Leave empty to track within the current month.">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
        <p className="text-xs text-faint">{meta.hint} — progress updates automatically as you study.</p>
      </div>
    </Modal>
  );
}
