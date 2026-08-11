import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Activity, BellRing, ClipboardCheck, LogOut, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/health/types";

const navByRole: Record<UserRole, { to: string; label: string; icon: typeof Activity }[]> = {
  patient: [
    { to: "/patient", label: "My health", icon: Activity },
    { to: "/check", label: "Daily check", icon: ClipboardCheck },
  ],
  asha: [
    { to: "/worker", label: "Community", icon: Users },
    { to: "/alerts", label: "Alerts", icon: BellRing },
  ],
  doctor: [
    { to: "/worker", label: "Community", icon: Users },
    { to: "/alerts", label: "Alerts", icon: BellRing },
  ],
};

export function AppShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: UserRole;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nav = navByRole[role];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold tracking-tight text-foreground">
                SwasthyaShadow
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {role === "patient" ? "Citizen view" : role === "asha" ? "ASHA worker view" : "Clinician view"}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        <p className="mt-10 rounded-xl border border-border bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          SwasthyaShadow is an SIH prototype. It surfaces deviations from a person's own baseline to support
          human decision-making. It is not a diagnostic device, does not name diseases, and never replaces a
          qualified clinician.
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md">
        <ul className="mx-auto flex max-w-5xl">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors"
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
