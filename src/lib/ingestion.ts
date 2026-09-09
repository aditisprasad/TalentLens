import type { Dataset, EmployeeRow, JobRow, CandidateRow, TargetRow } from "@/lib/analytics/types";
import * as XLSX from "xlsx";

export type DatasetType =
    | "employees"
    | "departments"
    | "jobs"
    | "candidates"
    | "interviews"
    | "offers"
    | "attrition"
    | "performance"
    | "satisfaction"
    | "targets";

export type ColumnMapping = {
    fileColumn: string;
    sampleValue: string;
    targetField: string;
    dataType: "string" | "number" | "date" | "enum" | "currency";
    status: "Passed" | "Warning" | "Error";
};

export type RowValidationError = {
    rowNumber: number;
    field: string;
    value: string;
    severity: "error" | "warning";
    message: string;
};

export type ValidationReport = {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    errors: RowValidationError[];
    mappings: ColumnMapping[];
};

export type ImportHistoryItem = {
    id: string;
    fileName: string;
    datasetType: DatasetType;
    uploadedBy: string;
    timestamp: string;
    totalRows: number;
    importedRows: number;
    updatedRows: number;
    rejectedRows: number;
    status: "Imported" | "Partial" | "Failed";
    version: number;
};

export type ParsedSheetResult = {
    sheetName: string;
    headerRowIndex: number;
    headers: string[];
    rows: Record<string, string>[];
    score: number;
};

/** Synonyms dictionary for intelligent automatic column mapping */
const FIELD_ALIASES: Record<string, string[]> = {
    employee_code: ["employee_code", "employee_id", "employeeid", "employee id", "emp_id", "emp_code", "staff_id", "staff_code", "code", "id", "emp code", "staff id", "employee number", "employee number/code"],
    full_name: ["full_name", "fullname", "full name", "name", "employee name", "candidate name", "staff name", "person name", "applicant name", "candidate"],
    department: ["department", "department_name", "dept", "team", "division", "business_unit", "department name", "unit"],
    job_title: ["job_title", "jobtitle", "job title", "role", "designation", "position", "title", "job role", "requisition title"],
    location: ["location", "office", "work_location", "city", "site", "work location", "office location", "branch"],
    employment_type: ["employment_type", "employmenttype", "employment type", "type", "contract_type", "work_type"],
    hire_date: ["hire_date", "hiredate", "hire date", "joining_date", "date_joined", "doj", "start_date", "date of joining"],
    salary: ["salary", "annual_salary", "ctc", "pay", "base_pay", "annual_pay", "gross_salary", "compensation"],
    manager_name: ["manager_name", "manager", "manager name", "reports_to", "supervisor"],
    performance_rating: ["performance_rating", "performance", "rating", "review_score", "appraisal_score", "performance rating", "performance score"],
    satisfaction_score: ["satisfaction_score", "satisfaction", "esat", "engagement_score", "satisfaction score"],
    workload_score: ["workload_score", "workload", "burnout_risk", "workload score"],
    attrition_status: ["attrition_status", "status", "exit_status", "employment_status", "is_active", "active_status", "working_status"],
    exit_date: ["exit_date", "exitdate", "exit date", "resignation_date", "date_of_exit", "termination_date"],
    exit_type: ["exit_type", "exittype", "exit type", "resignation_type", "separation_type"],
    exit_reason: ["exit_reason", "exitreason", "exit reason", "reason_for_leaving", "leaving_reason"],
    job_code: ["job_code", "job_id", "requisition_id", "req_id", "job_number", "job code", "req code"],
    target_hires: ["target_hires", "required_hires", "openings_count", "target hires", "vacancies"],
    status_job: ["status", "job_status", "requisition_status"],
    candidate_code: ["candidate_code", "candidate_id", "applicant_id", "app_id", "candidate code", "applicant code"],
    application_date: ["application_date", "applied_date", "date_applied", "application date"],
    stage: ["stage", "pipeline_stage", "application_stage", "current_stage", "candidate_stage"],
    source: ["source", "recruitment_source", "channel", "source_channel", "referral_source"],
    hiring_cost: ["hiring_cost", "cost_per_hire", "sourcing_cost", "recruitment_cost"],
    required_headcount: ["required_headcount", "target_headcount", "target_seats", "required_seats", "budgeted_headcount"],
    period: ["period", "target_period", "quarter", "year", "time_period"],
};

