import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Download, KeyRound, LogOut, Moon, Palette, Sparkles, Sun, Trash2, User2, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import type { PrepType } from "../types";
import {
  clearAllData,
  deleteAccount,
  exportJSON,
  loadSampleData,
  setAIConfig,
  setTheme,
  signOut,
  updateProfile,
  useApp,
} from "../store/store";
import { aiConfigured } from "../services/ai";
import { PREP_OPTIONS } from "../data/presets";
import { Button, Field, Input, Select } from "../components/ui";
import { Confirm, useToast } from "../components/overlays";
import { downloadFile, fmtDuration } from "../lib/utils";
import { PageHeader } from "../components/widgets";

function Section({ icon: Icon, title, desc, children, danger }: { icon: typeof User2; title: string; desc: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`card p-5 sm:p-6 anim-in ${danger ? "border-rust/30" : ""}`}>
      <div className="flex items-start gap-3 mb-4">
        <span className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${danger ? "bg-rustwash text-rust" : "bg-pinewash text-pine"}`}>
          <Icon className="w-4.5 h-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display font-bold text-[16px] text-ink leading-tight">{title}</h2>
          <p className="text-[12.5px] text-mute mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { data, user } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(data?.profile.name ?? "");
  const [prep, setPrep] = useState<PrepType>(data?.profile.prepType ?? "other");
  const [goalMin, setGoalMin] = useState(data?.profile.dailyGoalMin ?? 120);
  const [endpoint, setEndpoint] = useState(data?.aiConfig.endpoint ?? "");
  const [model, setModel] = useState(data?.aiConfig.model ?? "");
  const [apiKey, setApiKey] = useState(data?.aiConfig.apiKey ?? "");
  const [confirmSample, setConfirmSample] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!data) return null;
  const theme = data.profile.theme;
  const configured = aiConfigured(data.aiConfig);
  const fillPct = ((goalMin - 30) / (480 - 30)) * 100;

  const saveProfile = () => {
    if (name.trim().length < 2) {
      toast({ title: "Name too short", desc: "Use at least 2 characters.", tone: "error" });
      return;
    }
    updateProfile({ name: name.trim(), prepType: prep, dailyGoalMin: goalMin });
    toast({ title: "Profile saved", desc: `Daily goal is now ${fmtDuration(goalMin * 60)}.` });
  };

  const saveAI = () => {
    if (endpoint && !/^https?:\/\//.test(endpoint.trim())) {
      toast({ title: "Invalid endpoint", desc: "The AI endpoint must be an http(s) URL.", tone: "error" });
      return;
    }
    setAIConfig({ endpoint: endpoint.trim(), model: model.trim(), apiKey: apiKey.trim() });
    toast({
      title: endpoint.trim() ? "AI provider connected" : "Back to offline coach",
      desc: endpoint.trim() ? `Model: ${model.trim() || "provider default"}` : "The assistant will answer from your StudyNest data.",
    });
  };

  return (
    <>
      <PageHeader title="Settings" sub="Profile, preferences, AI connection and your data." />
      <div className="max-w-2xl space-y-4">
        <Section icon={User2} title="Profile" desc="Your name, preparation track and daily target.">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Preparing for">
                <Select value={prep} onChange={(e) => setPrep(e.target.value as PrepType)}>
                  {PREP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={`Daily study goal — ${fmtDuration(goalMin * 60)}`}>
              <input
                type="range"
                min={30}
                max={480}
                step={15}
                value={goalMin}
                onChange={(e) => setGoalMin(Number(e.target.value))}
                className="w-full"
                style={{ ["--fill" as string]: `${fillPct}%` }}
                aria-label="Daily study goal in minutes"
              />
              <div className="flex justify-between text-[11px] font-bold text-faint mt-1.5">
                <span>30m</span><span>2h</span><span>4h</span><span>8h</span>
              </div>
            </Field>
            <div className="flex justify-end">
              <Button onClick={saveProfile}>Save profile</Button>
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Appearance" desc="Theme applies instantly and is remembered per account.">
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  toast({ title: `${t === "light" ? "Light" : "Dark"} theme on`, tone: "info" });
                }}
                aria-pressed={theme === t}
                className={`flex-1 flex items-center justify-center gap-2.5 h-16 rounded-xl border-2 transition-all ${
                  theme === t ? "border-pine bg-pinewash" : "border-line bg-surface hover:border-linex"
                }`}
              >
                {t === "light" ? <Sun className="w-5 h-5 text-ember" aria-hidden="true" /> : <Moon className="w-5 h-5 text-pine" aria-hidden="true" />}
                <span className="font-display font-bold text-[14px] text-ink capitalize">{t}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Sparkles} title="AI Assistant" desc="Connect an OpenAI-compatible chat endpoint. Leave empty to use the offline study coach.">
          <div className={`flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl border ${configured ? "bg-pinewash border-pine/25" : "bg-raise border-line"}`}>
            {configured ? <Wifi className="w-4 h-4 text-pine" aria-hidden="true" /> : <WifiOff className="w-4 h-4 text-ember" aria-hidden="true" />}
            <p className={`text-[13px] font-semibold ${configured ? "text-pine" : "text-mute"}`}>
              {configured ? `Connected — model "${model || "default"}"` : "Not configured — offline coach answers from your data"}
            </p>
          </div>
          <div className="space-y-4">
            <Field label="Endpoint URL" hint="e.g. https://api.openai.com/v1/chat/completions — or your Vercel proxy.">
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://…" autoComplete="off" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Model">
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" autoComplete="off" />
              </Field>
              <Field label="API key">
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12px] text-faint max-w-72">
                For production, proxy requests through a serverless function so keys never reach the browser (see README).
              </p>
              <div className="flex gap-2">
                {configured && (
                  <Button variant="outline" onClick={() => { setEndpoint(""); setModel(""); setApiKey(""); setAIConfig({ endpoint: "", model: "", apiKey: "" }); toast({ title: "AI disconnected", desc: "Offline coach active.", tone: "info" }); }}>
                    Disconnect
                  </Button>
                )}
                <Button onClick={saveAI} icon={KeyRound}>Save connection</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Database} title="Data" desc="Your workspace lives in this browser, namespaced per account. Export it anytime.">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={Download}
              onClick={() => {
                downloadFile(`studynest-export-${new Date().toISOString().slice(0, 10)}.json`, exportJSON());
                toast({ title: "Export ready", desc: "Full workspace downloaded as JSON." });
              }}
            >
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => setConfirmSample(true)}>
              Load sample data
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirmClear(true)}>
              Clear all data
            </Button>
          </div>
          {data.sample && (
            <p className="text-[12px] text-ember font-semibold mt-3">Sample dataset is currently loaded — it's demo content, not real user data. Clear it whenever you like.</p>
          )}
        </Section>

        <Section icon={LogOut} title="Account" desc={`Signed in as ${user?.email}`} danger>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={LogOut} onClick={() => setConfirmSignOut(true)}>
              Sign out
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          </div>
        </Section>
      </div>

      <Confirm
        open={confirmSample}
        onClose={() => setConfirmSample(false)}
        onConfirm={() => {
          loadSampleData();
          toast({ title: "Sample workspace loaded", desc: "Demo subjects, sessions and goals are in." });
        }}
        title="Load sample data?"
        body="This replaces current subjects, chapters, tasks, sessions and goals with a realistic demo set. Profile and settings stay."
        confirmLabel="Load sample"
      />
      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAllData();
          toast({ title: "All study data cleared", desc: "Fresh start — your profile is untouched.", tone: "info" });
        }}
        title="Clear all study data?"
        body="Every subject, chapter, task, session, goal and chat message will be permanently removed from this browser."
        confirmLabel="Clear everything"
      />
      <Confirm
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={() => {
          signOut();
          nav("/auth");
        }}
        title="Sign out?"
        body="Your data stays safe on this device for the next sign-in."
        confirmLabel="Sign out"
      />
      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteAccount();
          nav("/auth");
          toast({ title: "Account deleted", desc: "All local data for this account was removed.", tone: "info" });
        }}
        title="Delete account permanently?"
        body="This removes the account and all of its study data from this browser. There is no undo."
        confirmLabel="Delete account"
      />
    </>
  );
}
