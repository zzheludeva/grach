"use client";
import { useMemo, useState } from "react";
import { Minus, Plus, Search, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import type { WorkshopSession } from "@/lib/types";
import { seatsLeft } from "@/lib/workshops";
import { Avatar, Badge, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn, norm } from "@/lib/utils";

/**
 * Organizer adds a registered user to one of their sessions: search by name, @username or email,
 * pick a person, choose seats. Seat limit and double booking are checked by the same store action
 * as self-booking (and by the server function host_add_participant).
 */
export function AddParticipantModal({ session, onClose }: { session: WorkshopSession; onClose: () => void }) {
  const { state, meId, actions } = useStore();
  const { t, date } = useI18n();
  const toast = useToast();
  const d = state!.data;
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const left = seatsLeft(d, session);
  const booked = useMemo(() => new Set(d.enrollments.filter((e) => e.sessionId === session.id).map((e) => e.userId)), [d.enrollments, session.id]);

  const results = useMemo(() => {
    const nq = norm(q.trim().replace(/^@/, ""));
    if (nq.length < 2) return [];
    return d.users
      .filter((u) => u.id !== meId)
      .filter((u) => norm(u.name).split(/\s+/).some((p) => p.startsWith(nq)) || norm(u.name).includes(nq) || norm(u.username).includes(nq) || (!!u.email && norm(u.email).includes(nq)))
      .slice(0, 8);
  }, [q, d.users, meId]);

  const add = () => {
    if (!picked) return;
    const res = actions.addParticipant(session.id, picked, seats);
    if (res !== "ok") return setError(t(`wsx.add.err.${res}`));
    const u = d.users.find((x) => x.id === picked);
    toast({ text: t("wsx.add.done", { name: u?.name ?? "" }) });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("wsx.add.title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={add} disabled={!picked || left <= 0}>
            <UserPlus className="size-4" /> {t("wsx.add.submit")}
          </Button>
        </>
      }
    >
      <div className="space-y-3 p-5">
        <p className="nums text-sm text-muted">
          {date(session.startsAt, "datetime")} · {t("workshop.seatsLeft", { count: left })}
        </p>
        {left <= 0 ? (
          <p role="alert" className="rounded-xl bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-deep">{t("wsx.add.err.full")}</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCapitalize="off"
                enterKeyHint="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setError(null); }}
                placeholder={t("wsx.add.searchPh")}
                aria-label={t("wsx.add.searchPh")}
                className="ps-10"
              />
            </div>
            {q.trim().length < 2 ? (
              <p className="text-xs text-muted">{t("wsx.add.hint")}</p>
            ) : results.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-muted">{t("wsx.add.nothing")}</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto" role="listbox" aria-label={t("wsx.add.results")}>
                {results.map((u) => {
                  const already = booked.has(u.id);
                  const on = picked === u.id;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        disabled={already}
                        onClick={() => { setPicked(u.id); setError(null); }}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-start",
                          on ? "border-ink bg-ink-soft/60" : "border-transparent hover:bg-ink-soft/40",
                          already && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <Avatar name={u.name} color={u.avatarColor} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{u.name}</span>
                          <span className="block truncate text-xs text-muted">@{u.username}{u.city ? ` · ${u.city}` : ""}</span>
                          {already && <Badge tone="success" className="mt-1">{t("wsx.add.already")}</Badge>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {picked && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2">
                <span className="text-sm font-semibold text-ink">{t("wsx.add.seats")}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setSeats((n) => Math.max(1, n - 1))} className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface" aria-label="−">
                    <Minus className="size-4" />
                  </button>
                  <span className="nums w-8 text-center font-bold">{seats}</span>
                  <button type="button" onClick={() => setSeats((n) => Math.min(Math.min(left, 10), n + 1))} disabled={seats >= Math.min(left, 10)} className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface disabled:opacity-40" aria-label="+">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-rose-deep">{error}</p>}
      </div>
    </Modal>
  );
}
