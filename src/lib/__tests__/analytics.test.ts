import { describe, it, expect } from "vitest";
import type { Dataset, EmployeeRow } from "../analytics/types";
import {
    headcountAt,
    attritionRate,
    timeToHire,
    offerAcceptanceRate,
    costPerHire,
    workforceGaps,
    trainAttritionRisk,
    sourcePerformance,
    gapSummary,
} from "../analytics/compute";
import { summarizeReferenceValidationErrors, validateRows, type ColumnMapping } from "../ingestion";

const sampleDataset: Dataset = {
    employees: [
        {
            id: "emp-1",
            employee_code: "EMP-0001",
            full_name: "Ava Clark",
            department: "Engineering",
            job_title: "Software Engineer",
            location: "Bengaluru",
            employment_type: "Full-time",
            hire_date: "2024-01-12",
            salary: 120000,
            manager_name: "Dana Whitfield",
            performance_rating: 4.5,
            promotion_count: 1,
            satisfaction_score: 4.1,
            workload_score: 3.8,
            overtime_hours: 5,
            manager_changes: 0,
            attrition_status: "active",
            exit_date: null,
            exit_type: null,
            exit_reason: null,
        },
        {
            id: "emp-2",
            employee_code: "EMP-0002",
            full_name: "Ben Ortiz",
            department: "Engineering",
            job_title: "Senior Software Engineer",
            location: "Bengaluru",
            employment_type: "Full-time",
            hire_date: "2023-02-08",
            salary: 150000,
            manager_name: "Dana Whitfield",
            performance_rating: 4.8,
            promotion_count: 2,
            satisfaction_score: 4.3,
            workload_score: 4.1,
            overtime_hours: 8,
            manager_changes: 1,
            attrition_status: "active",
            exit_date: null,
            exit_type: null,
            exit_reason: null,
        },
        {
            id: "emp-3",
            employee_code: "EMP-0003",
            full_name: "Chloe Green",
            department: "Sales",
            job_title: "Account Executive",
            location: "London",
            employment_type: "Full-time",
            hire_date: "2022-10-15",
            salary: 95000,
            manager_name: "Peter Lindgren",
            performance_rating: 4.2,
            promotion_count: 0,
            satisfaction_score: 3.8,
            workload_score: 3.7,
            overtime_hours: 4,
            manager_changes: 0,
            attrition_status: "exited",
            exit_date: "2025-06-12",
            exit_type: "voluntary",
            exit_reason: "Career growth",
        },
    ],
    jobs: [
        {
            id: "job-1",
            job_code: "JOB-001",
            job_title: "Software Engineer",
            department: "Engineering",
            location: "Bengaluru",
            employment_type: "Full-time",
            status: "open",
            opening_date: "2025-01-01",
            closing_date: null,
            target_hires: 2,
        },
    ],
    candidates: [
        {
            id: "cand-1",
            candidate_code: "CAND-0001",
            full_name: "Nina Patel",
            job_title: "Software Engineer",
            department: "Engineering",
            location: "Bengaluru",
            source: "LinkedIn",
            application_date: "2025-02-01",
            stage: "joined",
            joined_date: "2025-02-22",
            hiring_cost: 4000,
            rejection_reason: null,
        },
        {
            id: "cand-2",
            candidate_code: "CAND-0002",
            full_name: "Milo Chen",
            job_title: "Software Engineer",
            department: "Engineering",
            location: "Bengaluru",
            source: "Referral",
            application_date: "2025-02-03",
            stage: "offered",
            joined_date: null,
            hiring_cost: 2500,
            rejection_reason: null,
        },
    ],
    targets: [
        {
            department: "Engineering",
            period: "2025-Q4",
            required_headcount: 5,
        },
    ],
};

