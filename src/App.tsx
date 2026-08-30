import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Component } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useApp } from "./store/store";
import { ToastProvider } from "./components/overlays";
import AppShell from "./components/AppShell";
import { Logo } from "./components/ui";
import AuthPage from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SubjectsPage from "./pages/Subjects";
import SubjectDetailPage from "./pages/SubjectDetail";
import TasksPage from "./pages/Tasks";
import StudyPage from "./pages/Study";
import GoalsPage from "./pages/Goals";
import AnalyticsPage from "./pages/Analytics";
import AssistantPage from "./pages/Assistant";
import SettingsPage from "./pages/Settings";
import SyllabusPage from "./pages/Syllabus";

/** Catches render-time failures so a bad page never leaves a blank screen. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen app-bg flex items-center justify-center p-6">
          <div className="card p-8 max-w-md w-full text-center anim-pop">
            <span className="w-12 h-12 rounded-2xl bg-rustwash text-rust inline-flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </span>
            <h1 className="font-display font-bold text-lg text-ink mt-4">Something went wrong on this page</h1>
            <p className="text-sm text-mute mt-2 leading-relaxed">
              Your study data is safe in local storage. Reload to continue — if it keeps happening, the error below
              may help.
            </p>
            <p className="text-[11px] font-mono text-faint mt-3 break-all">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-pine text-white dark:text-[#0d1a13] text-sm font-semibold hover:bg-pinedeep transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reload StudyNest
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Splash() {
  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center gap-5">
      <Logo size={44} />
      <div className="flex gap-1.5" aria-label="Loading StudyNest">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-pine typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

/** Public pages only — signed-in users are routed onward. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { status, user, data } = useApp();
  if (status === "boot") return <Splash />;
  if (user && data?.profile.onboarded) return <Navigate to="/dashboard" replace />;
  if (user) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Onboarding needs an account. */
function OnboardGate() {
  const { status, user } = useApp();
  if (status === "boot") return <Splash />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Onboarding />;
}

/** Everything behind auth + onboarding. */
function Protected() {
  const { status, user, data } = useApp();
  if (status === "boot") return <Splash />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!data?.profile.onboarded) return <Navigate to="/onboarding" replace />;
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<PublicOnly><AuthPage /></PublicOnly>} />
          <Route path="/onboarding" element={<OnboardGate />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:id" element={<SubjectDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/syllabus" element={<SyllabusPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