/** All known keywords across HR domains for header detection scoring */
const ALL_KNOWN_ALIASES = Object.values(FIELD_ALIASES).flat();

/** Scan a 2D string matrix to detect title rows vs. real header row */
export function detectHeaderAndRows(matrix: string[][]): {
    headerRowIndex: number;
    headers: string[];
    rows: Record<string, string>[];
    score: number;
} {
    if (!matrix || matrix.length === 0) {
        return { headerRowIndex: 0, headers: [], rows: [], score: 0 };
    }

    let bestHeaderIndex = 0;
    let maxScore = -1;

    const maxScanRows = Math.min(matrix.length, 25);

    for (let r = 0; r < maxScanRows; r++) {
        const row = matrix[r] || [];
        let aliasMatches = 0;
        let nonBlankCells = 0;

        row.forEach((cell) => {
            const cleanVal = String(cell ?? "").trim().toLowerCase();
            if (cleanVal.length > 0) {
                nonBlankCells++;
                if (ALL_KNOWN_ALIASES.some((alias) => alias === cleanVal || cleanVal.replace(/[\s_\-]/g, "") === alias.replace(/[\s_\-]/g, ""))) {
                    aliasMatches++;
                }
            }
        });

        const score = aliasMatches * 15 + nonBlankCells;
        if (score > maxScore) {
            maxScore = score;
            bestHeaderIndex = r;
        }
    }

    const rawHeaders = matrix[bestHeaderIndex] || [];
    const cleanHeaders: string[] = [];
    const validColIndices: number[] = [];

    rawHeaders.forEach((colName, colIdx) => {
        let name = String(colName ?? "").trim();
        // Check if column has data below
        let hasData = false;
        for (let r = bestHeaderIndex + 1; r < matrix.length; r++) {
            if (matrix[r]?.[colIdx] && String(matrix[r]![colIdx]).trim() !== "") {
                hasData = true;
                break;
            }
        }

        if (!name) {
            if (hasData) {
                name = `Unnamed Column ${colIdx + 1}`;
                cleanHeaders.push(name);
                validColIndices.push(colIdx);
            }
        } else if (!name.startsWith("__EMPTY")) {
            cleanHeaders.push(name);
            validColIndices.push(colIdx);
        } else if (hasData) {
            name = `Unnamed Column ${colIdx + 1}`;
            cleanHeaders.push(name);
            validColIndices.push(colIdx);
        }
    });

    const rows: Record<string, string>[] = [];

    for (let r = bestHeaderIndex + 1; r < matrix.length; r++) {
        const rowData = matrix[r] || [];
        const isRowEmpty = rowData.every((c) => !c || String(c).trim() === "");
        if (isRowEmpty) continue;

        const rowObj: Record<string, string> = {};
        validColIndices.forEach((colIdx, i) => {
            const headerName = cleanHeaders[i]!;
            rowObj[headerName] = String(rowData[colIdx] ?? "").trim();
        });
        rows.push(rowObj);
    }

    return {
        headerRowIndex: bestHeaderIndex + 1, // 1-indexed for display
        headers: cleanHeaders,
        rows,
        score: maxScore,
    };
}

/** Parse full Excel workbook into multi-sheet results */
export function parseWorkbook(wb: XLSX.WorkBook): ParsedSheetResult[] {
    const results: ParsedSheetResult[] = [];

    wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        if (!ws) return;
        const matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
        const { headerRowIndex, headers, rows, score } = detectHeaderAndRows(matrix);
        if (rows.length > 0 && headers.length > 0) {
            results.push({
                sheetName,
                headerRowIndex,
                headers,
                rows,
                score,
            });
        }
    });

    // Sort sheets by schema match score
    return results.sort((a, b) => b.score - a.score);
}

/** Infer target dataset type based on header columns present in file */
export function inferDatasetType(headers: string[]): DatasetType {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[\s_\-]/g, ""));

    if (lowerHeaders.some((h) => h.includes("candidate") || h.includes("applicant") || h.includes("stage"))) {
        return "candidates";
    }
    if (lowerHeaders.some((h) => h.includes("requisition") || h.includes("jobcode") || h.includes("targethires"))) {
        return "jobs";
    }
    if (lowerHeaders.some((h) => h.includes("requiredheadcount") || h.includes("targetseats") || h.includes("period"))) {
        return "targets";
    }
    if (lowerHeaders.some((h) => h.includes("exitdate") || h.includes("exitreason") || h.includes("resignation"))) {
        return "attrition";
    }
    return "employees";
}

