"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "error";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
  action?: { label: string; href?: string; onClick?: () => void };
}
const Ctx = createContext<(t: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x.slice(-2), { id, tone: "success", ...t }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md animate-fade-up items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)]",
                t.tone === "error" ? "bg-rose-deep" : "bg-ink-deep",
              )}
            >
              <Icon className={cn("size-5 shrink-0", t.tone === "success" ? "text-teal" : t.tone === "info" ? "text-saffron" : "text-white")} />
              <span className="min-w-0 flex-1">{t.text}</span>
              {t.action &&
                (t.action.href ? (
                  <Link href={t.action.href} className="shrink-0 font-bold text-saffron hover:underline">
                    {t.action.label}
                  </Link>
                ) : (
                  <button onClick={t.action.onClick} className="shrink-0 font-bold text-saffron hover:underline">
                    {t.action.label}
                  </button>
                ))}
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="shrink-0 opacity-60 hover:opacity-100" aria-label="×">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
