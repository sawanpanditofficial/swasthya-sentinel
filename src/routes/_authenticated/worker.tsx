import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Search, Users, AlertTriangle, Activity } from "lucide-react";
import { AppShell } from "@/components/health/AppShell";
import { PriorityQueue } from "@/components/health/PriorityQueue";
import { PatientCard } from "@/components/health/PatientCard";
import { Input } from "@/components/ui/input";
import { listPatients } from "@/lib/health/api";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/health/api";

export const Route = createFileRoute("/_authenticated/worker")({
  head: () => ({
    meta: [
      { title: "Community monitoring — SwasthyaShadow" },
      {
        name: "description",
        content:
          "ASHA worker cockpit: see which community members deviate most from their own baseline and who needs a home visit first.",
      },
      { property: "og:title", content: "Community monitoring — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Prioritise home visits using personal-baseline deviation, not population averages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const patientsQuery = useQuery({ queryKey: ["patients"], queryFn: listPatients });
  const patients = patientsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) || (p.village ?? "").toLowerCase().includes(needle),
    );
  }, [patients, q]);

  const stats = useMemo(
    () => ({
      total: patients.length,
      flagged: patients.filter((p) => p.status === "review" || p.status === "high_priority").length,
      monitor: patients.filter((p) => p.status === "monitor").length,
    }),
    [patients],
  );

  if (patientsQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  const role = profileQuery.data?.role === "doctor" ? "doctor" : "asha";

  return (
    <AppShell
      role={role}
      title="Community monitoring"
      subtitle="Ranked by each person's deviation from their own baseline. Every flag needs human judgement."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "People tracked", value: stats.total, icon: Users, tone: "bg-primary-soft" },
            { label: "Needs review", value: stats.flagged, icon: AlertTriangle, tone: "bg-critical-soft" },
            { label: "Watchlist", value: stats.monitor, icon: Activity, tone: "bg-monitor-soft" },
          ].map((s) => (
            <div key={s.label} className={`surface-card p-4 ${s.tone}`}>
              <s.icon className="size-5 text-foreground/70" aria-hidden />
              <p className="mt-2 font-display text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs font-medium text-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>

        <PriorityQueue patients={patients} />

        <section aria-label="All community members">
          <header className="mb-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:items-center sm:justify-between">
            <h2 className="min-w-0 truncate text-base font-semibold text-foreground">
              All community members
            </h2>
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or village"
                aria-label="Search community members"
                className="h-11 pl-9"
              />
            </div>
          </header>
          <ul className="space-y-3">
            {filtered.map((p) => (
              <li key={p.id}>
                <PatientCard patient={p} />
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="surface-card p-5 text-sm text-muted-foreground">No members match that search.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
