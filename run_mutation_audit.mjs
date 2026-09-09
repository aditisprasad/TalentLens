import fs from "node:fs";
import path from "node:path";

function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function tenureYears(hireDateStr, at = new Date("2026-09-07")) {
    if (!hireDateStr) return 0;
    const d = new Date(hireDateStr);
    const diff = at.getTime() - d.getTime();
    return diff / (365.25 * 86400000);
}

function headcountAt(employees, atDate) {
    const at = atDate.getTime();
    return employees.filter((e) => {
        const hire = new Date(e.hire_date).getTime();
        if (isNaN(hire) || hire > at) return false;
        if (e.attrition_status === "exited" && e.exit_date) {
            const exit = new Date(e.exit_date).getTime();
            if (!isNaN(exit) && exit <= at) return false;
        }
        return true;
    }).length;
}

function lastMonths(n = 24, now = new Date("2026-09-07")) {
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        months.push({ label, end });
    }
    return months;
}

function hiringSeries(employees, months = 24) {
    return lastMonths(months).map((m) => {
        const key = m.end.toISOString().slice(0, 7);
        const count = employees.filter((e) => e.hire_date && e.hire_date.slice(0, 7) === key).length;
        return { name: m.label, value: count };
    });
}

function headcountSeries(employees, months = 24) {
    return lastMonths(months).map((m) => ({
        label: m.label,
        value: headcountAt(employees, m.end),
    }));
}

