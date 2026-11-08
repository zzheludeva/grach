"use client";
import { StoreProvider, useStore } from "@/lib/store";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ToastProvider } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/mosaic";

function Bridge({ children }: { children: React.ReactNode }) {
  const { ready, settings, state, meId } = useStore();
  if (!ready || !state) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
        <Logo withText={false} />
        <Spinner />
      </div>
    );
  }
  const lang = meId ? settings.lang : state.deviceLang;
  return (
    <I18nProvider locale={lang} country={settings.country} timeZone={settings.timeZone}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Bridge>{children}</Bridge>
    </StoreProvider>
  );
}
