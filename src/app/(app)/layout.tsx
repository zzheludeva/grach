import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Spinner } from "@/components/ui/primitives";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<Spinner className="py-20" />}>{children}</Suspense>
    </AppShell>
  );
}
