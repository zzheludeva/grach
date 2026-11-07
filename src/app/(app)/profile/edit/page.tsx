"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { CATEGORIES } from "@/i18n/content";
import { Avatar, Card, Chip, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { AuthorStatus, CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = ["#f66483", "#ff9f00", "#be6334", "#15484c", "#30b8b2"];

export default function EditProfile() {
  const { me, actions, state } = useStore();
  const { t, cat } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState(() => ({
    name: me!.name,
    username: me!.username,
    bio: me!.bio,
    city: me!.city,
    status: me!.status,
    color: me!.avatarColor,
    interests: me!.interests,
    skills: me!.skills.join(", "),
    links: me!.links,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = t("validation.minLength", { count: 2 });
    if (!/^[a-z0-9._]{3,24}$/.test(f.username)) e.username = t("validation.username");
    else if (state!.data.users.some((u) => u.username === f.username && u.id !== me!.id)) e.username = t("validation.usernameTaken");
    f.links.forEach((l, i) => {
      if (l.url && !/^https?:\/\/\S+\.\S+/.test(l.url)) e[`link${i}`] = t("validation.url");
    });
    setErrors(e);
    if (Object.keys(e).length) {
      toast({ text: t("validation.fixErrors"), tone: "error" });
      return;
    }
    actions.updateProfile({
      name: f.name.trim(),
      username: f.username,
      bio: f.bio.trim(),
      city: f.city.trim(),
      status: f.status,
      avatarColor: f.color,
      interests: f.interests,
      skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
      links: f.links.filter((l) => l.url && l.label),
    });
    toast({ text: t("profile.saved") });
    router.push(`/profile/${f.username}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("nav.editProfile")} />
      <Card className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={f.name} color={f.color} size={72} />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">{t("profile.avatarColor")}</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setF({ ...f, color: c })} className={cn("size-8 rounded-full ring-offset-2", f.color === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} aria-pressed={f.color === c} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("onb.name")} error={errors.name}>
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
          </Field>
          <Field label={t("onb.username")} error={errors.username}>
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.username} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} />}
          </Field>
          <Field label={t("profile.bio")} className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={3} maxLength={240} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />}
          </Field>
          <Field label={t("profile.location")}>
            {(id) => <Input id={id} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}
          </Field>
          <Field label={t("profile.status")} hint={t("profile.statusHint")}>
            {(id, desc) => (
              <Select id={id} aria-describedby={desc} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AuthorStatus })}>
                {(["hobbyist", "independent", "pro"] as AuthorStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("profile.skills")} hint={t("profile.skillsHint")} className="sm:col-span-2">
            {(id, desc) => <Input id={id} aria-describedby={desc} value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} />}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">{t("profile.interests")}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                color={c.color}
                active={f.interests.includes(c.id)}
                onClick={() => setF({ ...f, interests: f.interests.includes(c.id) ? f.interests.filter((x) => x !== c.id) : [...f.interests, c.id as CategoryId] })}
              >
                {cat(c.id)}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">{t("profile.links")}</p>
          <div className="space-y-2">
            {f.links.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.6fr_auto] items-start gap-2">
                <Input aria-label={t("profile.linkLabel")} placeholder={t("profile.linkLabel")} value={l.label} onChange={(e) => setF({ ...f, links: f.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <div>
                  <Input aria-label="URL" placeholder="https://" aria-invalid={!!errors[`link${i}`]} value={l.url} onChange={(e) => setF({ ...f, links: f.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                  {errors[`link${i}`] && <p className="mt-1 text-xs font-semibold text-rose-deep">{errors[`link${i}`]}</p>}
                </div>
                <Button variant="ghost" className="w-11 px-0" aria-label={t("common.remove")} onClick={() => setF({ ...f, links: f.links.filter((_, j) => j !== i) })}>
                  <Trash className="size-4" />
                </Button>
              </div>
            ))}
            {f.links.length < 4 && (
              <Button variant="soft" size="sm" onClick={() => setF({ ...f, links: [...f.links, { label: "", url: "" }] })}>
                <Plus className="size-4" /> {t("profile.addLink")}
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Button variant="ghost" onClick={() => router.back()}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save}>{t("common.save")}</Button>
        </div>
      </Card>
    </div>
  );
}
