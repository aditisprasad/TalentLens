import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { EmptyState, LoadingGrid, StatusBadge } from "@/components/talent/primitives";
import { useAnalytics } from "@/lib/analytics/store";
import { tenureYears, trainAttritionRisk } from "@/lib/analytics/compute";
import type { EmployeeRow } from "@/lib/analytics/types";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/employees")({
    head: () => ({
        meta: [
            { title: "Employee Intelligence & Directory — TalentLens" },
            {
                name: "description",
                content: "Searchable workforce directory, performance ratings, compensation, and profile analytics.",
            },
        ],
    }),
    component: EmployeesPage,
});

function EmployeesPage() {
    const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("active");
    const [selectedEmp, setSelectedEmp] = useState<EmployeeRow | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const riskModel = useMemo(() => trainAttritionRisk(data.employees), [data.employees]);
    const riskMap = useMemo(() => {
        const map = new Map<string, { band: string; probability: number }>();
        riskModel.scores.forEach((s) => map.set(s.id, { band: s.band, probability: s.probability }));
        return map;
    }, [riskModel]);

    const filteredEmployees = useMemo(() => {
        return data.employees.filter((e) => {
            const matchesSearch =
                !searchTerm ||
                e.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.job_title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || e.attrition_status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [data.employees, searchTerm, statusFilter]);

    const pageSize = 15;
    const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
    const paginatedEmployees = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage]);

    return (
        <AppShell
            title="Employee Intelligence Directory"
            description="Workforce records, performance ratings, pay bands, and attrition risk profiles sourced directly from PostgreSQL"
        >
            <FilterBar options={options} show={["department", "location", "jobRole", "employmentType"]} />

            {isLoading ? (
                <LoadingGrid />
            ) : isError ? (
                <EmptyState
                    title="We couldn't load employee records"
                    description={error instanceof Error ? error.message : "Please try refreshing."}
                />
            ) : isEmpty ? (
                <EmptyState
                    title="No employee records"
                    description="Import employee data in Data Management to access the workforce directory."
                />
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by code, name, department, role..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="active">Active Staff ({data.employees.filter((e) => e.attrition_status === "active").length})</option>
                                <option value="exited">Exited Staff ({data.employees.filter((e) => e.attrition_status === "exited").length})</option>
                                <option value="all">All Records ({data.employees.length})</option>
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Job Title</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Tenure</TableHead>
                                    <TableHead className="text-right">Salary</TableHead>
                                    <TableHead className="text-right">Perf Rating</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Risk Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedEmployees.map((e) => {
                                    const r = riskMap.get(e.id);
                                    return (
                                        <TableRow
                                            key={e.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedEmp(e)}
                                        >
                                            <TableCell className="font-mono text-xs font-medium">{e.employee_code}</TableCell>
                                            <TableCell className="font-semibold">{e.full_name}</TableCell>
                                            <TableCell>{e.department}</TableCell>
                                            <TableCell className="text-muted-foreground">{e.job_title}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{e.location}</TableCell>
                                            <TableCell className="text-right font-mono">{tenureYears(e)} yrs</TableCell>
                                            <TableCell className="text-right font-mono">{formatINR(Number(e.salary))}</TableCell>
                                            <TableCell className="text-right font-mono font-medium">{e.performance_rating ?? "—"}</TableCell>
                                            <TableCell><StatusBadge status={e.attrition_status} /></TableCell>
                                            <TableCell>
                                                {r ? (
                                                    <Badge
                                                        variant={r.band === "High" ? "destructive" : r.band === "Medium" ? "secondary" : "outline"}
                                                        className="text-xs font-mono"
                                                    >
                                                        {r.probability}% ({r.band})
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                        <span>Showing {paginatedEmployees.length} of {filteredEmployees.length} employee records</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    {/* Employee Profile Modal */}
                    {selectedEmp ? (
                        <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-muted-foreground">{selectedEmp.employee_code}</span>
                                        <StatusBadge status={selectedEmp.attrition_status} />
                                    </div>
                                    <DialogTitle className="text-2xl font-bold">{selectedEmp.full_name}</DialogTitle>
                                    <DialogDescription>
                                        {selectedEmp.job_title} • {selectedEmp.department} • {selectedEmp.location} ({selectedEmp.employment_type})
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 text-sm">
                                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Manager</div>
                                            <div className="font-semibold text-foreground">{selectedEmp.manager_name}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Hire Date</div>
                                            <div className="font-semibold text-foreground">{selectedEmp.hire_date}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Tenure</div>
                                            <div className="font-semibold text-foreground">{tenureYears(selectedEmp)} years</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Base Salary</div>
                                            <div className="font-semibold text-foreground font-mono">{formatINR(Number(selectedEmp.salary))} / yr</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="rounded-lg border border-border p-2.5">
                                            <div className="text-muted-foreground">Performance</div>
                                            <div className="text-base font-bold text-foreground">{selectedEmp.performance_rating ?? "N/A"} / 5.0</div>
                                        </div>
                                        <div className="rounded-lg border border-border p-2.5">
                                            <div className="text-muted-foreground">Satisfaction</div>
                                            <div className="text-base font-bold text-foreground">{selectedEmp.satisfaction_score ?? "N/A"} / 5.0</div>
                                        </div>
                                        <div className="rounded-lg border border-border p-2.5">
                                            <div className="text-muted-foreground">Overtime</div>
                                            <div className="text-base font-bold text-foreground">{selectedEmp.overtime_hours} hrs/mo</div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Promotions Received:</span>
                                            <span className="font-semibold">{selectedEmp.promotion_count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Manager Changes:</span>
                                            <span className="font-semibold">{selectedEmp.manager_changes}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Workload Index:</span>
                                            <span className="font-semibold">{selectedEmp.workload_score ?? "N/A"} / 10.0</span>
                                        </div>
                                    </div>

                                    {selectedEmp.attrition_status === "exited" ? (
                                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                                            <div className="font-semibold text-destructive">Exit Details ({selectedEmp.exit_type})</div>
                                            <p className="mt-0.5 text-muted-foreground">Date: {selectedEmp.exit_date} • Reason: {selectedEmp.exit_reason}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : null}
                </div>
            )}
        </AppShell>
    );
}
