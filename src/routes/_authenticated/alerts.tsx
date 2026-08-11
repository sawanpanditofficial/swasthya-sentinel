import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { AlertCard } from "@/components/health/AlertCard";
import { acknowledgeAlert, ensureProfile, listAlerts } from "@/lib/health/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Early-warning alerts — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Review baseline-deviation alerts raised across the community, acknowledge them and escalate for clinical review.",
      },
      { property: "og:title", content: "Early-warning alerts — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Deviation alerts with explicit human-review guidance — never automated diagnosis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: () => listAlerts(20) });

  const ack = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert acknowledged.");
    },
    onError: () => toast.error("Could not acknowledge that alert."),
  });

  const role = profileQuery.data?.role === "doctor" ? "doctor" : "asha";
  const alerts = alertsQuery.data ?? [];

  return (
    <AppShell
      role={role}
      title="Early-warning alerts"
      subtitle="Raised when someone's own signals deviate meaningfully from their personal baseline."
    >
      {alertsQuery.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        </div>
      ) : alerts.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">
          No open alerts. New alerts appear here as soon as a deviation is detected.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              patient={a.patient ?? null}
              onAcknowledge={(id) => ack.mutate(id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
