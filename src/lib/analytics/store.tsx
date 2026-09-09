import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { fetchDataset, type FullWorkspaceDataset } from "@/lib/data.functions";
import { applyFilters } from "@/lib/analytics/compute";
import type { Dataset, Filters } from "@/lib/analytics/types";

const EMPTY_DATASET: FullWorkspaceDataset = {
  employees: [],
  jobs: [],
  candidates: [],
  targets: [],
  uploadedDatasets: [],
};

export function useDatasetQuery() {
  const load = useServerFn(fetchDataset);
  return useQuery({
    queryKey: ["talentlens", "dataset"],
    queryFn: async (): Promise<FullWorkspaceDataset> => {
      const dbData = await load({});
      return dbData || EMPTY_DATASET;
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
}

type FilterCtx = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  reset: () => void;
  activeCount: number;
};

const FiltersContext = createContext<FilterCtx | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>({});

  const value = useMemo<FilterCtx>(
    () => ({
      filters,
      setFilter: (key, val) =>
        setFilters((prev) => ({ ...prev, [key]: val === "all" || val === "" ? null : val })),
      reset: () => setFilters({}),
      activeCount: Object.values(filters).filter((v) => v !== null && v !== undefined && v !== "")
        .length,
    }),
    [filters],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}

/** Dataset + filtered view + option lists for the global filter bar.
 *  Sourced 100% from PostgreSQL database via fetchDataset server function.
 */
export function useAnalytics() {
  const query = useDatasetQuery();
  const { filters } = useFilters();
  const raw = query.data ?? EMPTY_DATASET;

  const data = useMemo(() => applyFilters(raw, filters), [raw, filters]);

  const options = useMemo(() => {
    const uniq = (values: (string | null | undefined)[]) =>
      [...new Set(values.filter((v): v is string => !!v))].sort();
    return {
      departments: uniq([
        ...raw.employees.map((e) => e.department),
        ...raw.jobs.map((j) => j.department),
      ]),
      locations: uniq([...raw.employees.map((e) => e.location), ...raw.jobs.map((j) => j.location)]),
      jobRoles: uniq([
        ...raw.employees.map((e) => e.job_title),
        ...raw.jobs.map((j) => j.job_title),
      ]),
      employmentTypes: uniq(raw.employees.map((e) => e.employment_type)),
      sources: uniq(raw.candidates.map((c) => c.source)),
    };
  }, [raw]);

  return {
    ...query,
    raw,
    data,
    options,
    uploadedDatasets: raw.uploadedDatasets ?? [],
    isEmpty:
      !query.isLoading &&
      !query.isError &&
      raw.employees.length === 0 &&
      raw.jobs.length === 0 &&
      raw.candidates.length === 0 &&
      raw.targets.length === 0,
  };
}
