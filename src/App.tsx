import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
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
  return <AppShell />;
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
