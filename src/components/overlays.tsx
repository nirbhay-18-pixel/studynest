import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, MoreHorizontal, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, IconBtn } from "./ui";
import { cx, uid } from "../lib/utils";

/* ================= Modal ================= */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0d1512]/55 dark:bg-black/65 anim-in" style={{ animationDuration: "0.2s" }} onMouseDown={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          "relative w-full bg-surface border border-line shadow-[var(--shadow-pop)] anim-pop outline-none",
          "rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col",
          wide ? "sm:max-w-xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line shrink-0">
          <h2 className="font-display font-bold text-[17px] text-ink">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}>
            <X className="w-4.5 h-4.5" />
          </IconBtn>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="w-9 h-9 rounded-lg bg-rustwash text-rust inline-flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5" aria-hidden="true" />
        </span>
        <p className="text-sm text-mute leading-relaxed">{body}</p>
      </div>
    </Modal>
  );
}

/* ================= Dropdown menu ================= */

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  onClick: () => void;
}

export function Menu({ items, label = "Options" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconBtn label={label} onClick={() => setOpen((o) => !o)} className={cx(open && "bg-raise text-ink")}>
        <MoreHorizontal className="w-4.5 h-4.5" />
      </IconBtn>
      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-40 bg-surface border border-line rounded-xl shadow-[var(--shadow-pop)] p-1 anim-pop">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cx(
                "w-full flex items-center gap-2.5 px-3 h-8.5 rounded-lg text-[13px] font-medium text-left transition-colors",
                item.danger ? "text-rust hover:bg-rustwash" : "text-ink hover:bg-raise"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Toasts ================= */

export interface ToastInput {
  title: string;
  desc?: string;
  tone?: "success" | "error" | "info";
}
interface Toast extends ToastInput {
  id: string;
}

const ToastCtx = createContext<(t: ToastInput) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: ToastInput) => {
    const id = uid();
    setToasts((cur) => [...cur.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="card !rounded-xl px-3.5 py-3 flex items-start gap-3 anim-toast">
              <span
                className={cx(
                  "w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 mt-0.5",
                  t.tone === "error" ? "bg-rustwash text-rust" : t.tone === "info" ? "bg-raise text-mute" : "bg-pinewash text-pine"
                )}
              >
                {t.tone === "error" ? (
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                ) : t.tone === "info" ? (
                  <Info className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Check className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink leading-tight">{t.title}</p>
                {t.desc && <p className="text-xs text-mute mt-0.5 leading-snug">{t.desc}</p>}
              </div>
              <IconBtn label="Dismiss notification" className="w-6 h-6 -mr-1" onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>
                <X className="w-3.5 h-3.5" />
              </IconBtn>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}
