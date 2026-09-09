import type { Dataset } from "./analytics/types";

/**
 * Synthetic business-data generation is intentionally disabled.
 * TalentLens must only use data uploaded by the authenticated user.
 */
export function generateDemoDataset(): Dataset {
    throw new Error("Synthetic business data generation is disabled. Upload your own CSV/XLSX data instead.");
}

        let joinedDate: string | null = null;
        if (stage === "joined") {
            const jMs = Math.min(appMs + cycleDays * 86400000, today.getTime());
            joinedDate = new Date(jMs).toISOString().slice(0, 10);
        }

        let rejectionReason: string | null = null;
        if (stage === "applied") {
            const r = [
                "Skills mismatch", "Insufficient experience", "Location constraint",
                "Salary expectation", "Incomplete application"
            ];
            rejectionReason = r[hash(`rr${i}`) % r.length]!;
        } else if (stage === "screened") {
            const r = ["Failed technical screen", "Withdrew", "Better internal candidate"];
            rejectionReason = r[hash(`rs${i}`) % r.length]!;
        }

        const costPerApp: Record<string, number> = {
            LinkedIn: 42, "Employee Referral": 12, "Job Portal": 18,
            "Company Website": 6, "Campus Hiring": 25, "Recruitment Agency": 95,
        };
        const multiplier =
            stage === "joined" ? 14 : stage === "accepted" || stage === "offered" ? 6 : stage === "interviewed" ? 3 : 1;
        const hiringCost = Math.round((costPerApp[source] ?? 20) * multiplier);

        candidates.push({
            id: `cand-id-${i}`,
            candidate_code: code,
            full_name: `${FIRST_NAMES[fn]} ${LAST_NAMES[ln]}`,
            job_title: job.job_title,
            department: job.department,
            location: job.location,
            source,
            application_date: appDate,
            stage,
            joined_date: joinedDate,
            hiring_cost: hiringCost,
            rejection_reason: rejectionReason,
        });
    }

    // 4. Workforce Targets
    const targets: TargetRow[] = DEPARTMENTS.map((dept) => {
        const activeCount = employees.filter((e) => e.department === dept && e.attrition_status === "active").length;
        const mult =
            dept === "Engineering" ? 1.22
                : dept === "Customer Support" ? 1.18
                    : dept === "Sales" ? 1.12
                        : dept === "Product" ? 1.1
                            : dept === "Operations" ? 0.98
                                : dept === "Marketing" ? 1.04
                                    : dept === "Finance" ? 0.96
                                        : 1.0;
        return {
            department: dept,
            period: "2026-Q3",
            required_headcount: Math.max(1, Math.round(activeCount * mult)),
        };
    });

    return { employees, jobs, candidates, targets };
}