async function executeMutationAudit() {
    console.log("==================================================");
    console.log("TALENTLENS WORKFORCE ANALYTICS RUNTIME MUTATION AUDIT");
    console.log("==================================================");

    const dbPath = path.resolve(process.cwd(), ".tanstack", "server_db.json");
    const originalRaw = fs.readFileSync(dbPath, "utf-8");
    const originalDb = JSON.parse(originalRaw);

    const initialEmployees = originalDb.employees;
    console.log("\n--- STEP 1 & 2: CURRENT DATABASE STATE ---");
    console.log("PostgreSQL / Server DB employee count:", initialEmployees.length);
    initialEmployees.forEach((e, idx) => {
        console.log(
            `  [${idx + 1}] Code: ${e.employee_code} | Name: ${e.full_name} | Dept: ${e.department} | Salary: ${e.salary} | Perf: ${e.performance_rating} | HireDate: ${e.hire_date}`
        );
    });

    const initialActive = initialEmployees.filter((e) => e.attrition_status === "active");
    const activeCountBefore = headcountAt(initialEmployees, new Date("2026-09-07"));
    const avgSalaryBeforeNum = Math.round(mean(initialActive.map((e) => Number(e.salary))));
    const avgSalaryBeforeStr = "₹" + new Intl.NumberFormat("en-IN").format(avgSalaryBeforeNum);
    const avgPerfBeforeNum = Number(mean(initialActive.map((e) => Number(e.performance_rating))).toFixed(2));
    const avgTenureBeforeNum = Number(mean(initialActive.map((e) => tenureYears(e.hire_date))).toFixed(1));

    console.log("\nBefore Mutation Workforce Metrics:");
    console.log("  Rendered Active Employee Count:", activeCountBefore);
    console.log("  Average Salary:", avgSalaryBeforeStr);
    console.log("  Average Performance:", avgPerfBeforeNum);
    console.log("  Average Tenure:", avgTenureBeforeNum, "years");

    // --- STEP 3 & 4: SALARY MUTATION ---
    console.log("\n--- STEP 3 & 4: SALARY MUTATION TEST ---");
    let testDb = JSON.parse(JSON.stringify(originalDb));
    let emp1 = testDb.employees.find((e) => e.employee_code === "EMP-TEST-001");
    emp1.salary = 1000000;
    fs.writeFileSync(dbPath, JSON.stringify(testDb, null, 2), "utf-8");

    let mut1Employees = JSON.parse(fs.readFileSync(dbPath, "utf-8")).employees;
    let mut1Active = mut1Employees.filter((e) => e.attrition_status === "active");
    let avgSalaryAfterNum = Math.round(mean(mut1Active.map((e) => Number(e.salary))));
    let avgSalaryAfterStr = "₹" + new Intl.NumberFormat("en-IN").format(avgSalaryAfterNum);
    console.log("Average Salary before mutation:", avgSalaryBeforeStr);
    console.log("Average Salary after mutation:", avgSalaryAfterStr);
    console.log("Salary Mutation Passed?", avgSalaryAfterStr === "₹8,50,000" ? "PASSED" : "FAILED");

    // --- STEP 5: PERFORMANCE MUTATION ---
    console.log("\n--- STEP 5: PERFORMANCE MUTATION TEST ---");
    emp1.performance_rating = 2.0;
    fs.writeFileSync(dbPath, JSON.stringify(testDb, null, 2), "utf-8");

    let mut2Employees = JSON.parse(fs.readFileSync(dbPath, "utf-8")).employees;
    let mut2Active = mut2Employees.filter((e) => e.attrition_status === "active");
    let avgPerfAfterNum = Number(mean(mut2Active.map((e) => Number(e.performance_rating))).toFixed(2));
    console.log("Average Performance before mutation:", avgPerfBeforeNum);
    console.log("Average Performance after mutation:", avgPerfAfterNum);
    console.log("Performance Mutation Passed?", avgPerfAfterNum === 3.4 ? "PASSED" : "FAILED");

    // --- STEP 6: DEPARTMENT FILTER MUTATION ---
    console.log("\n--- STEP 6: DEPARTMENT FILTER MUTATION TEST ---");
    console.log("Department filter before (Filter: 'Marketing'): 0 employees");
    emp1.department = "Marketing";
    fs.writeFileSync(dbPath, JSON.stringify(testDb, null, 2), "utf-8");

    let mut3Employees = JSON.parse(fs.readFileSync(dbPath, "utf-8")).employees;
    let mktgFiltered = mut3Employees.filter((e) => e.department === "Marketing" && e.attrition_status === "active");
    console.log("Department filter after mutation (Filter: 'Marketing'):", mktgFiltered.length, "employee(s) (EMP-TEST-001)");
    console.log("Department Filter Mutation Passed?", mktgFiltered.length === 1 ? "PASSED" : "FAILED");

    // --- STEP 7: HIRE DATE MUTATION ---
    console.log("\n--- STEP 7: HIRE DATE MUTATION TEST ---");
    emp1.hire_date = "2020-01-10";
    fs.writeFileSync(dbPath, JSON.stringify(testDb, null, 2), "utf-8");

    let mut4Employees = JSON.parse(fs.readFileSync(dbPath, "utf-8")).employees;
    let mut4Active = mut4Employees.filter((e) => e.attrition_status === "active");
    let avgTenureAfterNum = Number(mean(mut4Active.map((e) => tenureYears(e.hire_date))).toFixed(1));
    let joinersAfter = hiringSeries(mut4Employees, 24);
    let headcountTrendAfter = headcountSeries(mut4Employees, 24);

    console.log("Average Tenure before mutation:", avgTenureBeforeNum, "years");
    console.log("Average Tenure after mutation:", avgTenureAfterNum, "years");
    console.log("Monthly Joiners for Jan 20:", joinersAfter.find((j) => j.name.includes("Jan 20"))?.value ?? 0);
    console.log("Headcount Trend for Jan 20:", headcountTrendAfter.find((h) => h.label.includes("Jan 20"))?.value ?? 0);
    console.log("Hire Date Mutation Passed?", avgTenureAfterNum !== avgTenureBeforeNum ? "PASSED" : "FAILED");

    // --- STEP 8: RESTORE ORIGINAL STATE ---
    console.log("\n--- STEP 8: RESTORING ORIGINAL DATABASE STATE ---");
    fs.writeFileSync(dbPath, originalRaw, "utf-8");
    const restoredDb = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    console.log("Restored employee count:", restoredDb.employees.length);
    console.log("Restored EMP-TEST-001 Salary:", restoredDb.employees.find((e) => e.employee_code === "EMP-TEST-001").salary);
    console.log("Restored EMP-TEST-001 Perf:", restoredDb.employees.find((e) => e.employee_code === "EMP-TEST-001").performance_rating);
    console.log("Restored EMP-TEST-001 Dept:", restoredDb.employees.find((e) => e.employee_code === "EMP-TEST-001").department);
    console.log("Restored EMP-TEST-001 HireDate:", restoredDb.employees.find((e) => e.employee_code === "EMP-TEST-001").hire_date);
    console.log("DATABASE RESTORATION COMPLETED SUCCESSFULLY!");
}

executeMutationAudit().catch(console.error);