/** Automatically map source file columns to system fields using synonym dictionary */
export function autoMapColumns(
    headers: string[],
    sampleRow: Record<string, string>,
    datasetType: DatasetType,
): ColumnMapping[] {
    return headers.map((header) => {
        const cleanHeader = header.toLowerCase().trim();
        const sampleVal = String(sampleRow[header] ?? "").trim();
        let targetField = "ignore";
        let dataType: ColumnMapping["dataType"] = "string";

        for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
            if (
                aliases.some(
                    (alias) => alias === cleanHeader || cleanHeader.replace(/[\s_\-]/g, "") === alias.replace(/[\s_\-]/g, ""),
                )
            ) {
                targetField = field;
                break;
            }
        }

        if (targetField.includes("date") || cleanHeader.includes("date")) {
            dataType = "date";
        } else if (
            targetField.includes("salary") ||
            targetField.includes("cost") ||
            cleanHeader.includes("ctc") ||
            sampleVal.startsWith("₹") ||
            sampleVal.startsWith("$")
        ) {
            dataType = "currency";
        } else if (
            targetField.includes("rating") ||
            targetField.includes("score") ||
            targetField.includes("count") ||
            targetField.includes("hours")
        ) {
            dataType = "number";
        } else if (targetField.includes("status") || targetField.includes("stage") || targetField.includes("type")) {
            dataType = "enum";
        }

        return {
            fileColumn: header,
            sampleValue: sampleVal.length > 35 ? sampleVal.substring(0, 35) + "..." : sampleVal || "—",
            targetField,
            dataType,
            status: targetField !== "ignore" ? "Passed" : "Warning",
        };
    });
}

/** Normalize date strings into standard YYYY-MM-DD */
export function normalizeDate(val: unknown): string | null {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const parts = str.split(/[/.\-]/);
    if (parts.length === 3) {
        if (parts[0]!.length === 4) {
            return `${parts[0]}-${parts[1]!.padStart(2, "0")}-${parts[2]!.padStart(2, "0")}`;
        }
        if (parts[2]!.length === 4) {
            return `${parts[2]}-${parts[1]!.padStart(2, "0")}-${parts[0]!.padStart(2, "0")}`;
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0]!;
    }
    return null;
}

