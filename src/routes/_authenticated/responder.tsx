import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Siren } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { EmergencyRecordView } from "@/components/emergency/EmergencyRecordView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/health/api";
import { lookupEmergencyByCode } from "@/lib/health/emergency.functions";
import type { EmergencyBundle } from "@/lib/health/shadow-types";

export const Route = createFileRoute("/_authenticated/responder")({
  head: () => ({
    meta: [
      { title: "Emergency lookup — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Open a person's emergency record from their SwasthyaShadow code: blood group, severe allergies, medicines and family contacts.",
      },
      { property: "og:title", content: "Emergency lookup — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Critical information first, for responders arriving at a scene.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResponderPage,
});

function ResponderPage() {
  const { user } = useAuth();
  const lookup = useServerFn(lookupEmergencyByCode);
  const [code, setCode] = useState("");
  const [bundle, setBundle] = useState<EmergencyBundle | null>(null);
  const [busy, setBusy] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });

  async function search() {
    setBusy(true);
    try {
      const result = await lookup({ data: { code: code.trim() } });
      if (!result) {
        setBundle(null);
        toast.error("No record found for that code, or it is outside your access.");
        return;
      }
      setBundle(result);
    } catch {
      toast.error("That lookup could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const role = profileQuery.data?.role ?? "asha";

  return (
    <AppShell
      role={role}
      title="Emergency lookup"
      subtitle="Open a person's emergency record from the code on their card. Every lookup is recorded in their access log."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className="size-5 text-critical" aria-hidden />
              Find a record
            </CardTitle>
            <CardDescription>
              Scanning the QR on a person's card opens the same view without signing in. Use the code
              when the QR cannot be scanned.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim().length >= 4) void search();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="code">Emergency code</Label>
                <Input
                  id="code"
                  value={code}
                  maxLength={32}
                  placeholder="SSH-4KQ7P"
                  className="font-mono uppercase"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" disabled={busy || code.trim().length < 4} size="lg">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="size-4" aria-hidden />
                )}
                Open record
              </Button>
            </form>
          </CardContent>
        </Card>

        {bundle ? (
          <EmergencyRecordView bundle={bundle} />
        ) : (
          <p className="rounded-xl border border-border bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            Signed-in lookup reaches the synthetic demo records and the people in villages you are
            assigned to. Anyone else's record opens only through their own emergency scan link, which
            they can revoke at any time.
          </p>
        )}
      </div>
    </AppShell>
  );
}
