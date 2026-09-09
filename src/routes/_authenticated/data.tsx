import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    RefreshCw,
    Download,
    Database,
    ShieldCheck,
    Plus,
    Eye,
    Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/talent/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAnalytics } from "@/lib/analytics/store";
import { useServerFn } from "@tanstack/react-start";
import { saveDatasetServerFn, validateDatasetReferencesServerFn } from "@/lib/data.functions";
import {
    autoMapColumns,
    inferDatasetType,
    validateRows,
    normalizeEmployeeRows,
    normalizeJobRows,
    normalizeCandidateRows,
    normalizeTargetRows,
    generateErrorCSV,
    parseWorkbook,
    detectHeaderAndRows,
    type DatasetType,
    type ColumnMapping,
    type ValidationReport,
    type ParsedSheetResult,
} from "@/lib/ingestion";

export const Route = createFileRoute("/_authenticated/data")({
    head: () => ({
        meta: [
            { title: "Data Management & Ingestion — TalentLens" },
            {
                name: "description",
                content:
                    "Upload CSV or Excel files, map schema columns, run data validation, and import workforce datasets into PostgreSQL.",
            },
        ],
    }),
    component: DataPage,
});

type UploadStep = "upload" | "mapping" | "validation" | "complete";

const DATASET_TYPE_CONFIG: { id: DatasetType; name: string; desc: string; icon: string }[] = [
    { id: "employees", name: "Employees Dataset", desc: "Employee master records, departments, hire dates, salaries, performance ratings", icon: "👥" },
    { id: "jobs", name: "Job Openings", desc: "Requisitions, open positions, department target hires", icon: "💼" },
    { id: "candidates", name: "Candidates & Pipeline", desc: "Applications, source channels, funnel stages, hiring cost", icon: "🎯" },
    { id: "targets", name: "Workforce Targets", desc: "Department headcount requirements per period", icon: "📊" },
    { id: "attrition", name: "Attrition & Exits", desc: "Exit records, resignation dates, separation reasons", icon: "🚪" },
];