/** Normalize currency string to numeric float */
export function normalizeNumber(val: unknown): number {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function isNumericValue(val: unknown): boolean {
    if (val === null || val === undefined || String(val).trim() === "") return false;
    const clean = String(val).replace(/[₹$€£,\s]/g, "");
    return /^-?\d+(\.\d+)?$/.test(clean) && Number.isFinite(Number(clean));
}

/** Normalize employment status */
export function normalizeStatus(val: unknown): "active" | "exited" {
    const str = String(val ?? "").toLowerCase().trim();
    if (
        str.includes("exit") ||
        str.includes("resign") ||
        str.includes("term") ||
        str.includes("inactive") ||
        str === "no" ||
        str === "false"
    ) {
        return "exited";
    }
    return "active";
}

/** Validate full raw dataset rows prior to importing */
export function validateRows(
    rows: Record<string, string>[],
    mappings: ColumnMapping[],
    datasetType: DatasetType,
): ValidationReport {
    const errors: RowValidationError[] = [];
    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
        if (m.targetField !== "ignore") {
            fieldMap[m.targetField] = m.fileColumn;
        }
    });

    const seenCodes = new Set<string>();
    const seenJobCodes = new Set<string>();
    const seenCandidateCodes = new Set<string>();
    const seenTargetKeys = new Set<string>();
    let warningRowsCount = 0;
    let errorRowsCount = 0;

    // Schema-level validation
    if (datasetType === "employees" || datasetType === "attrition") {
        const hasCodeOrName = fieldMap["employee_code"] || fieldMap["full_name"];
        if (!hasCodeOrName) {
            errors.push({
                rowNumber: 0,
                field: "Schema Mapping",
                value: "Unmapped",
                severity: "error",
                message: "No column mapped to Employee Code or Employee Name. Please select target field in mapping table.",
            });
        } else if (!fieldMap["employee_code"] && fieldMap["full_name"]) {
            errors.push({
                rowNumber: 0,
                field: "employee_code",
                value: "Unmapped",
                severity: "warning",
                message: "Employee names are being used as primary identifiers. A stable employee code is recommended.",
            });
        }
        ["department", "job_title", "location", "employment_type", "hire_date", "salary"].forEach((field) => {
            if (!fieldMap[field]) {
                errors.push({ rowNumber: 0, field, value: "Unmapped", severity: "error", message: `${field} is required for a database-backed employee import.` });
            }
        });
    } else if (datasetType === "jobs") {
        ["job_code", "job_title", "department", "location", "employment_type", "opening_date", "status_job", "target_hires"].forEach((field) => {
            if (!fieldMap[field]) {
                errors.push({ rowNumber: 0, field, value: "Unmapped", severity: "error", message: `${field} is required for a database-backed job import.` });
            }
        });
    } else if (datasetType === "candidates") {
        ["candidate_code", "full_name", "job_title", "department", "location", "source", "application_date", "stage", "hiring_cost"].forEach((field) => {
            if (!fieldMap[field]) {
                errors.push({ rowNumber: 0, field, value: "Unmapped", severity: "error", message: `${field} is required for a database-backed candidate import.` });
            }
        });
    } else if (datasetType === "targets") {
        ["department", "period", "required_headcount"].forEach((field) => {
            if (!fieldMap[field]) {
                errors.push({ rowNumber: 0, field, value: "Unmapped", severity: "error", message: `${field} is required for a database-backed target import.` });
            }
        });
    }

    rows.forEach((row, index) => {
        const rowNum = index + 1;
        let hasError = false;
        let hasWarning = false;

        if (datasetType === "employees" || datasetType === "attrition") {
            const codeCol = fieldMap["employee_code"];
            const nameCol = fieldMap["full_name"];
            const salaryCol = fieldMap["salary"];
            const hireDateCol = fieldMap["hire_date"];

            const codeVal = String(row[codeCol || ""] ?? "").trim();
            const nameVal = String(row[nameCol || ""] ?? "").trim();
            const salaryVal = row[salaryCol || ""] ? normalizeNumber(row[salaryCol || ""]) : null;
            const hireDateVal = row[hireDateCol || ""] ? normalizeDate(row[hireDateCol || ""]) : null;

            if (!codeVal && !nameVal) {
                hasError = true;
                errors.push({
                    rowNumber: rowNum,
                    field: "Employee Code / Name",
                    value: "Missing",
                    severity: "error",
                    message: "Row is empty or missing primary employee identification (code or name).",
                });
            }

            if (codeVal) {
                if (seenCodes.has(codeVal.toLowerCase())) {
                    hasError = true;
                    errors.push({
                        rowNumber: rowNum,
                        field: "employee_code",
                        value: codeVal,
                        severity: "error",
                        message: `Duplicate employee code '${codeVal}' detected. The duplicate row will not be imported.`,
                    });
                } else {
                    seenCodes.add(codeVal.toLowerCase());
                }
            }

            if (salaryCol && salaryVal !== null && salaryVal < 0) {
                hasError = true;
                errors.push({
                    rowNumber: rowNum,
                    field: "salary",
                    value: String(row[salaryCol]),
                    severity: "error",
                    message: "Salary cannot be negative.",
                });
            }

            ["department", "job_title", "location", "employment_type", "hire_date", "salary"].forEach((field) => {
                const value = fieldMap[field] ? String(row[fieldMap[field]!] ?? "").trim() : "";
                if (fieldMap[field] && !value) {
                    hasError = true;
                    errors.push({ rowNumber: rowNum, field, value: "Missing", severity: "error", message: `${field} is required.` });
                }
            });

            if (salaryCol && String(row[salaryCol] ?? "").trim() && !isNumericValue(row[salaryCol])) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "salary", value: String(row[salaryCol]), severity: "error", message: "Salary must be numeric." });
            }

            if (hireDateCol && row[hireDateCol || ""] && !hireDateVal) {
                hasError = true;
                errors.push({
                    rowNumber: rowNum,
                    field: "hire_date",
                    value: String(row[hireDateCol] ?? ""),
                    severity: "error",
                    message: "Hire date must be a valid date.",
                });
            }
        } else if (datasetType === "jobs") {
            const titleCol = fieldMap["job_title"] || fieldMap["job_code"];
            const titleVal = String(row[titleCol || ""] ?? "").trim();
            if (!titleVal) {
                hasError = true;
                errors.push({
                    rowNumber: rowNum,
                    field: "job_title",
                    value: "Missing",
                    severity: "error",
                    message: "Job requisition title or code is required.",
                });
            }
            const jobCode = fieldMap["job_code"] ? String(row[fieldMap["job_code"]!] ?? "").trim().toLowerCase() : "";
            if (jobCode && seenJobCodes.has(jobCode)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "job_code", value: jobCode, severity: "error", message: `Duplicate job code '${jobCode}' detected. The duplicate row will not be imported.` });
            } else if (jobCode) {
                seenJobCodes.add(jobCode);
            }
            ["job_code", "department", "location", "employment_type", "opening_date", "status_job", "target_hires"].forEach((field) => {
                if (fieldMap[field] && !String(row[fieldMap[field]] ?? "").trim()) {
                    hasError = true;
                    errors.push({ rowNumber: rowNum, field, value: "Missing", severity: "error", message: `${field} is required.` });
                }
            });
            const openingDate = fieldMap["opening_date"] ? String(row[fieldMap["opening_date"]!] ?? "").trim() : "";
            const targetHires = fieldMap["target_hires"] ? row[fieldMap["target_hires"]!] : "";
            if (openingDate && !normalizeDate(openingDate)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "opening_date", value: openingDate, severity: "error", message: "Opening date must be a valid date." });
            }
            if (fieldMap["target_hires"] && !isNumericValue(targetHires)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "target_hires", value: String(targetHires), severity: "error", message: "Target hires must be numeric." });
            }
        } else if (datasetType === "candidates") {
            const nameCol = fieldMap["full_name"] || fieldMap["candidate_code"];
            const nameVal = String(row[nameCol || ""] ?? "").trim();
            if (!nameVal) {
                hasError = true;
                errors.push({
                    rowNumber: rowNum,
                    field: "full_name",
                    value: "Missing",
                    severity: "error",
                    message: "Candidate code or name is required.",
                });
            }
            const candidateCode = fieldMap["candidate_code"] ? String(row[fieldMap["candidate_code"]!] ?? "").trim().toLowerCase() : "";
            if (candidateCode && seenCandidateCodes.has(candidateCode)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "candidate_code", value: candidateCode, severity: "error", message: `Duplicate candidate code '${candidateCode}' detected. The duplicate row will not be imported.` });
            } else if (candidateCode) {
                seenCandidateCodes.add(candidateCode);
            }
            ["candidate_code", "job_title", "department", "location", "source", "application_date", "stage", "hiring_cost"].forEach((field) => {
                if (fieldMap[field] && !String(row[fieldMap[field]] ?? "").trim()) {
                    hasError = true;
                    errors.push({ rowNumber: rowNum, field, value: "Missing", severity: "error", message: `${field} is required.` });
                }
            });
            const applicationDate = fieldMap["application_date"] ? String(row[fieldMap["application_date"]!] ?? "").trim() : "";
            const hiringCost = fieldMap["hiring_cost"] ? row[fieldMap["hiring_cost"]!] : "";
            if (applicationDate && !normalizeDate(applicationDate)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "application_date", value: applicationDate, severity: "error", message: "Application date must be a valid date." });
            }
            if (fieldMap["hiring_cost"] && !isNumericValue(hiringCost)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "hiring_cost", value: String(hiringCost), severity: "error", message: "Hiring cost must be numeric." });
            }
        } else if (datasetType === "targets") {
            ["department", "period", "required_headcount"].forEach((field) => {
                if (fieldMap[field] && !String(row[fieldMap[field]] ?? "").trim()) {
                    hasError = true;
                    errors.push({ rowNumber: rowNum, field, value: "Missing", severity: "error", message: `${field} is required.` });
                }
            });
            const targetKey = `${String(fieldMap["department"] ? row[fieldMap["department"]!] : "").trim().toLowerCase()}|${String(fieldMap["period"] ? row[fieldMap["period"]!] : "").trim().toLowerCase()}`;
            if (targetKey !== "|") {
                if (seenTargetKeys.has(targetKey)) {
                    hasError = true;
                    errors.push({ rowNumber: rowNum, field: "department/period", value: targetKey, severity: "error", message: "Duplicate department and period target detected. The duplicate row will not be imported." });
                } else {
                    seenTargetKeys.add(targetKey);
                }
            }
            const requiredHeadcount = fieldMap["required_headcount"] ? row[fieldMap["required_headcount"]!] : "";
            if (fieldMap["required_headcount"] && !isNumericValue(requiredHeadcount)) {
                hasError = true;
                errors.push({ rowNumber: rowNum, field: "required_headcount", value: String(requiredHeadcount), severity: "error", message: "Required headcount must be numeric." });
            }
        }

        if (hasError) errorRowsCount++;
        else if (hasWarning) warningRowsCount++;
    });

    return {
        totalRows: rows.length,
        validRows: rows.length - errorRowsCount,
        warningRows: warningRowsCount,
        errorRows: errorRowsCount,
        errors,
        mappings,
    };
}

