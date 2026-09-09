import { SlidersHorizontal, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFilters, useAnalytics } from "@/lib/analytics/store";
import type { Filters } from "@/lib/analytics/types";

type Options = {
  departments: string[];
  locations: string[];
  jobRoles: string[];
  employmentTypes: string[];
  sources: string[];
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-[9rem] flex-1">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value ?? "all"} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-card">
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterBar({
  options,
  show = ["department", "location", "jobRole", "employmentType", "dates"],
}: {
  options: Options;
  show?: ("department" | "location" | "jobRole" | "employmentType" | "source" | "dates")[];
}) {
  const { filters, setFilter, reset, activeCount } = useFilters();
  const { raw, dataUpdatedAt, isLoading, isError } = useAnalytics();
  const sourceLabel = isLoading ? "Connecting to PostgreSQL" : isError ? "PostgreSQL unavailable" : "Source: PostgreSQL";
  const set = <K extends keyof Filters>(k: K) => (v: string) => setFilter(k, v as Filters[K]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {activeCount} active
            </span>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="mr-1 size-3.5" /> Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {show.includes("department") ? (
          <FilterSelect
            label="Department"
            value={filters.department}
            options={options.departments}
            onChange={set("department")}
          />
        ) : null}
        {show.includes("location") ? (
          <FilterSelect
            label="Location"
            value={filters.location}
            options={options.locations}
            onChange={set("location")}
          />
        ) : null}
        {show.includes("jobRole") ? (
          <FilterSelect
            label="Job role"
            value={filters.jobRole}
            options={options.jobRoles}
            onChange={set("jobRole")}
          />
        ) : null}
        {show.includes("employmentType") ? (
          <FilterSelect
            label="Employment type"
            value={filters.employmentType}
            options={options.employmentTypes}
            onChange={set("employmentType")}
          />
        ) : null}
        {show.includes("source") ? (
          <FilterSelect
            label="Source"
            value={filters.source}
            options={options.sources}
            onChange={set("source")}
          />
        ) : null}
        {show.includes("dates") ? (
          <>
            <div className="min-w-[9rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Applications from
              </label>
              <Input
                type="date"
                className="bg-card"
                value={filters.dateFrom ?? ""}
                onChange={(e) => setFilter("dateFrom", e.target.value || null)}
              />
            </div>
            <div className="min-w-[9rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Applications to
              </label>
              <Input
                type="date"
                className="bg-card"
                value={filters.dateTo ?? ""}
                onChange={(e) => setFilter("dateTo", e.target.value || null)}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">{sourceLabel}</span>
          <span>•</span>
          <span>
            Records analyzed: <strong className="font-mono text-foreground">{raw.employees.length + raw.jobs.length + raw.candidates.length + raw.targets.length}</strong> ({raw.employees.length} emp, {raw.jobs.length} jobs, {raw.candidates.length} cand)
          </span>
        </div>
        <div className="font-mono text-[10px]">
          Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "Live"}
        </div>
      </div>
    </div>
  );
}
