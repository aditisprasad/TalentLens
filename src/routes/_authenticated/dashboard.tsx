import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { Bars, Donut, FunnelBars, LineTrend, TrendChart } from "@/components/talent/charts";
import {
  ChartCard,
  EmptyState,
  InsightNote,
  KpiCard,
  LoadingGrid,
} from "@/components/talent/primitives";
import { useAnalytics } from "@/lib/analytics/store";
import {
  attritionBreakdowns,
  attritionSeries,
  countBy,
  dashboardKpis,
  funnel,
  headcountSeries,
  hiringSeries,
  recruitmentSummary,
  sourcePerformance,
  tenureDistribution,
  workforceGaps,
  workforceSummary,
} from "@/lib/analytics/compute";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TalentLens" },
      {
        name: "description",
        content: "Live workforce and recruitment KPIs across headcount, hiring, attrition and cost.",
      },
      { property: "og:title", content: "Dashboard — TalentLens" },
      { property: "og:description", content: "Live workforce and recruitment KPIs." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();

  const view = useMemo(() => {
    const headcount = headcountSeries(data.employees);
    const hires = hiringSeries(data.employees);
    const exits = attritionSeries(data.employees);
    return {
      kpis: dashboardKpis(data),
      headcount,
      flow: hires.map((h, i) => ({
        label: h.label,
        hires: h.value,
        exits: exits[i]?.exits ?? 0,
      })),
      byDepartment: countBy(
        data.employees.filter((e) => e.attrition_status === "active"),
        (e) => e.department,
      ),
      funnel: funnel(data.candidates),
      sources: sourcePerformance(data.candidates).rows.slice(0, 6),
      tenure: tenureDistribution(data.employees.filter((e) => e.attrition_status === "active")),
      attritionByDept: attritionBreakdowns(data.employees).byDepartment.slice(0, 8),
      gaps: workforceGaps(data.employees, data.jobs, data.targets).slice(0, 8),
      workforceNote: workforceSummary(data.employees),
      recruitmentNote: recruitmentSummary(data.candidates, data.jobs),
    };
  }, [data]);

  return (
    <AppShell
      title="Executive dashboard"
      description="Workforce health and hiring performance at a glance"
    >
      <FilterBar options={options} show={["department", "location", "jobRole", "employmentType"]} />

      {isLoading ? (
        <LoadingGrid />
      ) : isError ? (
        <EmptyState
          title="We couldn't load your data"
          description={error instanceof Error ? error.message : "Please try refreshing the page."}
        />
      ) : isEmpty ? (
        <EmptyState
          title="No workforce data yet"
          description="Import an employee CSV/XLSX from Data Management to activate workforce analytics."
          action={
            <Button onClick={() => window.location.href = "/data"} className="gap-2">
              Go to Data Management
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {view.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Headcount trend" description="Active employees, last 18 months">
              <TrendChart data={view.headcount} series={[{ key: "value", label: "Headcount" }]} />
            </ChartCard>

            <ChartCard title="Hiring vs. exits" description="Monthly joins and departures">
              <LineTrend
                data={view.flow}
                series={[
                  { key: "hires", label: "Hires" },
                  { key: "exits", label: "Exits", color: "var(--color-chart-4)" },
                ]}
              />
            </ChartCard>

            <ChartCard title="Headcount by department" description="Active employees">
              <Donut data={view.byDepartment} />
            </ChartCard>

            <ChartCard
              title="Recruitment funnel"
              description={`Overall application-to-hire conversion ${view.funnel.overall}%`}
            >
              <FunnelBars stages={view.funnel.stages} />
            </ChartCard>

            <ChartCard title="Hires by source" description="Top channels by hires delivered">
              <Bars
                data={view.sources.map((s) => ({ name: s.source, value: s.hires }))}
                height={260}
              />
            </ChartCard>

            <ChartCard title="Tenure distribution" description="Active employees by years of service">
              <Bars
                data={view.tenure}
                layout="horizontal"
                height={260}
                color="var(--color-chart-2)"
              />
            </ChartCard>

            <ChartCard title="Attrition rate by department" description="Exits as a share of staff">
              <Bars
                data={view.attritionByDept.map((d) => ({ name: d.name, value: d.rate }))}
                height={280}
                unit="%"
                color="var(--color-chart-4)"
              />
            </ChartCard>

            <ChartCard title="Workforce gap" description="Required vs current headcount by department">
              <Bars
                data={view.gaps.map((g) => ({ name: g.department, value: g.gap }))}
                height={280}
                color="var(--color-chart-3)"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightNote icon={Lightbulb} text={view.workforceNote} />
            <InsightNote icon={Lightbulb} text={view.recruitmentNote} />
          </div>
        </>
      )}
    </AppShell>
  );
}