/** Convert raw uploaded rows into standard EmployeeRow array */
export function normalizeEmployeeRows(
    rows: Record<string, string>[],
    mappings: ColumnMapping[],
): EmployeeRow[] {
    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
        if (m.targetField !== "ignore") fieldMap[m.targetField] = m.fileColumn;
    });

    return rows.map((r, i) => {
        const codeVal = String(r[fieldMap["employee_code"] || ""] ?? "").trim();
        const nameVal = String(r[fieldMap["full_name"] || ""] ?? "").trim();

        const code = codeVal || (nameVal ? `EMP-${nameVal.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}` : `EMP-${1000 + i}`);
        const name = nameVal || codeVal || `Employee ${i + 1}`;
        const dept = String(r[fieldMap["department"] || ""] ?? "").trim();
        const title = String(r[fieldMap["job_title"] || ""] ?? "").trim();
        const location = String(r[fieldMap["location"] || ""] ?? "").trim();
        const empType = String(r[fieldMap["employment_type"] || ""] ?? "").trim();
        const hireDate = normalizeDate(r[fieldMap["hire_date"] || ""]) || "";
        const salary = normalizeNumber(r[fieldMap["salary"] || ""]);
        const managerKey = fieldMap["manager_name"];
        const manager = managerKey && r[managerKey] ? String(r[managerKey]) : null;
        const perfKey = fieldMap["performance_rating"];
        const rating = perfKey && r[perfKey] ? normalizeNumber(r[perfKey]) : null;
        const satKey = fieldMap["satisfaction_score"];
        const satisfaction = satKey && r[satKey] ? normalizeNumber(r[satKey]) : null;
        const workKey = fieldMap["workload_score"];
        const workload = workKey && r[workKey] ? normalizeNumber(r[workKey]) : null;
        const status = normalizeStatus(r[fieldMap["attrition_status"] || ""]);
        const exitDateKey = fieldMap["exit_date"];
        const exitDate = status === "exited" ? normalizeDate(exitDateKey ? r[exitDateKey] : null) : null;
        const exitTypeKey = fieldMap["exit_type"];
        const exitReasonKey = fieldMap["exit_reason"];

        return {
            id: `emp-${code.toLowerCase()}`,
            employee_code: code,
            full_name: name,
            department: dept,
            job_title: title,
            location,
            employment_type: empType,
            hire_date: hireDate,
            salary,
            manager_name: manager,
            performance_rating: rating,
            promotion_count: 0,
            satisfaction_score: satisfaction,
            workload_score: workload,
            overtime_hours: 0,
            manager_changes: 0,
            attrition_status: status,
            exit_date: exitDate,
            exit_type: status === "exited" ? String((exitTypeKey && r[exitTypeKey]) || "").trim() || null : null,
            exit_reason: status === "exited" ? String((exitReasonKey && r[exitReasonKey]) || "").trim() || null : null,
        };
    });
}