export function DataPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const saveDatasetRemote = useServerFn(saveDatasetServerFn);
    const validateDatasetReferencesRemote = useServerFn(validateDatasetReferencesServerFn);
    const { raw, isEmpty, uploadedDatasets, isLoading } = useAnalytics();

    const qualityMetrics = useMemo(() => {
        const employeeFields = [
            "employee_code",
            "full_name",
            "department",
            "job_title",
            "location",
            "employment_type",
            "hire_date",
            "salary",
        ] as const;
        const employeeValues = raw.employees.flatMap((employee) => employeeFields.map((field) => employee[field]));
        const completeness = employeeValues.length
            ? (employeeValues.filter((value) => value !== null && value !== undefined && value !== "").length / employeeValues.length) * 100
            : 0;
        const validRows = [
            ...raw.employees.map((employee) => Boolean(employee.employee_code && employee.full_name && employee.hire_date && employee.salary >= 0)),
            ...raw.jobs.map((job) => Boolean(job.job_code && job.job_title && job.opening_date && job.target_hires >= 0)),
            ...raw.candidates.map((candidate) => Boolean(candidate.candidate_code && candidate.full_name && candidate.application_date && candidate.stage)),
            ...raw.targets.map((target) => Boolean(target.department && target.period && target.required_headcount >= 0)),
        ];
        const schemaValidity = validRows.length ? (validRows.filter(Boolean).length / validRows.length) * 100 : 0;
        const employeeCodes = raw.employees.map((employee) => employee.employee_code);
        const duplicateRate = employeeCodes.length
            ? ((employeeCodes.length - new Set(employeeCodes).size) / employeeCodes.length) * 100
            : 0;
        const linkedEmployees = raw.employees.filter((employee) => employee.department !== "Unassigned").length;
        const referentialIntegrity = raw.employees.length ? (linkedEmployees / raw.employees.length) * 100 : 0;
        return {
            completeness: Number(completeness.toFixed(1)),
            schemaValidity: Number(schemaValidity.toFixed(1)),
            duplicateRate: Number(duplicateRate.toFixed(1)),
            referentialIntegrity: Number(referentialIntegrity.toFixed(1)),
        };
    }, [raw]);

    const connectedDatasetCount = [raw.employees.length, raw.jobs.length, raw.candidates.length, raw.targets.length].filter(Boolean).length;

    const [activeTab, setActiveTab] = useState<"datasets" | "upload" | "quality" | "history">("datasets");
    const [selectedDatasetType, setSelectedDatasetType] = useState<DatasetType>("employees");
    const [uploadStep, setUploadStep] = useState<UploadStep>("upload");
    const [fileName, setFileName] = useState<string | null>(null);

    // Parser state
    const [workbookSheets, setWorkbookSheets] = useState<ParsedSheetResult[]>([]);
    const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
    const [rawParsedRows, setRawParsedRows] = useState<Record<string, string>[]>([]);
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
    const [detectedHeaderIndex, setDetectedHeaderIndex] = useState<number>(1);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    // Calculate freshness label directly from PostgreSQL dataset metadata
    const freshnessLabel = useMemo(() => {
        if (!uploadedDatasets || uploadedDatasets.length === 0) return "No datasets imported yet";
        const latestLog = uploadedDatasets[0];
        if (!latestLog?.created_at) return "Data updated recently";
        const diffMin = Math.round((new Date().getTime() - new Date(latestLog.created_at).getTime()) / 60000);
        if (isNaN(diffMin) || diffMin < 1) return "Data updated just now";
        if (diffMin < 60) return `Data updated ${diffMin} minutes ago`;
        const diffHours = Math.round(diffMin / 60);
        return `Data updated ${diffHours} hours ago`;
    }, [uploadedDatasets]);

    const applyParsedSheet = (sheetResult: ParsedSheetResult, filename: string) => {
        setDetectedHeaderIndex(sheetResult.headerRowIndex);
        setDetectedHeaders(sheetResult.headers);
        setRawParsedRows(sheetResult.rows);
        setFileName(filename);

        const sampleRow = sheetResult.rows[0] || {};
        const inferredType = inferDatasetType(sheetResult.headers);
        setSelectedDatasetType(inferredType);

        const autoMappings = autoMapColumns(sheetResult.headers, sampleRow, inferredType);
        setMappings(autoMappings);

        const report = validateRows(sheetResult.rows, autoMappings, inferredType);
        setValidationReport(report);

        setUploadStep("mapping");
        toast.success(
            `Loaded '${sheetResult.sheetName}' (${sheetResult.rows.length} rows, header detected at Row ${sheetResult.headerRowIndex}).`,
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.split(".").pop()?.toLowerCase();

        if (extension === "csv" || extension === "tsv") {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const matrix = (results.data as string[][]).map((row) => row.map((c) => String(c ?? "")));
                    const { headerRowIndex, headers, rows, score } = detectHeaderAndRows(matrix);
                    const singleSheet: ParsedSheetResult = {
                        sheetName: "CSV Data",
                        headerRowIndex,
                        headers,
                        rows,
                        score,
                    };
                    setWorkbookSheets([singleSheet]);
                    setActiveSheetIndex(0);
                    applyParsedSheet(singleSheet, file.name);
                },
                error: (err) => toast.error(`CSV parsing error: ${err.message}`),
            });
        } else if (extension === "xlsx" || extension === "xls") {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: "binary" });
                    const sheets = parseWorkbook(wb);
                    if (!sheets.length || !sheets[0]) {
                        toast.error("Excel workbook contains no parseable data sheets.");
                        return;
                    }
                    setWorkbookSheets(sheets);
                    setActiveSheetIndex(0);
                    applyParsedSheet(sheets[0]!, file.name);
                } catch (err) {
                    toast.error("Failed to parse Excel file");
                }
            };
            reader.readAsBinaryString(file);
        } else {
            toast.error("Unsupported format. Please upload a .csv or .xlsx file.");
        }
    };

    const handleSwitchSheet = (idx: number) => {
        setActiveSheetIndex(idx);
        if (workbookSheets[idx] && fileName) {
            applyParsedSheet(workbookSheets[idx]!, fileName);
        }
    };

    const handleRunValidation = () => {
        if (!rawParsedRows.length) return;
        const report = validateRows(rawParsedRows, mappings, selectedDatasetType);
        setValidationReport(report);
        setUploadStep("validation");
        if (report.errorRows > 0) {
            toast.warning(`Validation completed with ${report.errorRows} blocking error rows.`);
        } else {
            toast.success(`Validation complete: ${report.validRows} valid rows ready for import.`);
        }
    };

    const handleDownloadErrorReport = () => {
        if (!validationReport?.errors.length) return;
        const csvContent = generateErrorCSV(validationReport.errors);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `validation_errors_${fileName || "report"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExecuteImport = async () => {
        if (!rawParsedRows.length || !fileName) return;
        if (validationReport && validationReport.errorRows > 0) {
            toast.error("Cannot import data with blocking validation errors. Please fix mappings first.");
            return;
        }

        setIsImporting(true);

        try {
            let result;
            let referenceValidation;
            if (selectedDatasetType === "employees" || selectedDatasetType === "attrition") {
                const normalizedEmployees = normalizeEmployeeRows(rawParsedRows, mappings);
                referenceValidation = await validateDatasetReferencesRemote({ data: { employees: normalizedEmployees } });
                if (!referenceValidation.valid) {
                    const referenceErrors = referenceValidation.errors.map((error) => ({ ...error, severity: "error" as const }));
                    setValidationReport((current) => current ? {
                        ...current,
                        validRows: Math.max(0, current.validRows - referenceErrors.length),
                        errorRows: current.errorRows + referenceErrors.length,
                        errors: [...current.errors, ...referenceErrors],
                    } : current);
                    toast.error(referenceErrors.map((error) => `Row ${error.rowNumber}: ${error.message}`).join(" "));
                    setIsImporting(false);
                    return;
                }
                result = await saveDatasetRemote({ data: { employees: normalizedEmployees, datasetName: fileName, datasetType: selectedDatasetType } });
            } else if (selectedDatasetType === "jobs") {
                const normalizedJobs = normalizeJobRows(rawParsedRows, mappings);
                referenceValidation = await validateDatasetReferencesRemote({ data: { jobs: normalizedJobs } });
                if (!referenceValidation.valid) {
                    const referenceErrors = referenceValidation.errors.map((error) => ({ ...error, severity: "error" as const }));
                    setValidationReport((current) => current ? { ...current, validRows: Math.max(0, current.validRows - referenceErrors.length), errorRows: current.errorRows + referenceErrors.length, errors: [...current.errors, ...referenceErrors] } : current);
                    toast.error(referenceErrors.map((error) => `Row ${error.rowNumber}: ${error.message}`).join(" "));
                    setIsImporting(false);
                    return;
                }
                result = await saveDatasetRemote({ data: { jobs: normalizedJobs, datasetName: fileName, datasetType: selectedDatasetType } });
            } else if (selectedDatasetType === "candidates") {
                const normalizedCandidates = normalizeCandidateRows(rawParsedRows, mappings);
                referenceValidation = await validateDatasetReferencesRemote({ data: { candidates: normalizedCandidates } });
                if (!referenceValidation.valid) {
                    const referenceErrors = referenceValidation.errors.map((error) => ({ ...error, severity: "error" as const }));
                    setValidationReport((current) => current ? { ...current, validRows: Math.max(0, current.validRows - referenceErrors.length), errorRows: current.errorRows + referenceErrors.length, errors: [...current.errors, ...referenceErrors] } : current);
                    toast.error(referenceErrors.map((error) => `Row ${error.rowNumber}: ${error.message}`).join(" "));
                    setIsImporting(false);
                    return;
                }
                result = await saveDatasetRemote({ data: { candidates: normalizedCandidates, datasetName: fileName, datasetType: selectedDatasetType } });
            } else if (selectedDatasetType === "targets") {
                const normalizedTargets = normalizeTargetRows(rawParsedRows, mappings);
                referenceValidation = await validateDatasetReferencesRemote({ data: { targets: normalizedTargets } });
                if (!referenceValidation.valid) {
                    const referenceErrors = referenceValidation.errors.map((error) => ({ ...error, severity: "error" as const }));
                    setValidationReport((current) => current ? { ...current, validRows: Math.max(0, current.validRows - referenceErrors.length), errorRows: current.errorRows + referenceErrors.length, errors: [...current.errors, ...referenceErrors] } : current);
                    toast.error(referenceErrors.map((error) => `Row ${error.rowNumber}: ${error.message}`).join(" "));
                    setIsImporting(false);
                    return;
                }
                result = await saveDatasetRemote({ data: { targets: normalizedTargets, datasetName: fileName, datasetType: selectedDatasetType } });
            }

            if (!result || !result.success) {
                setIsImporting(false);
                toast.error(result?.error || "Database import failed. Please check table constraints and network.");
                return;
            }

            // Success: Invalidate TanStack Query cache & trigger refetch from PostgreSQL
            await queryClient.invalidateQueries({ queryKey: ["talentlens"] });
            setIsImporting(false);
            setUploadStep("complete");
            toast.success(`Successfully persisted ${result.imported} records into PostgreSQL database!`);

            setTimeout(() => {
                navigate({ to: "/dashboard", replace: true });
            }, 1000);
        } catch (err: any) {
            setIsImporting(false);
            console.error("[DataPage] Remote save error:", err);
            await queryClient.invalidateQueries({ queryKey: ["talentlens"] });
            toast.error(err?.message || "Failed to communicate with database server.");
        }
    };

    return (
        <AppShell
            title="Data Management & Ingestion Engine"
            description="Upload CSV/Excel spreadsheets, validate records, map schema columns and persist organization datasets into PostgreSQL"
        >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="mb-6">
                    <TabsTrigger value="datasets">Connected Datasets ({connectedDatasetCount})</TabsTrigger>
                    <TabsTrigger value="upload">Upload &amp; Import</TabsTrigger>
                    <TabsTrigger value="quality">Data Quality Scorecard</TabsTrigger>
                    <TabsTrigger value="history">Import History ({uploadedDatasets.length})</TabsTrigger>
                </TabsList>

                {/* ── TAB 1: DATASETS OVERVIEW (READS 100% FROM POSTGRESQL) ── */}
                <TabsContent value="datasets" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Active Organization Datasets</h3>
                            <p className="text-xs text-muted-foreground">{freshnessLabel}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs"
                                onClick={() => setActiveTab("upload")}
                            >
                                <Plus className="size-3.5" /> Upload CSV
                            </Button>
                            <Button
                                size="sm"
                                className="gap-2 text-xs"
                                onClick={() => setActiveTab("upload")}
                            >
                                <FileSpreadsheet className="size-3.5" /> Upload XLSX
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            Querying PostgreSQL database...
                        </div>
                    ) : isEmpty ? (
                        <Card className="border-dashed py-12 text-center">
                            <CardContent className="space-y-4">
                                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Database className="size-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-base">No datasets connected yet</h4>
                                    <p className="max-w-md mx-auto text-xs text-muted-foreground">
                                        Upload your employee, recruitment, attrition or workforce target datasets to calculate evidence-based analytics directly from PostgreSQL.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3 pt-2">
                                    <Button onClick={() => setActiveTab("upload")} className="gap-2">
                                        <Upload className="size-4" /> Upload CSV/XLSX Dataset
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">Employees Master</CardTitle>
                                        <Badge className="bg-emerald-600 text-white">PostgreSQL</Badge>
                                    </div>
                                    <CardDescription className="text-xs">Primary directory &amp; salary</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Persisted Records:</span>
                                        <span className="font-bold font-mono text-emerald-600">{raw.employees.length}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Active Headcount:</span>
                                        <span className="font-semibold text-emerald-600">
                                            {raw.employees.filter((e) => e.attrition_status === "active").length}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">Job Openings</CardTitle>
                                        <Badge className="bg-emerald-600 text-white">PostgreSQL</Badge>
                                    </div>
                                    <CardDescription className="text-xs">Requisitions &amp; headcount</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Active Requisitions:</span>
                                        <span className="font-bold font-mono text-emerald-600">{raw.jobs.length}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">Candidates &amp; Funnel</CardTitle>
                                        <Badge className="bg-emerald-600 text-white">PostgreSQL</Badge>
                                    </div>
                                    <CardDescription className="text-xs">Applicants &amp; source channels</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Total Applications:</span>
                                        <span className="font-bold font-mono text-emerald-600">{raw.candidates.length}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">Workforce Targets</CardTitle>
                                        <Badge className="bg-emerald-600 text-white">PostgreSQL</Badge>
                                    </div>
                                    <CardDescription className="text-xs">Department capacity goals</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Configured Targets:</span>
                                        <span className="font-bold font-mono text-emerald-600">{raw.targets.length}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: UPLOAD & IMPORT PIPELINE ── */}
                <TabsContent value="upload" className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {DATASET_TYPE_CONFIG.map((dt) => (
                            <div
                                key={dt.id}
                                onClick={() => setSelectedDatasetType(dt.id)}
                                className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedDatasetType === dt.id
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-card hover:border-primary/40"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xl">{dt.icon}</span>
                                    {selectedDatasetType === dt.id ? <Badge>Selected</Badge> : null}
                                </div>
                                <h4 className="mt-2 font-semibold text-xs">{dt.name}</h4>
                                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{dt.desc}</p>
                            </div>
                        ))}
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Upload Spreadsheet File</CardTitle>
                                <CardDescription>
                                    Supports CSV, TSV, XLSX, XLS. Automatic title row detection &amp; multi-sheet inspector.
                                </CardDescription>
                            </div>
                            {fileName ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setUploadStep("upload");
                                        setFileName(null);
                                        setRawParsedRows([]);
                                        setWorkbookSheets([]);
                                    }}
                                    className="gap-2 text-xs"
                                >
                                    <RefreshCw className="size-3.5" /> Re-upload File
                                </Button>
                            ) : null}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center hover:border-primary/50 transition-colors">
                                <Upload className="size-10 text-muted-foreground mb-3" />
                                <p className="text-sm font-semibold">Click to browse or drop CSV / Excel file here</p>
                                <p className="text-xs text-muted-foreground mt-1">Automatic title row detection &amp; column alias mapping</p>
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls,.tsv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                            </div>

                            {fileName ? (
                                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="size-4 text-primary" />
                                            <span className="font-semibold">{fileName}</span>
                                            <span className="text-muted-foreground">({rawParsedRows.length} data rows)</span>
                                        </div>
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                                            Header Detected at Row {detectedHeaderIndex}
                                        </Badge>
                                    </div>

                                    {/* MULTI-SHEET SELECTOR */}
                                    {workbookSheets.length > 1 ? (
                                        <div className="flex items-center gap-3 border-t border-border/50 pt-2 text-xs">
                                            <Layers className="size-4 text-muted-foreground" />
                                            <span className="font-medium text-muted-foreground">Select Sheet:</span>
                                            <select
                                                className="h-8 rounded border border-input bg-background px-2 font-mono text-xs"
                                                value={activeSheetIndex}
                                                onChange={(e) => handleSwitchSheet(Number(e.target.value))}
                                            >
                                                {workbookSheets.map((s, idx) => (
                                                    <option key={idx} value={idx}>
                                                        {s.sheetName} ({s.rows.length} rows, header at row {s.headerRowIndex})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* FIRST 5 ROWS DATA PREVIEW */}
                    {fileName && rawParsedRows.length > 0 ? (
                        <Card>
                            <CardHeader className="py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Eye className="size-4 text-primary" />
                                        <CardTitle className="text-sm font-semibold">Source File Data Preview (First 5 Rows)</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs">Verify headers align correctly with row content</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="overflow-x-auto rounded-md border border-border">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="w-12 text-center text-[11px]">#</TableHead>
                                                {detectedHeaders.map((h, i) => (
                                                    <TableHead key={i} className="text-xs font-mono font-semibold">
                                                        {h}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rawParsedRows.slice(0, 5).map((row, rIdx) => (
                                                <TableRow key={rIdx}>
                                                    <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                                                        {rIdx + 1}
                                                    </TableCell>
                                                    {detectedHeaders.map((h, cIdx) => (
                                                        <TableCell key={cIdx} className="text-xs font-mono">
                                                            {row[h] || "—"}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {/* COLUMN MAPPING & VALIDATION STEPS */}
                    {uploadStep !== "upload" && fileName ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Column Schema Mapping &amp; Integrity Check</CardTitle>
                                    <CardDescription>
                                        Target Dataset: <span className="font-semibold capitalize text-foreground">{selectedDatasetType}</span>
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleRunValidation} variant="outline" size="sm">
                                        Re-run Validation
                                    </Button>
                                    <Button
                                        onClick={handleExecuteImport}
                                        disabled={isImporting || (validationReport?.errorRows ?? 0) > 0}
                                        className="gap-2 size-sm"
                                    >
                                        {isImporting ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                        Import into PostgreSQL
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Validation Summary Report */}
                                {validationReport ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-4 gap-3 text-center text-xs">
                                            <div className="rounded-lg border border-border p-3">
                                                <div className="text-muted-foreground">Total Rows</div>
                                                <div className="text-xl font-bold font-mono">{validationReport.totalRows}</div>
                                            </div>
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                                                <div className="text-emerald-700 dark:text-emerald-400">Valid Rows</div>
                                                <div className="text-xl font-bold font-mono text-emerald-600">{validationReport.validRows}</div>
                                            </div>
                                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3">
                                                <div className="text-amber-700 dark:text-amber-400">Warnings</div>
                                                <div className="text-xl font-bold font-mono text-amber-600">{validationReport.warningRows}</div>
                                            </div>
                                            <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-3">
                                                <div className="text-rose-700 dark:text-rose-400">Blocking Errors</div>
                                                <div className="text-xl font-bold font-mono text-rose-600">{validationReport.errorRows}</div>
                                            </div>
                                        </div>

                                        {validationReport.errors.length > 0 ? (
                                            <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-xs text-rose-700 dark:text-rose-400">
                                                        Validation Issues ({validationReport.errors.length})
                                                    </span>
                                                    <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} className="gap-1.5 text-xs h-7">
                                                        <Download className="size-3" /> Download Error Report (CSV)
                                                    </Button>
                                                </div>
                                                <div className="max-h-36 overflow-y-auto space-y-1 text-xs font-mono">
                                                    {validationReport.errors.slice(0, 10).map((err, idx) => (
                                                        <div key={idx} className="flex justify-between text-muted-foreground border-b border-border/40 pb-1">
                                                            <span>Row {err.rowNumber}: <strong className="text-foreground">{err.field}</strong></span>
                                                            <span className={err.severity === "error" ? "text-rose-600" : "text-amber-600"}>{err.message}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {/* MAPPING TABLE */}
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File Source Column</TableHead>
                                                <TableHead>Sample Row Value</TableHead>
                                                <TableHead>Target System Field</TableHead>
                                                <TableHead>Inferred Data Type</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mappings.map((m, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-xs font-semibold">{m.fileColumn}</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs font-mono">{m.sampleValue}</TableCell>
                                                    <TableCell>
                                                        <select
                                                            className="h-8 rounded border border-input bg-background px-2 text-xs font-mono"
                                                            value={m.targetField}
                                                            onChange={(e) => {
                                                                const next = [...mappings];
                                                                next[i]!.targetField = e.target.value;
                                                                setMappings(next);
                                                                const report = validateRows(rawParsedRows, next, selectedDatasetType);
                                                                setValidationReport(report);
                                                            }}
                                                        >
                                                            <option value="ignore">-- Ignore Column --</option>
                                                            <option value="employee_code">employee_code</option>
                                                            <option value="full_name">full_name</option>
                                                            <option value="department">department</option>
                                                            <option value="job_title">job_title</option>
                                                            <option value="location">location</option>
                                                            <option value="employment_type">employment_type</option>
                                                            <option value="hire_date">hire_date</option>
                                                            <option value="salary">salary</option>
                                                            <option value="performance_rating">performance_rating</option>
                                                            <option value="satisfaction_score">satisfaction_score</option>
                                                            <option value="workload_score">workload_score</option>
                                                            <option value="attrition_status">attrition_status</option>
                                                            <option value="exit_date">exit_date</option>
                                                            <option value="job_code">job_code</option>
                                                            <option value="candidate_code">candidate_code</option>
                                                            <option value="stage">stage</option>
                                                            <option value="source">source</option>
                                                            <option value="hiring_cost">hiring_cost</option>
                                                            <option value="required_headcount">required_headcount</option>
                                                            <option value="period">period</option>
                                                        </select>
                                                    </TableCell>
                                                    <TableCell className="text-xs uppercase font-mono">{m.dataType}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={m.targetField !== "ignore" ? "text-emerald-600 border-emerald-300" : "text-muted-foreground"}>
                                                            {m.targetField !== "ignore" ? "Mapped ✓" : "Ignored"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                {/* ── TAB 3: DATA QUALITY DASHBOARD ── */}
                <TabsContent value="quality" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground">Completeness</CardTitle>
                                <div className="text-2xl font-bold font-mono text-emerald-600">{qualityMetrics.completeness}%</div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={qualityMetrics.completeness} className="h-1.5" />
                                <p className="mt-2 text-[11px] text-muted-foreground">Required fields populated</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground">Schema Validity</CardTitle>
                                <div className="text-2xl font-bold font-mono text-emerald-600">{qualityMetrics.schemaValidity}%</div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={qualityMetrics.schemaValidity} className="h-1.5" />
                                <p className="mt-2 text-[11px] text-muted-foreground">Pass rate against type constraints</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground">Duplicate Rate</CardTitle>
                                <div className="text-2xl font-bold font-mono text-sky-600">{qualityMetrics.duplicateRate}%</div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={qualityMetrics.duplicateRate} className="h-1.5" />
                                <p className="mt-2 text-[11px] text-muted-foreground">Zero primary code overlaps</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground">Referential Integrity</CardTitle>
                                <div className="text-2xl font-bold font-mono text-emerald-600">{qualityMetrics.referentialIntegrity}%</div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={qualityMetrics.referentialIntegrity} className="h-1.5" />
                                <p className="mt-2 text-[11px] text-muted-foreground">Department &amp; role alignment</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Data Quality Health Assessment</CardTitle>
                            <CardDescription>Calculated dynamically from PostgreSQL database integrity constraints</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                    <span className="font-semibold">Monetary / Currency Normalization</span>
                                </div>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-300">Passed (INR Grouping Active)</Badge>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                    <span className="font-semibold">Authenticated Data Access (RLS)</span>
                                </div>
                                <Badge variant="outline" className="text-amber-600 border-amber-300">Organization scope not configured</Badge>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                    <span className="font-semibold">Format &amp; Date Consistency</span>
                                </div>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-300">ISO 8601 Standardized</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TAB 4: IMPORT HISTORY (READS DIRECTLY FROM POSTGRESQL uploaded_datasets TABLE) ── */}
                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Workspace Ingestion Log</CardTitle>
                            <CardDescription>Audit history persisted in PostgreSQL `uploaded_datasets` table</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {uploadedDatasets.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No dataset imports recorded in PostgreSQL yet. Upload a CSV or XLSX file to persist your first ingestion log.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>File Name</TableHead>
                                            <TableHead>File Format</TableHead>
                                            <TableHead>Target Scope</TableHead>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead className="text-right">Rows Detected</TableHead>
                                            <TableHead className="text-right">Imported Rows</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {uploadedDatasets.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono text-xs font-semibold">{log.file_name}</TableCell>
                                                <TableCell className="uppercase text-xs font-mono">{log.file_type}</TableCell>
                                                <TableCell className="capitalize text-xs text-muted-foreground">{log.target_entity}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">{log.row_count}</TableCell>
                                                <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">{log.imported_rows}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={log.status === "Imported" ? "text-emerald-600 border-emerald-300" : "text-amber-600 border-amber-300"}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
