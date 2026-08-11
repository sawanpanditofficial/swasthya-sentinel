import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { EmergencyRecordView } from "@/components/emergency/EmergencyRecordView";
import { openEmergencyCard } from "@/lib/health/emergency.functions";
import { readOfflineCopy } from "@/lib/health/shadow";
import type { EmergencyBundle } from "@/lib/health/shadow-types";

export const Route = createFileRoute("/emergency/$token")({
  head: () => ({
    meta: [
      { title: "Emergency record — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Break-glass emergency record opened from a SwasthyaShadow card: blood group, severe allergies, current medicines and family contacts.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Emergency record — SwasthyaShadow" },
      { property: "og:description", content: "Critical information first, for whoever is helping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmergencyTokenPage,
  errorComponent: () => <Fallback message="This emergency link could not be opened." />,
  notFoundComponent: () => <Fallback message="This emergency link is not valid." />,
});

function Fallback({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-sm space-y-3 text-center">
        <ShieldAlert className="mx-auto size-10 text-critical" aria-hidden />
        <h1 className="font-display text-xl font-bold">{message}</h1>
        <p className="text-sm text-muted-foreground">
          The person may have revoked it, or it may have expired. Ask them to show a fresh card.
        </p>
        <Link to="/" className="inline-block text-sm font-semibold text-primary underline">
          Go to SwasthyaShadow
        </Link>
      </div>
    </div>
  );
}

function EmergencyTokenPage() {
  const { token } = Route.useParams();
  const open = useServerFn(openEmergencyCard);
  const [bundle, setBundle] = useState<EmergencyBundle | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await open({ data: { token } });
        if (cancelled) return;
        if (!result.ok) throw new Error(result.reason);
        setBundle(result.bundle);
        setState("ready");
      } catch {

        // No network or a rejected token: fall back to a copy saved on this device.
        const cached = readOfflineCopy(`token.${token}`);
        if (cancelled) return;
        if (cached) {
          setBundle(cached.bundle);
          setOffline(true);
          setState("ready");
        } else {
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-critical" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">Opening emergency record…</p>
        </div>
      </div>
    );
  }

  if (state === "error" || !bundle) {
    return <Fallback message="This emergency link is not valid." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-critical bg-critical/10 px-4 py-3 text-center">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-critical">
          Emergency access · आपातकालीन जानकारी
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {offline
            ? "Shown from a copy saved on this device. This view was not recorded in the access log."
            : "This opening has been recorded in the person's access log."}
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">
        <EmergencyRecordView bundle={bundle} />
        <p className="mt-8 rounded-xl border border-border bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          This record is entered by the person or read from their own papers. SwasthyaShadow does not
          diagnose, and nothing here replaces examination by a qualified clinician.
        </p>
      </main>
    </div>
  );
}