/** Convert raw uploaded rows into standard JobRow array */
export function normalizeJobRows(
    rows: Record<string, string>[],
    mappings: ColumnMapping[],
): JobRow[] {
    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
        if (m.targetField !== "ignore") fieldMap[m.targetField] = m.fileColumn;
    });

    return rows.map((r, i) => {
        const code = String(r[fieldMap["job_code"] || ""] ?? "").trim();
        const title = String(r[fieldMap["job_title"] || ""] ?? "").trim();
        const dept = String(r[fieldMap["department"] || ""] ?? "").trim();
        const location = String(r[fieldMap["location"] || ""] ?? "").trim();
        const empType = String(r[fieldMap["employment_type"] || ""] ?? "").trim();
        const statusStr = String(r[fieldMap["status_job"] || ""] ?? "").toLowerCase();
        const status: JobRow["status"] =
            statusStr.includes("close") ? "closed" : statusStr.includes("hold") ? "on_hold" : statusStr.includes("fill") ? "filled" : "open";

        return {
            id: `job-${code.toLowerCase()}`,
            job_code: code,
            job_title: title,
            department: dept,
            location,
            employment_type: empType,
            status,
            opening_date: normalizeDate(r[fieldMap["opening_date"] || ""]) || "",
            closing_date: status === "closed" ? normalizeDate(r[fieldMap["closing_date"] || ""]) : null,
            target_hires: normalizeNumber(fieldMap["target_hires"] ? r[fieldMap["target_hires"]] : null),
        };
    });
}

