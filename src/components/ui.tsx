import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

export type ToastKind = "success" | "error" | "info";
export type ToastItem = { id: number; kind: ToastKind; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function push(kind: ToastKind, text: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }
  return { toasts, push };
}

const KIND_STYLE: Record<ToastKind, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: "border-forest-600 bg-forest-800 text-forest-50",
    icon: <CheckCircle2 size={17} className="text-amber-300" />,
  },
  error: {
    wrap: "border-red-700 bg-red-900 text-red-50",
    icon: <AlertTriangle size={17} className="text-red-300" />,
  },
  info: {
    wrap: "border-amber-500 bg-amber-500 text-amber-950",
    icon: <Info size={17} className="text-amber-900" />,
  },
};

export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const s = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl ${s.wrap}`}
          >
            {s.icon}
            <span className="text-sm font-medium leading-snug">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 size={16} className={`animate-spin ${className}`} />;
}
