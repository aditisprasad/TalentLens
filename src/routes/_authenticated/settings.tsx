import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, User, Building, History, Database, CheckCircle2, Lock, Sparkles } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/settings")({
    head: () => ({
        meta: [
            { title: "Workspace Settings & Audit Log — TalentLens" },
            {
                name: "description",
                content: "Organization settings, user access control roles, audit logs, and workspace dataset configuration.",
            },
        ],
    }),
    component: SettingsPage,
});

import { useDatasetQuery } from "@/lib/analytics/store";

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"general" | "roles" | "audit">("general");
    const { data, isLoading, isError } = useDatasetQuery();
    const raw = data ?? { employees: [], jobs: [], candidates: [], targets: [], uploadedDatasets: [] };
    const { user } = Route.useRouteContext();

    const auditLogs = (raw.uploadedDatasets ?? []).length > 0
        ? raw.uploadedDatasets.map((log, idx) => ({
            id: String(idx + 1),
            time: log.created_at ? new Date(log.created_at).toLocaleString() : "Recently",
            user: user?.email ?? "Authenticated user",
            action: "DATASET_IMPORTED",
            entity: `${log.file_name} (${log.imported_rows || log.row_count} rows)`,
            status: log.status || "SUCCESS",
        }))
            : [];

    return (
        <AppShell
            title="Workspace Settings &amp; Governance"
            description="Organization profile, role-based access control, security policies and workspace audit logs"
        >
            <div className="space-y-6">
                {/* Workspace Banner */}
                <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs">
                    <div className="flex items-center gap-3">
                        <Sparkles className="size-5 text-primary" />
                        <div>
                            <span className="font-semibold text-foreground">ACTIVE WORKSPACE DATASET</span>
                            <p className="text-muted-foreground mt-0.5">
                                Workspace dataset containing {raw.employees.length} employee records, {raw.jobs.length} requisitions, and {raw.candidates.length} candidate applications.
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/30">Read / Write Access</Badge>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="general">General &amp; Organization</TabsTrigger>
                        <TabsTrigger value="roles">Role-Based Access Control</TabsTrigger>
                        <TabsTrigger value="audit">Workspace Audit Logs</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: GENERAL */}
                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Organization Profile</CardTitle>
                                <CardDescription>General settings for your company workspace</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-w-md text-xs">
                                <div>
                                    <label className="font-semibold block mb-1">Organization Name</label>
                                    <Input defaultValue={user?.email ?? "Authenticated user"} disabled />
                                </div>
                                <div>
                                    <label className="font-semibold block mb-1">Primary Workspace Domain</label>
                                    <Input defaultValue={user?.email?.split("@")[1] ?? "Unavailable"} disabled />
                                </div>
                                <div>
                                    <label className="font-semibold block mb-1">Default Currency</label>
                                    <Input defaultValue="Unavailable" disabled />
                                </div>
                                <Button size="sm">Save Changes</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: ROLES */}
                    <TabsContent value="roles" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Role Permissions &amp; Access Matrix</CardTitle>
                                <CardDescription>Granular access control settings per user role</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Workforce Analytics</TableHead>
                                            <TableHead>Recruitment Pipeline</TableHead>
                                            <TableHead>Attrition Risk Scores</TableHead>
                                            <TableHead>Data Ingestion</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">ADMIN</TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">HR_MANAGER</TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">View &amp; Filter</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Import</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">RECRUITER</TableCell>
                                            <TableCell><Badge variant="outline" className="text-muted-foreground">View Only</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Full Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-destructive">No Access</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-destructive">No Access</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">EXECUTIVE</TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Read Reports</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Read Reports</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-emerald-600">Read Summaries</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className="text-destructive">No Access</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: AUDIT LOGS */}
                    <TabsContent value="audit" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Workspace Audit Trail</CardTitle>
                                <CardDescription>Security and administrative activity history log</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action Event</TableHead>
                                            <TableHead>Target Entity</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? <TableRow><TableCell colSpan={5}>Loading database audit history...</TableCell></TableRow> : isError ? <TableRow><TableCell colSpan={5}>Audit history unavailable.</TableCell></TableRow> : auditLogs.length === 0 ? <TableRow><TableCell colSpan={5}>No imported dataset activity recorded.</TableCell></TableRow> : auditLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{log.time}</TableCell>
                                                <TableCell className="font-semibold text-xs">{log.user}</TableCell>
                                                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-emerald-600 text-[10px]">{log.status}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}
