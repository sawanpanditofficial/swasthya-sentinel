import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthClient = { name?: string | null };
type AuthorizationDetails = {
  client?: OAuthClient | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult = { data: AuthorizationDetails | null; error: { message: string } | null };
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an AI assistant";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-primary-soft to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">SwasthyaShadow</span>
        </div>

        <div className="surface-card p-6">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Connect {clientName} to your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {clientName} will be able to read and act on SwasthyaShadow data as you — your own baseline
            trends, and any community cases your coverage already allows. Nothing outside your existing
            access is shared.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-monitor-soft p-3 text-xs text-monitor-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Health Drift values are prototype, non-clinical signals — not a diagnosis. You can revoke this
            connection at any time.
          </p>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-high-foreground">
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button size="lg" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Approve
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => decide(false)}>
              Deny
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
