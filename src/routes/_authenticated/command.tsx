import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { DisasterBoard, HospitalCapacity } from "@/components/emergency/DisasterBoard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/health/api";
import * as shadow from "@/lib/health/shadow-api";

export const Route = createFileRoute("/_authenticated/command")({
  head: () => ({
    meta: [
      { title: "Disaster response — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Coordinate an active event: who needs help first by prototype attention level, live hospital beds and triage status.",
      },
      { property: "og:title", content: "Disaster response — SwasthyaShadow" },
      {
        property: "og:description",
        content: "A demo command view for community health during a disaster.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandPage,
});

function CommandPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const disastersQuery = useQuery({ queryKey: ["disasters"], queryFn: shadow.listDisasters });
  const hospitalsQuery = useQuery({ queryKey: ["hospitals"], queryFn: shadow.listHospitals });

  const disasters = disastersQuery.data ?? [];
  const active = disasters.find((d) => d.id === selected) ?? disasters[0] ?? null;

  const statusesQuery = useQuery({
    queryKey: ["disaster-status", active?.id],
    enabled: !!active,
    queryFn: () => shadow.listDisasterStatuses(active!.id),
  });

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["disaster-status", active?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That update did not go through.");
    } finally {
      setBusy(false);
    }
  }

  if (profileQuery.isLoading || disastersQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AppShell
      role={profileQuery.data?.role ?? "asha"}
      title="Disaster response"
      subtitle="Reach the people whose records need the most attention first, and keep bed availability current."
    >
      <div className="space-y-6">
        {disasters.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {disasters.map((d) => (
              <Button
                key={d.id}
                variant={d.id === active?.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelected(d.id)}
              >
                {d.name}
              </Button>
            ))}
          </div>
        )}

        {active ? (
          <DisasterBoard
            event={active}
            rows={statusesQuery.data ?? []}
            hospitals={hospitalsQuery.data ?? []}
            busy={busy}
            onTriage={(id, status) => run(() => shadow.updateTriage(id, { triage_status: status }))}
            onAssignHospital={(id, hospitalId) =>
              run(() => shadow.updateTriage(id, { hospital_id: hospitalId }))
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No events</CardTitle>
              <CardDescription>No disaster event is being tracked right now.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        )}

        <HospitalCapacity hospitals={hospitalsQuery.data ?? []} />

        <p className="rounded-xl border border-border bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          Attention levels come from what each person has recorded about themselves and from their own
          baseline trend. They are prototype prioritisation signals for reaching people, not clinical
          triage categories.
        </p>
      </div>
    </AppShell>
  );
}
