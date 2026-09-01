import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Flame,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Target,
  Timer,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GraduationCap } from "lucide-react";
import { setTheme, signOut, timerElapsed, useApp, useNow } from "../store/store";
import { calcStreaks } from "../lib/stats";
import { cx, fmtClock, initials } from "../lib/utils";
import { IconBtn, Logo } from "./ui";
import { useToast } from "./overlays";

const NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/syllabus", label: "JEE Syllabus", icon: GraduationCap },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/study", label: "Study", icon: Timer },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/assistant", label: "Assistant", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

function TimerPill() {
  const { data } = useApp();
  const t = data?.timer;
  const active = !!t?.active;
  const now = useNow(active, 500);
  const nav = useNavigate();
  if (!t || !t.active) return null;
  const sec = timerElapsed(t, now);
  return (
    <button
      onClick={() => nav("/study")}
      className={cx(
        "inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full border text-[13px] font-bold transition-colors",
        t.paused
          ? "bg-emberwash text-ember border-ember/40"
          : "bg-pine text-white dark:text-[#0d1a13] border-pine shadow-sm hover:brightness-110"
      )}
      title="Open study timer"
    >
      <span className={cx("w-2 h-2 rounded-full", t.paused ? "bg-ember" : "bg-white dark:bg-[#0d1a13] pulse-dot")} aria-hidden="true" />
      <span className="tnum font-mono">{fmtClock(sec)}</span>
      {t.paused && <span className="text-[10px] uppercase tracking-wider">paused</span>}
    </button>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const streak = useApp().data ? calcStreaks(useApp().data!.sessions).current : 0;
  return (
    <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              "relative flex items-center gap-3 px-3 h-10 rounded-xl text-[13.5px] font-semibold transition-all duration-150 group",
              isActive ? "bg-white/12 text-white" : "text-sidebarink hover:bg-white/6 hover:text-white"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cx(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-[#e9c46a] transition-all duration-200",
                  isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                )}
                aria-hidden="true"
              />
              <item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              {item.label}
              {item.label === "Assistant" && (
                <span className="ml-auto text-[9px] font-extrabold uppercase tracking-wider bg-[#e9c46a]/15 text-[#e9c46a] px-1.5 py-0.5 rounded">
                  AI
                </span>
              )}
              {item.label === "Study" && streak > 0 && (
                <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#f0a35e] tnum">
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                  {streak}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const { data, user } = useApp();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const theme = data?.profile.theme ?? "light";

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  const doSignOut = () => {
    signOut();
    nav("/auth");
    toast({ title: "Signed out", desc: "See you at the next session.", tone: "info" });
  };

  const userBlock = (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-2.5 bg-white/6 border border-white/8 rounded-xl px-3 py-2.5">
        <span className="w-8.5 h-8.5 rounded-lg bg-[#e9c46a] text-[#231a05] font-display font-extrabold text-[13px] inline-flex items-center justify-center shrink-0">
          {initials(user?.name ?? "?")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white leading-tight truncate">{user?.name}</p>
          <p className="text-[10.5px] text-sidebarink uppercase tracking-wider font-bold">{data?.profile.prepType}</p>
        </div>
        <IconBtn label="Sign out" onClick={doSignOut} className="text-sidebarink hover:text-white hover:bg-white/10 w-7.5 h-7.5">
          <LogOut className="w-4 h-4" />
        </IconBtn>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen app-bg">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-sidebar flex-col z-40 border-r border-black/20">
        <div className="px-5 h-16 flex items-center border-b border-white/8">
          <Logo size={30} />
        </div>
        <div className="flex-1 flex flex-col pt-4 overflow-y-auto">
          <NavLinks />
          {userBlock}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 h-14 bg-surface/92 backdrop-blur border-b border-line flex items-center gap-2 px-3">
        <IconBtn label="Open navigation menu" onClick={() => setDrawer(true)}>
          <MenuIcon className="w-5 h-5" />
        </IconBtn>
        <Logo size={26} />
        <div className="ml-auto flex items-center gap-1.5">
          <TimerPill />
          <IconBtn label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </IconBtn>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/55 anim-in" style={{ animationDuration: "0.18s" }} onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-66 max-w-[85vw] bg-sidebar flex flex-col anim-in" style={{ animationDuration: "0.22s" }}>
            <div className="px-4 h-14 flex items-center justify-between border-b border-white/8">
              <Logo size={27} />
              <IconBtn label="Close menu" onClick={() => setDrawer(false)} className="text-sidebarink hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </IconBtn>
            </div>
            <div className="flex-1 flex flex-col pt-3 overflow-y-auto">
              <NavLinks onNavigate={() => setDrawer(false)} />
              {userBlock}
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-60">
        <div className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-end gap-2 px-8 bg-paper/85 backdrop-blur border-b border-line/70">
          <TimerPill />
          <IconBtn label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </IconBtn>
          <span className="w-8.5 h-8.5 rounded-lg bg-pinewash text-pine font-display font-extrabold text-[13px] inline-flex items-center justify-center" title={user?.name}>
            {initials(user?.name ?? "?")}
          </span>
        </div>
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
