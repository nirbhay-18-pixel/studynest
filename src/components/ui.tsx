import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Check,
  Code,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Leaf,
  LineChart,
  Loader2,
  PenLine,
  Scale,
  School,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Priority } from "../types";
import { cx } from "../lib/utils";

/* ---------- Brand ---------- */

export function Logo({ size = 30, withWord = true, className }: { size?: number; withWord?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 select-none", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--pine)" />
        <path d="M8 17c0 4 3.6 6.5 8 6.5s8-2.5 8-6.5" fill="none" stroke="#f2e8c9" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9.5 15.5c2 1.6 4.1 2.4 6.5 2.4s4.5-.8 6.5-2.4" fill="none" stroke="#f2e8c9" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="16" cy="12.4" rx="3.9" ry="4.9" fill="#f2e8c9" />
      </svg>
      {withWord && (
        <span className="font-display font-bold text-[17px] tracking-tight leading-none text-ink">
          Study<span className="text-pine">Nest</span>
        </span>
      )}
    </span>
  );
}

/* ---------- Subject glyphs ---------- */

export const SUBJECT_GLYPHS: Record<string, LucideIcon> = {
  book: BookOpen,
  flask: FlaskConical,
  atom: Atom,
  calc: Calculator,
  globe: Globe,
  code: Code,
  scale: Scale,
  brain: Brain,
  pen: PenLine,
  chart: LineChart,
  leaf: Leaf,
  landmark: Landmark,
  school: School,
  grad: GraduationCap,
  star: Star,
};

export function SubjectGlyph({ icon, className }: { icon: string; className?: string }) {
  const G = SUBJECT_GLYPHS[icon] ?? BookOpen;
  return <G className={className} aria-hidden="true" />;
}

/* ---------- Buttons ---------- */

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "subtle" | "ember";
type BtnSize = "xs" | "sm" | "md" | "lg";

const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-pine text-white hover:bg-pinedeep dark:text-[#0d1a13] shadow-sm",
  outline: "border border-line bg-surface text-ink hover:border-linex hover:bg-raise",
  ghost: "text-mute hover:text-ink hover:bg-raise",
  danger: "bg-rust text-white hover:brightness-95 shadow-sm",
  subtle: "bg-pinewash text-pine hover:brightness-[0.98] dark:hover:brightness-110",
  ember: "bg-ember text-white hover:brightness-95 shadow-sm",
};
const btnSizes: Record<BtnSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({ variant = "primary", size = "md", loading, icon: Icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] whitespace-nowrap",
        btnVariants[variant],
        btnSizes[size],
        (disabled || loading) && "opacity-55 pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex items-center justify-center w-8 h-8 rounded-lg text-mute hover:text-ink hover:bg-raise transition-colors active:scale-95",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */

const fieldBase =
  "w-full bg-surface border border-line rounded-lg px-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20";

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx(fieldBase, "h-9.5", invalid && "border-rust focus:border-rust focus:ring-rust/20", className)} {...rest} />;
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx(fieldBase, "py-2 min-h-20 resize-y", invalid && "border-rust", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, "h-9.5 appearance-none bg-no-repeat pr-8 cursor-pointer", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2388968a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 10px center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-left">
      <span className="block text-[13px] font-semibold text-ink mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-faint mt-1">{hint}</span>}
      {error && (
        <span className="block text-xs font-medium text-rust mt-1" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative w-10.5 h-6 rounded-full transition-colors duration-200 shrink-0",
        checked ? "bg-pine" : "bg-linex"
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-4.5"
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex items-center gap-0.5 bg-raise border border-line rounded-lg p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "px-3 h-7.5 rounded-[7px] text-[13px] font-semibold transition-all duration-150",
            value === o.value ? "bg-surface text-ink shadow-sm border border-line" : "text-mute hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Indicators ---------- */

export function ProgressBar({ pct, color = "var(--pine)", className, thin }: { pct: number; color?: string; className?: string; thin?: boolean }) {
  return (
    <div className={cx("w-full rounded-full bg-raise border border-line/70 overflow-hidden", thin ? "h-1.5" : "h-2.5", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out bar-grow"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

export function Ring({
  pct,
  size = 52,
  stroke = 5,
  color = "var(--pine)",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Badge({
  tone = "mute",
  className,
  children,
}: {
  tone?: "pine" | "ember" | "rust" | "mute" | "moss";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    pine: "bg-pinewash text-pine",
    ember: "bg-emberwash text-ember",
    rust: "bg-rustwash text-rust",
    mute: "bg-raise text-mute border border-line",
    moss: "bg-mossash text-moss",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 h-5.5 px-2 rounded-md text-[11px] font-bold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  high: { label: "High", color: "var(--rust)", rank: 0 },
  medium: { label: "Medium", color: "var(--ember)", rank: 1 },
  low: { label: "Low", color: "var(--moss)", rank: 2 },
};

export function PriorityBadge({ p }: { p: Priority }) {
  const meta = PRIORITY_META[p];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: meta.color }}>
      <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true">
        <path d="M1 10.5V1h6.5L5.8 3l1.7 2H1" fill="currentColor" />
      </svg>
      {meta.label}
    </span>
  );
}

/* ---------- Checkbox ---------- */

export function CheckButton({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cx(
        "w-5 h-5 rounded-md border-2 inline-flex items-center justify-center transition-all duration-150 shrink-0 active:scale-90",
        checked ? "bg-pine border-pine" : "border-linex bg-surface hover:border-pine"
      )}
    >
      {checked && <Check className="w-3 h-3 text-white dark:text-[#0d1a13] tick-anim" strokeWidth={3.5} aria-hidden="true" />}
    </button>
  );
}
