import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/health/api";
import type { UserRole } from "@/lib/health/types";

function safeNext(value: unknown): string {
  // Only same-origin relative paths may be used as a post-sign-in target.
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — SwasthyaShadow Health Monitoring" },
      {
        name: "description",
        content:
          "Sign in to SwasthyaShadow to record daily low-cost health checks and track deviations from your personal baseline.",
      },
      { property: "og:title", content: "Sign in — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Citizen and ASHA worker access to longitudinal, baseline-aware health monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "patient", label: "Citizen", hint: "Track my own baseline" },
  { value: "asha", label: "ASHA worker", hint: "Monitor my community" },
  { value: "doctor", label: "Clinician", hint: "Review flagged cases" },
];

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<UserRole>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (next) {
      window.location.href = next;
      return;
    }
    (async () => {
      const profile = await ensureProfile(user.id, user.user_metadata?.["full_name"] as string | undefined);
      navigate({ to: profile.role === "patient" ? "/patient" : "/worker", replace: true });
    })().catch(() => navigate({ to: "/patient", replace: true }));
  }, [user, navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: next ? window.location.origin + next : window.location.origin,
            data: { full_name: name.trim(), role },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? window.location.origin + next : window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try email instead.");
      return;
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-primary-soft to-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">SwasthyaShadow</span>
        </Link>

        <div className="surface-card p-6">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your baseline tracking."
              : "Your baseline is personal — nothing is compared against other people."}
          </p>

          {sent ? (
            <p className="mt-5 rounded-xl bg-monitor-soft p-4 text-sm text-monitor-foreground">
              We sent a confirmation link to <strong>{email}</strong>. Confirm it, then sign in.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      required
                      className="mt-1.5 h-12"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium">I am a…</span>
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          aria-pressed={role === r.value}
                          onClick={() => setRole(r.value)}
                          className={
                            role === r.value
                              ? "min-h-16 rounded-lg border border-primary bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground"
                              : "min-h-16 rounded-lg border border-border bg-card px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                          }
                        >
                          <span className="block">{r.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal opacity-80">{r.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="mt-1.5 h-12"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1.5 h-12"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || loading}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" size="lg" className="w-full" onClick={google}>
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to SwasthyaShadow?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSent(false);
              }}
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
