import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Brain,
  Database,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentLens — Workforce & Recruitment Intelligence" },
      {
        name: "description",
        content:
          "TalentLens turns HR data into decisions: workforce analytics, recruitment funnel intelligence, attrition risk modelling and hiring gap analysis in one platform.",
      },
      { property: "og:title", content: "TalentLens — Workforce & Recruitment Intelligence" },
      {
        property: "og:description",
        content:
          "Workforce analytics, recruitment funnel intelligence, attrition risk modelling and hiring gap analysis for people teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: BarChart3,
    title: "Workforce analytics",
    text: "Headcount trends, tenure, pay bands, performance spread and department structure — all filterable.",
  },
  {
    icon: LineChart,
    title: "Recruitment intelligence",
    text: "Full funnel from application to joining, with time-to-hire, offer acceptance and cost per hire.",
  },
  {
    icon: TrendingDown,
    title: "Attrition intelligence",
    text: "Exit patterns by tenure, pay, satisfaction, overtime and manager stability, with exit-reason analysis.",
  },
  {
    icon: Brain,
    title: "Attrition risk model",
    text: "A logistic model trained on your own historical patterns scores every active employee Low, Medium or High.",
  },
  {
    icon: Target,
    title: "Workforce gap analysis",
    text: "Required vs current vs projected headcount per department, with severity ranking for hiring plans.",
  },
  {
    icon: Database,
    title: "Your own data",
    text: "Upload CSV or Excel files, map your columns to the model, validate rows and import them safely.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
              TL
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">TalentLens</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> People analytics without the spreadsheet sprawl
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            See your workforce and your hiring pipeline in one clear picture.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            TalentLens connects employee records, job openings and candidate activity into live
            analytics — so HR leaders can explain what happened, why it happened and what to do
            next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open Workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Connect your PostgreSQL database or upload employee CSV/XLSX spreadsheets in Data Management to activate live workforce analytics.
          </p>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full">
                <CardHeader>
                  <f.icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">Built for real decisions</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Every metric is computed from records in your workspace — no illustrative numbers,
                no decorative charts. Filters apply across every page at once.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Explainable, not magical</CardTitle>
                <CardDescription>
                  Risk scores come with feature importance and a plain-language reason, and are
                  labelled as a model-generated indicator based on historical workforce patterns.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheck className="size-5 text-primary" />
                <CardTitle className="text-base">Private by default</CardTitle>
                <CardDescription>
                  Sign-in required, role-based write access, and row-level security on every table
                  holding employee or candidate data.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground">
          <span>TalentLens — Workforce &amp; Recruitment Intelligence</span>
          <Link to="/auth" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
