import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Lightbulb } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { Bars, Donut, TrendChart } from "@/components/talent/charts";
import {
  ChartCard,
  EmptyState,
  InsightNote,
  KpiCard,
  LoadingGrid,
} from "@/components/talent/primitives";
import { useAnalytics } from "@/lib/analytics/store";
import {
  countBy,
  headcountAt,
  headcountSeries,
  hiringSeries,
  mean,
  performanceDistribution,
  round,
  salaryBands,
  tenureDistribution,
  tenureYears,
  workforceSummary,
} from "@/lib/analytics/compute";
import type { Kpi } from "@/lib/analytics/types";

export const Route = createFileRoute("/_authenticated/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce analytics — TalentLens" },
      {
        name: "description",
        content:
          "Headcount growth, department structure, tenure, pay bands and performance distribution across your workforce.",
      },
      { property: "og:title", content: "Workforce analytics — TalentLens" },
      {
        property: "og:description",
        content: "Headcount, tenure, pay and performance analytics for your workforce.",
      },
    ],
  }),
  component: WorkforcePage,
});

function WorkforcePage() {
  const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();

  const view = useMemo(() => {
    const active = data.employees.filter((e) => e.attrition_status === "active");
    const kpis: Kpi[] = [
      {
        key: "active",
        label: "Active employees",
        value: headcountAt(data.employees, new Date()),
        unit: "count",
        previous: null,
        deltaDirection: "flat",
        goodDirection: "up",
        context: "Currently employed",
      },
      {
        key: "tenure",
        label: "Average tenure",
        value: round(mean(active.map((e) => tenureYears(e))), 1),
        unit: "count",
        previous: null,
        deltaDirection: "flat",
        goodDirection: "up",
        context: "Years of service",
      },
      {
        key: "salary",
        label: "Average salary",
        value: Math.round(mean(active.map((e) => Number(e.salary)))),
        unit: "currency",
        previous: null,
        deltaDirection: "flat",
        goodDirection: "up",
        context: "Across active employees",
      },
      {
        key: "performance",
        label: "Average performance",
        value: round(
          mean(
            active
              .map((e) => Number(e.performance_rating))
              .filter((v) => Number.isFinite(v)),
          ),
          2,
        ),
        unit: "count",
        previous: null,
        deltaDirection: "flat",
        goodDirection: "up",
        context: "Rating out of 5",
      },
    ];

    return {
      kpis,
      headcount: headcountSeries(data.employees, 24),
      hires: hiringSeries(data.employees, 24),
      byDepartment: countBy(active, (e) => e.department),
      byLocation: countBy(active, (e) => e.location),
      byType: countBy(active, (e) => e.employment_type),
      byRole: countBy(active, (e) => e.job_title).slice(0, 10),
      tenure: tenureDistribution(active),
      salary: salaryBands(active),
      performance: performanceDistribution(active),
      note: workforceSummary(data.employees),
    };
  }, [data]);

  return (
    <AppShell
      title="Workforce analytics"
      description="Structure, growth, tenure, pay and performance"
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
          title="No employee records"
          description="Import employee data to see workforce structure and trends."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {view.kpis.map((k) => (
              <KpiCard key={k.key} kpi={k} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Headcount growth" description="Active employees, last 24 months">
              <TrendChart data={view.headcount} series={[{ key: "value", label: "Headcount" }]} />
            </ChartCard>
            <ChartCard title="Monthly joiners" description="New hires per month">
              <Bars data={view.hires} layout="horizontal" height={260} color="var(--color-chart-2)" />
            </ChartCard>
            <ChartCard title="Department distribution" description="Share of active workforce">
              <Donut data={view.byDepartment} />
            </ChartCard>
            <ChartCard title="Location distribution" description="Where your people work">
              <Bars data={view.byLocation} height={280} />
            </ChartCard>
            <ChartCard title="Top job roles" description="Largest role populations">
              <Bars data={view.byRole} height={320} color="var(--color-chart-3)" />
            </ChartCard>
            <ChartCard title="Employment type" description="Contract mix">
              <Donut data={view.byType} />
            </ChartCard>
            <ChartCard title="Tenure bands" description="Years of service">
              <Bars data={view.tenure} layout="horizontal" height={260} color="var(--color-chart-2)" />
            </ChartCard>
            <ChartCard title="Salary bands" description="Distribution of base pay">
              <Bars data={view.salary} layout="horizontal" height={260} color="var(--color-chart-5)" />
            </ChartCard>
            <ChartCard
              title="Performance distribution"
              description="Latest review ratings"
              className="lg:col-span-2"
            >
              <Bars
                data={view.performance}
                layout="horizontal"
                height={260}
                color="var(--color-chart-1)"
              />
            </ChartCard>
          </div>

          <InsightNote icon={Lightbulb} text={view.note} />
        </>
      )}
    </AppShell>
  );
}
