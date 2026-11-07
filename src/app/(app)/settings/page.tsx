"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/i18n/I18nProvider";
import { Card, PageHeader, SectionTitle, DemoNote } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { RegionFields } from "@/components/settings/RegionFields";
import { formatAddressLines, region } from "@/lib/regions";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { settings, actions, me } = useStore();
  const { t, money, date, num } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const r = region(settings.country);
  const sampleAddress: Record<string, string> =
    settings.country === "BR"
      ? { cep: "01310-100", state: "SP", city: "São Paulo", neighborhood: "Bela Vista", street: "Av. Paulista", number: "1578", complement: "" }
      : { postalCode: "191186", region: "Санкт-Петербург", city: "Санкт-Петербург", street: "Невский проспект", house: "28", apartment: "" };
  const now = new Date().toISOString();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t("settings.regional")}</SectionTitle>
          <RegionFields
            value={settings}
            onChange={(p) => {
              actions.updateSettings(p);
              toast({ text: t("settings.saved") });
            }}
          />
          <DemoNote className="mt-5">{t("settings.independentNote")}</DemoNote>
        </Card>
        <Card className="h-fit p-5">
          <SectionTitle>{t("settings.preview")}</SectionTitle>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pPrice")}</dt>
              <dd className="nums font-bold text-ink">
                {money({ amount: 3200, currency: "RUB" })} · {money({ amount: 249.9, currency: "BRL" })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pNumber")}</dt>
              <dd className="nums font-bold text-ink">{num(1234567.89)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pDate")}</dt>
              <dd className="nums font-bold text-ink">
                {date(now, "short")} · {date(now, "long")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pTime")}</dt>
              <dd className="nums font-bold text-ink">
                {date(now, "time")} ({settings.timeZone.split("/").pop()?.replace(/_/g, " ")})
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pPhone")}</dt>
              <dd className="nums font-bold text-ink">{r.phone.placeholder}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pAddress")}</dt>
              <dd className="font-semibold text-ink">
                {formatAddressLines(settings.country, sampleAddress).map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-faint">{t("settings.pDelivery")}</dt>
              <dd className="font-semibold text-ink">{r.delivery.map((m) => t(`delivery.${settings.country}.${m.id}`)).join(" · ")}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5 sm:p-6 xl:col-span-2">
          <SectionTitle>{t("settings.account")}</SectionTitle>
          <p className="text-sm text-muted">
            {t("settings.signedInAs", { name: me!.name })} {me!.email && <span className="text-faint">({me!.email})</span>}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                actions.logout();
                router.push("/welcome");
              }}
            >
              <LogOut className="size-4" /> {t("nav.logout")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(t("settings.resetConfirm"))) {
                  actions.resetDemo();
                  router.push("/welcome");
                }
              }}
            >
              <RotateCcw className="size-4" /> {t("settings.reset")}
            </Button>
            <Link href="/credits" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-muted hover:text-ink">
              {t("welcome.photoCredits")}
            </Link>
          </div>
          <p className="mt-3 text-xs text-faint">{t("settings.resetHint")}</p>
        </Card>
      </div>
    </div>
  );
}
