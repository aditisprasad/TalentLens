import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260909120000_add_dataset_lineage_and_delete.sql",
);
const migration = readFileSync(migrationPath, "utf8");

describe("dataset deletion database contract", () => {
    it("uses import lineage instead of filename or timestamp matching", () => {
        expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.dataset_record_links");
        expect(migration).toContain("PRIMARY KEY (dataset_id, entity_type, record_id)");
        expect(migration).toContain("dataset_id = p_dataset_id");
        expect(migration).not.toMatch(/file_name\s*=\s*p_dataset_id/i);
    });

    it("requires authenticated organization and explicit deletion authorization", () => {
        expect(migration).toContain("SECURITY DEFINER");
        expect(migration).toContain("SET search_path = public, pg_temp");
        expect(migration).toContain("Authenticated organization context is required for deletion");
        expect(migration).toContain("You are not authorized to delete this dataset");
        expect(migration).toContain("REVOKE ALL ON FUNCTION public.delete_workspace_dataset(uuid) FROM PUBLIC, anon");
    });

    it("deletes dependents before jobs and removes the history row", () => {
        const candidateDelete = migration.indexOf("DELETE FROM public.candidates c");
        const jobDelete = migration.indexOf("DELETE FROM public.job_openings j");
        const historyDelete = migration.indexOf("DELETE FROM public.uploaded_datasets");

        expect(candidateDelete).toBeGreaterThan(-1);
        expect(jobDelete).toBeGreaterThan(candidateDelete);
        expect(historyDelete).toBeGreaterThan(jobDelete);
        expect(migration).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM public\.dataset_record_links other/);
    });

    it("does not add a data seed or demo fallback to the deletion migration", () => {
        expect(migration).not.toMatch(/INSERT INTO public\.organizations/i);
        expect(migration).not.toMatch(/generate_demo|seed_demo|demo_data/i);
    });
});