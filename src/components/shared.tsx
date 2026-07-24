import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Search, Trash2, X } from "lucide-react";
import { PAGE_SIZE } from "../lib/usePaged";
import { Spinner } from "./ui";

export const inputCls =
  "w-full rounded-lg border border-forest-200 bg-forest-50/50 px-3 py-2 text-sm text-forest-900 outline-none transition placeholder:text-forest-400 focus:border-forest-500 focus:bg-white focus:ring-2 focus:ring-forest-500/15 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-forest-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-forest-400">{hint}</span>}
    </label>
  );
}

export function Modal({
  title,
  icon,
  onClose,
  children,
  footer,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-forest-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
              {icon}
            </div>
            <h3 className="font-display text-base font-semibold text-forest-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-forest-400 transition hover:bg-forest-50 hover:text-forest-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-2 border-t border-forest-100 bg-forest-50/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({
  title,
  description,
  entity,
  confirmLabel = "Șterge",
  busyLabel = "Se șterge…",
  onConfirm,
  onClose,
}: {
  title: string;
  description: ReactNode;
  entity?: string;
  confirmLabel?: string;
  busyLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirma() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // eroarea e semnalată de apelant; modalul rămâne deschis
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) confirma();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-forest-950/50 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="animate-modal-in w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-400 to-amber-400" />
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
            <span className="animate-gen-pulse absolute inset-0 rounded-full bg-red-500/15" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-forest-950">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-forest-600">{description}</p>
          {entity && (
            <div className="mt-3.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-red-100 bg-red-50/70 px-3 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="truncate font-mono text-xs font-semibold text-red-700">
                {entity}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-forest-100 bg-forest-50/60 px-5 py-3.5">
          <p className="mr-auto flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-forest-400">
            <AlertTriangle size={12} className="text-amber-500" />
            Ireversibil
          </p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-forest-200 bg-white px-4 py-2 text-sm font-semibold text-forest-700 transition hover:border-forest-400 hover:bg-forest-50 disabled:opacity-50"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={confirma}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Spinner /> : <Trash2 size={15} />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-64 rounded-lg border border-forest-200 bg-forest-50/50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-forest-400 focus:border-forest-500 focus:bg-white focus:ring-2 focus:ring-forest-500/15"
      />
    </div>
  );
}

export function TableCard({
  icon,
  title,
  subtitle,
  search,
  onSearch,
  placeholder,
  error,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-[0_1px_3px_rgba(10,49,40,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
            {icon}
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-forest-900">{title}</h3>
            <p className="text-xs text-forest-500">{subtitle}</p>
          </div>
        </div>
        <SearchInput value={search} onChange={onSearch} placeholder={placeholder} />
      </div>
      <div className="min-h-[16rem] max-h-[calc(100vh_-_17rem)] overflow-auto">{children}</div>
      {error && (
        <p className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {footer}
    </section>
  );
}

export function Pagination({
  offset,
  hasMore,
  loading,
  onPrev,
  onNext,
}: {
  offset: number;
  hasMore: boolean;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-forest-100 px-4 py-2.5 text-xs text-forest-600">
      <span className="num">
        {offset + 1}–{offset + PAGE_SIZE}
      </span>
      <div className="flex gap-1.5">
        <button
          disabled={offset === 0 || loading}
          onClick={onPrev}
          className="flex items-center gap-1 rounded-md border border-forest-200 bg-white px-2.5 py-1 font-medium transition hover:border-forest-400 hover:text-forest-800 disabled:opacity-40"
        >
          <ChevronLeft size={13} />
          Înapoi
        </button>
        <button
          disabled={!hasMore || loading}
          onClick={onNext}
          className="flex items-center gap-1 rounded-md border border-forest-200 bg-white px-2.5 py-1 font-medium transition hover:border-forest-400 hover:text-forest-800 disabled:opacity-40"
        >
          Înainte
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
