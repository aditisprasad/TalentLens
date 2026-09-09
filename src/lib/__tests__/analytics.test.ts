import { describe, it, expect } from "vitest";
import type { Dataset } from "../analytics/types";
import {
    headcountAt,
    attritionRate,
    timeToHire,
    offerAcceptanceRate,
    costPerHire,
    workforceGaps,
} from "../analytics/compute";

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
});
