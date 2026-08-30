import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import type { PrepType } from "../types";
import { PREP_OPTIONS, PREP_PRESETS, SUBJECT_COLORS } from "../data/presets";
import { addChaptersBulk, addSubject, completeOnboarding, useApp } from "../store/store";
import { Button, Logo, SubjectGlyph } from "../components/ui";
import { cx, fmtDuration } from "../lib/utils";

const GOAL_MIN = 30;
const GOAL_MAX = 480;
const GOAL_STEP = 15;

export default function Onboarding() {
  const { user } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [prep, setPrep] = useState<PrepType | null>(null);
  const [goalMin, setGoalMin] = useState(120);
  const presets = useMemo(() => (prep ? PREP_PRESETS[prep] : []), [prep]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const selected = picked ?? new Set(presets.slice(0, 3).map((p) => p.name));

  const fillPct = ((goalMin - GOAL_MIN) / (GOAL_MAX - GOAL_MIN)) * 100;

  const finish = () => {
    if (!prep) return;
    completeOnboarding(prep, goalMin);
    for (const p of presets) {
      if (!selected.has(p.name)) continue;
      const s = addSubject({
        name: p.name,
        color: p.color,
        icon: p.icon,
        description: `${p.chapters.length} ${p.chapters.length === 1 ? "chapter" : "chapters"} queued from the ${prep.toUpperCase()} starter.`,
      });
      addChaptersBulk(s.id, p.chapters);
    }
    confetti({ particleCount: 130, spread: 75, origin: { y: 0.7 }, colors: ["#1f5b46", "#e9c46a", "#5f7d3c", "#c07a26"] });
    nav("/dashboard");
  };

  const steps = ["Preparation", "Daily goal", "Syllabus"];

  return (
    <div className="min-h-screen app-bg flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl anim-in">
        <div className="flex justify-center mb-8">
          <Logo size={32} />
        </div>

        {/* Stepper */}
        <ol className="flex items-center justify-center gap-2 mb-8" aria-label="Onboarding progress">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cx(
                  "w-6.5 h-6.5 rounded-full text-[11px] font-extrabold inline-flex items-center justify-center transition-all",
                  i < step ? "bg-pine text-white dark:text-[#0d1a13]" : i === step ? "bg-pinewash text-pine ring-2 ring-pine" : "bg-raise text-faint border border-line"
                )}
              >
                {i < step ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx("text-[12px] font-bold hidden sm:block", i === step ? "text-ink" : "text-faint")}>{s}</span>
              {i < steps.length - 1 && <span className="w-8 h-px bg-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="card p-6 sm:p-8">
          {step === 0 && (
            <div className="anim-in">
              <h1 className="font-display font-extrabold text-[24px] tracking-tight text-ink">
                Hey {user?.name?.split(" ")[0]} — what are you preparing for?
              </h1>
              <p className="text-sm text-mute mt-1.5">StudyNest adapts its templates and language to your track. You can change this anytime in Settings.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
                {PREP_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setPrep(o.value)}
                    aria-pressed={prep === o.value}
                    className={cx(
                      "text-left p-3.5 rounded-xl border-2 transition-all duration-150 hover:-translate-y-0.5",
                      prep === o.value ? "border-pine bg-pinewash shadow-sm" : "border-line bg-surface hover:border-linex"
                    )}
                  >
                    <span
                      className={cx(
                        "w-9 h-9 rounded-lg inline-flex items-center justify-center mb-2.5",
                        prep === o.value ? "bg-pine text-white dark:text-[#0d1a13]" : "bg-raise text-mute"
                      )}
                    >
                      <SubjectGlyph icon={o.icon} className="w-4.5 h-4.5" />
                    </span>
                    <span className="block font-display font-bold text-[14.5px] text-ink leading-tight">{o.label}</span>
                    <span className="block text-[11.5px] text-mute mt-0.5 leading-snug">{o.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="anim-in">
              <h1 className="font-display font-extrabold text-[24px] tracking-tight text-ink">How much time can you give daily?</h1>
              <p className="text-sm text-mute mt-1.5">Be honest — a reachable goal beats an ambitious one you'll abandon. This drives your daily target everywhere.</p>
              <div className="mt-10 text-center">
                <p className="font-display font-extrabold text-[52px] leading-none text-ink tnum">{fmtDuration(goalMin * 60)}</p>
                <p className="text-[13px] font-semibold text-faint mt-2 uppercase tracking-wider">per day</p>
              </div>
              <input
                type="range"
                min={GOAL_MIN}
                max={GOAL_MAX}
                step={GOAL_STEP}
                value={goalMin}
                onChange={(e) => setGoalMin(Number(e.target.value))}
                className="w-full mt-8"
                style={{ ["--fill" as string]: `${fillPct}%` }}
                aria-label="Daily study goal in minutes"
                aria-valuetext={fmtDuration(goalMin * 60)}
              />
              <div className="flex justify-between text-[11px] font-bold text-faint mt-2">
                <span>30m</span>
                <span>2h</span>
                <span>4h</span>
                <span>8h</span>
              </div>
              <div className="flex gap-2 justify-center mt-6 flex-wrap">
                {[60, 120, 180, 240, 360].map((m) => (
                  <button
                    key={m}
                    onClick={() => setGoalMin(m)}
                    className={cx(
                      "px-3 h-8 rounded-lg text-[12.5px] font-bold border transition-colors",
                      goalMin === m ? "bg-pine text-white dark:text-[#0d1a13] border-pine" : "border-line text-mute hover:border-linex hover:text-ink"
                    )}
                  >
                    {fmtDuration(m * 60)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="anim-in">
              <h1 className="font-display font-extrabold text-[24px] tracking-tight text-ink">Start with a head start?</h1>
              <p className="text-sm text-mute mt-1.5">
                We can pre-fill the core {prep?.toUpperCase()} subjects with their usual chapters. Untick anything you don't need — or skip and build from scratch.
              </p>
              <ul className="mt-5 space-y-2">
                {presets.map((p) => {
                  const on = selected.has(p.name);
                  return (
                    <li key={p.name}>
                      <button
                        onClick={() => {
                          const next = new Set(selected);
                          if (on) next.delete(p.name);
                          else next.add(p.name);
                          setPicked(next);
                        }}
                        aria-pressed={on}
                        className={cx(
                          "w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 text-left transition-all",
                          on ? "border-pine bg-pinewash" : "border-line bg-surface hover:border-linex"
                        )}
                      >
                        <span className="w-10 h-10 rounded-lg text-white inline-flex items-center justify-center shrink-0" style={{ background: p.color }}>
                          <SubjectGlyph icon={p.icon} className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-display font-bold text-[14.5px] text-ink">{p.name}</span>
                          <span className="block text-[12px] text-mute truncate">
                            {p.chapters.slice(0, 3).join(" · ")}{p.chapters.length > 3 ? "…" : ""}
                          </span>
                        </span>
                        <span
                          className={cx(
                            "w-5.5 h-5.5 rounded-md border-2 inline-flex items-center justify-center shrink-0 transition-colors",
                            on ? "bg-pine border-pine" : "border-linex"
                          )}
                        >
                          {on && <Check className="w-3.5 h-3.5 text-white dark:text-[#0d1a13] tick-anim" strokeWidth={3.5} aria-hidden="true" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[12px] text-faint mt-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Colors are from your palette — {SUBJECT_COLORS.length} available per subject.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-line">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} icon={ArrowLeft}>
              Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !prep}>
                Continue <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="lg" onClick={finish} icon={Sparkles}>
                Enter my nest
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-faint mt-6">
          {selected.size} subject{selected.size === 1 ? "" : "s"} · {presets.filter((p) => selected.has(p.name)).reduce((a, p) => a + p.chapters.length, 0)} chapters ready
        </p>
      </div>
    </div>
  );
}