describe("Analytics Engine", () => {
    it("calculates active headcount and attrition rates correctly", () => {
        const now = new Date("2025-07-01T00:00:00Z");
        const active = headcountAt(sampleDataset.employees, now);

        expect(active).toBe(2);

        const qStart = new Date(Date.UTC(2025, 3, 1));
        const rate = attritionRate(sampleDataset.employees, qStart, now);
        expect(typeof rate).toBe("number");
        expect(rate).toBeGreaterThanOrEqual(0);
    });

    it("calculates recruitment metrics accurately", () => {
        const avgTime = timeToHire(sampleDataset.candidates);
        const acceptance = offerAcceptanceRate(sampleDataset.candidates);
        const cph = costPerHire(sampleDataset.candidates);

        expect(avgTime).toBeGreaterThan(0);
        expect(acceptance).toBeGreaterThan(0);
        expect(acceptance).toBeLessThanOrEqual(100);
        expect(cph).toBeGreaterThan(0);
    });

    it("computes department workforce gaps correctly", () => {
        const gaps = workforceGaps(sampleDataset.employees, sampleDataset.jobs, sampleDataset.targets);

        expect(gaps.length).toBeGreaterThan(0);
        gaps.forEach((g) => {
            expect(g.projected).toBe(g.current + g.openSeats);
            expect(g.gap).toBe(g.required - g.current);
        });
    });

    it("returns an insufficient-data message when attrition history is too small", () => {
        const employees: EmployeeRow[] = Array.from({ length: 30 }, (_, idx) => ({
            id: `emp-${idx}`,
            employee_code: `EMP-${String(idx + 1).padStart(4, "0")}`,
            full_name: `Employee ${idx + 1}`,
            department: idx % 2 === 0 ? "Engineering" : "Sales",
            job_title: idx % 2 === 0 ? "Engineer" : "Account Executive",
            location: "Bengaluru",
            employment_type: "Full-time",
            hire_date: "2022-01-01",
            salary: 100000,
            manager_name: "Manager",
            performance_rating: 3.5,
            promotion_count: 0,
            satisfaction_score: 3.8,
            workload_score: 4.0,
            overtime_hours: 4,
            manager_changes: 0,
            attrition_status: idx < 5 ? "exited" : "active",
            exit_date: idx < 5 ? "2024-05-01" : null,
            exit_type: idx < 5 ? "voluntary" : null,
            exit_reason: idx < 5 ? "Career growth" : null,
        }));

        const model = trainAttritionRisk(employees);
        expect(model.trained).toBe(false);
        expect(model.insufficientDataMessage).toMatch(/insufficient historical|no employee history/i);
    });

    it("trains a real risk model and exposes explainable features when data is sufficient", () => {
        const employees: EmployeeRow[] = Array.from({ length: 72 }, (_, idx) => {
            const isExited = idx < 18;
            const baseSalary = 70_000 + (idx % 7) * 8_000;
            return {
                id: `emp-${idx}`,
                employee_code: `EMP-${String(idx + 1).padStart(4, "0")}`,
                full_name: `Employee ${idx + 1}`,
                department: ["Engineering", "Sales", "Operations", "Support"][idx % 4] ?? "Engineering",
                job_title: idx % 2 === 0 ? "Engineer" : "Manager",
                location: idx % 3 === 0 ? "Bengaluru" : "London",
                employment_type: "Full-time",
                hire_date: isExited ? "2020-01-01" : "2023-04-01",
                salary: baseSalary,
                manager_name: "Manager",
                performance_rating: isExited ? 2.8 : 4.1,
                promotion_count: isExited ? 0 : 1,
                satisfaction_score: isExited ? 2.6 : 4.0,
                workload_score: isExited ? 7.5 : 5.1,
                overtime_hours: isExited ? 18 : 6,
                manager_changes: isExited ? 2 : 0,
                attrition_status: isExited ? "exited" : "active",
                exit_date: isExited ? "2024-07-01" : null,
                exit_type: isExited ? "voluntary" : null,
                exit_reason: isExited ? "Career growth" : null,
            };
        });

        const model = trainAttritionRisk(employees);
        expect(model.trained).toBe(true);
        expect(model.scores.length).toBeGreaterThan(0);
        expect(model.importance.length).toBeGreaterThan(0);
        expect(model.bands.some((band) => band.value >= 0)).toBe(true);
        expect(model.scores.every((score) => ["Low", "Medium", "High"].includes(score.band))).toBe(true);
        expect(model.accuracy).toBeGreaterThanOrEqual(0);
        expect(model.accuracy).toBeLessThanOrEqual(100);
    });

    it("handles missing feature values without failing risk scoring", () => {
        const employeesBase: EmployeeRow[] = [
            {
                id: "emp-1",
                employee_code: "EMP-0001",
                full_name: "Ava",
                department: "Engineering",
                job_title: "Engineer",
                location: "Bengaluru",
                employment_type: "Full-time",
                hire_date: "2021-01-01",
                salary: 100000,
                manager_name: null,
                performance_rating: null,
                promotion_count: 0,
                satisfaction_score: null,
                workload_score: null,
                overtime_hours: 0,
                manager_changes: 0,
                attrition_status: "active",
                exit_date: null,
                exit_type: null,
                exit_reason: null,
            },
            {
                id: "emp-2",
                employee_code: "EMP-0002",
                full_name: "Ben",
                department: "Engineering",
                job_title: "Engineer",
                location: "Bengaluru",
                employment_type: "Full-time",
                hire_date: "2022-01-01",
                salary: 95000,
                manager_name: null,
                performance_rating: 2.4,
                promotion_count: 0,
                satisfaction_score: 2.1,
                workload_score: 7.0,
                overtime_hours: 16,
                manager_changes: 1,
                attrition_status: "active",
                exit_date: null,
                exit_type: null,
                exit_reason: null,
            },
        ];

        const model = trainAttritionRisk([
            ...employeesBase,
            ...Array.from({ length: 60 }, (_, idx) => {
                const base = employeesBase[idx % employeesBase.length]!;
                return {
                    ...base,
                    id: `emp-${idx + 10}`,
                    employee_code: `EMP-${String(idx + 10).padStart(4, "0")}`,
                    full_name: `Person ${idx + 10}`,
                    attrition_status: (idx < 15 ? "exited" : "active") as "active" | "exited",
                    exit_date: idx < 15 ? "2024-05-01" : null,
                    exit_type: idx < 15 ? "voluntary" : null,
                    exit_reason: idx < 15 ? "Career growth" : null,
                    salary: idx % 2 === 0 ? 100000 : 80000,
                } satisfies EmployeeRow;
            }),
        ]);

        expect(model.trained).toBe(true);
        expect(model.scores.length).toBeGreaterThan(0);
    });

    it("calculates recruitment source performance and empty dataset states cleanly", () => {
        const empty = sourcePerformance([]);
        expect(empty.rows).toEqual([]);
        expect(empty.best).toBeNull();

        const perf = sourcePerformance(sampleDataset.candidates);
        expect(perf.rows.length).toBeGreaterThan(0);
        expect(perf.best).toBeTruthy();
        expect(perf.rows.every((row) => row.conversionRate >= 0)).toBe(true);
    });

    it("returns honest workforce-gap messaging when targets are missing", () => {
        const gaps = workforceGaps(sampleDataset.employees, sampleDataset.jobs, []);
        expect(gaps.length).toBeGreaterThan(0);
        expect(gapSummary([])).toContain("No workforce target data available");
    });

    it("flags duplicate records and returns actionable reference guidance", () => {
        const rows = [
            { EmployeeCode: "EMP-001", FullName: "Alice", Department: "Engineering", JobTitle: "Engineer", Location: "Bengaluru", EmploymentType: "Full-time", HireDate: "2024-01-01", Salary: "120000" },
            { EmployeeCode: "EMP-001", FullName: "Alice Duplicate", Department: "Engineering", JobTitle: "Engineer", Location: "Bengaluru", EmploymentType: "Full-time", HireDate: "2024-01-02", Salary: "125000" },
        ];
        const mappings: ColumnMapping[] = [
            { fileColumn: "EmployeeCode", sampleValue: "EMP-001", targetField: "employee_code", dataType: "string", status: "Passed" },
            { fileColumn: "FullName", sampleValue: "Alice", targetField: "full_name", dataType: "string", status: "Passed" },
            { fileColumn: "Department", sampleValue: "Engineering", targetField: "department", dataType: "string", status: "Passed" },
            { fileColumn: "JobTitle", sampleValue: "Engineer", targetField: "job_title", dataType: "string", status: "Passed" },
            { fileColumn: "Location", sampleValue: "Bengaluru", targetField: "location", dataType: "string", status: "Passed" },
            { fileColumn: "EmploymentType", sampleValue: "Full-time", targetField: "employment_type", dataType: "string", status: "Passed" },
            { fileColumn: "HireDate", sampleValue: "2024-01-01", targetField: "hire_date", dataType: "date", status: "Passed" },
            { fileColumn: "Salary", sampleValue: "120000", targetField: "salary", dataType: "currency", status: "Passed" },
        ];

        const report = validateRows(rows, mappings, "employees");
        expect(report.errorRows).toBeGreaterThan(0);
        expect(report.errors.some((error) => error.message.includes("Duplicate employee code"))).toBe(true);

        const summary = summarizeReferenceValidationErrors([
            { rowNumber: 1, field: "department", value: "Engineering", message: "Department 'Engineering' does not exist in this organization." },
            { rowNumber: 2, field: "source", value: "LinkedIn", message: "Recruitment source 'LinkedIn' does not exist in this organization." },
        ]);

        expect(summary.summary).toContain("missing references");
        expect(summary.actionable).toMatch(/department|source|upload/i);
    });
});