/** Convert raw uploaded rows into standard CandidateRow array */
export function normalizeCandidateRows(
    rows: Record<string, string>[],
    mappings: ColumnMapping[],
): CandidateRow[] {
    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
        if (m.targetField !== "ignore") fieldMap[m.targetField] = m.fileColumn;
    });

    return rows.map((r, i) => {
        const code = String(r[fieldMap["candidate_code"] || ""] ?? "").trim();
        const name = String(r[fieldMap["full_name"] || ""] ?? "").trim();
        const title = String(r[fieldMap["job_title"] || ""] ?? "").trim();
        const source = String(r[fieldMap["source"] || ""] ?? "").trim();
        const stageStr = String(r[fieldMap["stage"] || ""] ?? "").toLowerCase();

        let stage: CandidateRow["stage"] = "applied";
        if (stageStr.includes("join")) stage = "joined";
        else if (stageStr.includes("accept")) stage = "accepted";
        else if (stageStr.includes("offer")) stage = "offered";
        else if (stageStr.includes("interview")) stage = "interviewed";
        else if (stageStr.includes("screen")) stage = "screened";

        return {
            id: `cand-${code.toLowerCase()}`,
            candidate_code: code,
            full_name: name,
            job_title: title,
            department: String(r[fieldMap["department"] || ""] ?? "").trim(),
            location: String(r[fieldMap["location"] || ""] ?? "").trim(),
            source,
            application_date: normalizeDate(r[fieldMap["application_date"] || ""]) || "",
            stage,
            joined_date: stage === "joined" ? normalizeDate(r[fieldMap["joined_date"] || ""]) : null,
            hiring_cost: normalizeNumber(fieldMap["hiring_cost"] ? r[fieldMap["hiring_cost"]] : null),
            rejection_reason: null,
        };
    });
}

/** Convert raw uploaded rows into standard TargetRow array */
export function normalizeTargetRows(
    rows: Record<string, string>[],
    mappings: ColumnMapping[],
): TargetRow[] {
    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
        if (m.targetField !== "ignore") fieldMap[m.targetField] = m.fileColumn;
    });

    return rows.map((r) => ({
        department: String(r[fieldMap["department"] || ""] ?? "").trim(),
        period: String(r[fieldMap["period"] || ""] ?? "").trim(),
        required_headcount: normalizeNumber(fieldMap["required_headcount"] ? r[fieldMap["required_headcount"]] : null),
    }));
}

/** Generate a downloadable CSV string of validation errors */
export function generateErrorCSV(errors: RowValidationError[]): string {
    const header = "Row Number,Field,Value,Severity,Error Message\n";
    const rows = errors.map(
        (e) => `"${e.rowNumber}","${e.field}","${e.value.replace(/"/g, '""')}","${e.severity}","${e.message.replace(/"/g, '""')}"`,
    );
    return header + rows.join("\n");
}
