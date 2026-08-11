import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BellRing,
  Mic,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DRIFT_BANDS } from "@/lib/health/drift";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwasthyaShadow — Personal Baseline Health Early Warning" },
      {
        name: "description",
        content:
          "SwasthyaShadow learns each person's own health baseline from low-cost smartphone signals and flags unusual deviations early, for ASHA workers and clinicians in underserved India.",
      },
      { property: "og:title", content: "SwasthyaShadow — Personal Baseline Health Early Warning" },
      {
        property: "og:description",
        content:
          "Longitudinal, non-invasive health monitoring that compares you only to your own past — built for underserved communities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const SIGNALS = [
  {
    icon: Mic,
    title: "Voice stability",
    body: "A six-second vowel sample yields a personal acoustic stability index — no cloud lab, no wearable.",
  },
  {
    icon: Timer,
    title: "Reaction time",
    body: "A five-round tap test tracks neuro-motor responsiveness against the person's own median.",
  },
  {
    icon: Activity,
    title: "Activity & symptoms",
    body: "Daily steps plus a bilingual symptom check, weighted by how far each value sits from usual.",
  },
  {
    icon: TrendingUp,
    title: "Health Drift score",
    body: "One explainable 0–100 number describing how far today sits from a 14-day personal baseline.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-5" aria-hidden />
            </span>
            <span className="truncate font-display text-base font-bold tracking-tight">SwasthyaShadow</span>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-primary-soft to-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-[11px] font-bold tracking-wider text-primary uppercase">
              <ShieldCheck className="size-3.5" aria-hidden /> SIH prototype · not a diagnostic device
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-bold tracking-tight text-foreground sm:text-6xl">
              Your health story is personal. So is the warning.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              SwasthyaShadow learns each person's own baseline from repeated, low-cost smartphone signals —
              voice, reaction time, activity and symptoms — and surfaces unusual deviation over time, so ASHA
              workers know who to visit first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Open the prototype <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Four cheap signals, one longitudinal picture
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SIGNALS.map((s) => (
              <article key={s.title} className="surface-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Four bands, always explainable
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every band lists the exact deviations that produced it. No disease names, no black box.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DRIFT_BANDS.map((b) => (
                <li key={b.band} className="surface-card p-4">
                  <p className="font-display text-lg font-bold text-foreground">{b.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                    Drift {b.min}–{b.max}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{b.guidance}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="surface-card p-6">
              <Users className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold text-foreground">For ASHA workers</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                A priority queue of 20 demo community members ranked by personal deviation, with referral and
                clinical-review workflows built in.
              </p>
            </article>
            <article className="surface-card p-6">
              <BellRing className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold text-foreground">For citizens</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                A two-minute bilingual daily check that shows your own trend lines, in plain language, on any
                low-end Android phone.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-muted-foreground sm:px-6">
          SwasthyaShadow is a Smart India Hackathon prototype. Signal analysis is heuristic and partly
          simulated. It does not diagnose, name or rule out any disease, and every flag is designed to route to
          a qualified human.
        </div>
      </footer>
    </div>
  );
}
