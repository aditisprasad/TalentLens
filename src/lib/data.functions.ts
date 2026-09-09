import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Dataset, EmployeeRow, JobRow, CandidateRow, TargetRow } from "@/lib/analytics/types";
import { summarizeReferenceValidationErrors } from "@/lib/ingestion";

type DeptRef = { name: string } | null;

export type UploadedDatasetLog = {
  id: string;
  file_name: string;
  file_type: string;
  target_entity: string;
  row_count: number;
  imported_rows: number;
  status: string;
  created_at: string;
};

export type FullWorkspaceDataset = Dataset & {
  uploadedDatasets: UploadedDatasetLog[];
};

export type ImportReferenceError = {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
};

export type ReferenceValidationResult = {
  valid: boolean;
  errors: ImportReferenceError[];
  summary?: string;
  actionable?: string;
  missingReferenceTypes?: string[];
};

export type OrganizationScopeHealth = {
  status: "green" | "warning" | "error";
  message: string;
  organization_id?: string | null;
  membership_count?: number;
};

export type DeleteDatasetResult = {
  success: boolean;
  deleted_candidates: number;
  deleted_jobs: number;
  deleted_employees: number;
  deleted_targets: number;
};

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/** Loads the full analytical dataset for the authenticated user's workspace directly from PostgreSQL / Server DB.
 *  RLS policies on the Supabase project isolate data per organisation automatically.
 *  If the organisation has no records yet, an empty dataset is returned — never fake data.
 */
export const fetchDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FullWorkspaceDataset> => {
    console.log(`[SERVER DB] [fetchDataset] Request received for userId: ${context?.userId || "anonymous"}`);

    if (!context?.supabase) {
      throw new Error("Authenticated Supabase client is required to load workspace data.");
    }

    const sb = context.supabase;

    try {
      const [employeesRes, jobsRes, candidatesRes, targetsRes, logsRes] = await Promise.all([
        sb
          .from("employees")
          .select(
            "id,employee_code,full_name,job_title,location,employment_type,hire_date,salary,manager_name,performance_rating,promotion_count,satisfaction_score,workload_score,overtime_hours,manager_changes,attrition_status,exit_date,exit_type,exit_reason,departments(name)",
          )
          .order("hire_date", { ascending: true })
          .limit(20000),
        sb
          .from("job_openings")
          .select(
            "id,job_code,job_title,location,employment_type,status,opening_date,closing_date,target_hires,departments(name)",
          )
          .limit(5000),
        sb
          .from("candidates")
          .select(
            "id,candidate_code,full_name,application_date,stage,joined_date,hiring_cost,rejection_reason,recruitment_sources(name),job_openings(job_title,location,employment_type,departments(name))",
          )
          .order("application_date", { ascending: true })
          .limit(20000),
        sb.from("workforce_targets").select("period,required_headcount,departments(name)").limit(2000),
        sb.from("uploaded_datasets").select("id,file_name,file_type,target_entity,row_count,imported_rows,status,created_at").order("created_at", { ascending: false }).limit(100),
      ]);

      if (employeesRes.error) throw new Error(`employees query failed: ${employeesRes.error.message}`);
      if (jobsRes.error) throw new Error(`jobs query failed: ${jobsRes.error.message}`);
      if (candidatesRes.error) throw new Error(`candidates query failed: ${candidatesRes.error.message}`);
      if (targetsRes.error) throw new Error(`targets query failed: ${targetsRes.error.message}`);
      if (logsRes.error) throw new Error(`logs query failed: ${logsRes.error.message}`);

      const pgEmployees: Dataset["employees"] = (employeesRes.data ?? []).map((e: any) => ({
        id: e.id,
        employee_code: e.employee_code,
        full_name: e.full_name,
        department: (e.departments as DeptRef)?.name ?? "Unassigned",
        job_title: e.job_title,
        location: e.location,
        employment_type: e.employment_type,
        hire_date: e.hire_date,
        salary: Number(e.salary),
        manager_name: e.manager_name,
        performance_rating: e.performance_rating === null ? null : Number(e.performance_rating),
        promotion_count: e.promotion_count ?? 0,
        satisfaction_score: e.satisfaction_score === null ? null : Number(e.satisfaction_score),
        workload_score: e.workload_score === null ? null : Number(e.workload_score),
        overtime_hours: Number(e.overtime_hours ?? 0),
        manager_changes: e.manager_changes ?? 0,
        attrition_status: e.attrition_status === "exited" ? "exited" : "active",
        exit_date: e.exit_date,
        exit_type: e.exit_type,
        exit_reason: e.exit_reason,
      }));

      const pgJobs: Dataset["jobs"] = (jobsRes.data ?? []).map((j: any) => ({
        id: j.id,
        job_code: j.job_code,
        job_title: j.job_title,
        department: (j.departments as DeptRef)?.name ?? "Unassigned",
        location: j.location,
        employment_type: j.employment_type,
        status: j.status as Dataset["jobs"][number]["status"],
        opening_date: j.opening_date,
        closing_date: j.closing_date,
        target_hires: j.target_hires ?? 1,
      }));

      const pgCandidates: Dataset["candidates"] = (candidatesRes.data ?? []).map((c: any) => {
        const job = c.job_openings as
          | { job_title: string; location: string; employment_type: string; departments: DeptRef }
          | null;
        return {
          id: c.id,
          candidate_code: c.candidate_code,
          full_name: c.full_name,
          job_title: job?.job_title ?? "Unspecified",
          department: job?.departments?.name ?? "Unassigned",
          location: job?.location ?? "Unspecified",
          source: (c.recruitment_sources as { name: string } | null)?.name ?? "Unknown",
          application_date: c.application_date,
          stage: c.stage as Dataset["candidates"][number]["stage"],
          joined_date: c.joined_date,
          hiring_cost: Number(c.hiring_cost ?? 0),
          rejection_reason: c.rejection_reason,
        };
      });

      const pgTargets: Dataset["targets"] = (targetsRes.data ?? []).map((t: any) => ({
        department: (t.departments as DeptRef)?.name ?? "Unassigned",
        period: t.period,
        required_headcount: t.required_headcount,
      }));

      const pgLogs: UploadedDatasetLog[] = (logsRes.data ?? []).map((l: any) => ({
        id: l.id,
        file_name: l.file_name,
        file_type: l.file_type || "csv_xlsx",
        target_entity: l.target_entity || "workspace",
        row_count: Number(l.row_count ?? 0),
        imported_rows: Number(l.imported_rows ?? 0),
        status: l.status || "Imported",
        created_at: l.created_at || new Date().toISOString(),
      }));

      console.log(
        `[SERVER DB] [fetchDataset] PostgreSQL workspace counts: ${pgEmployees.length} employees, ${pgJobs.length} jobs, ${pgCandidates.length} candidates, ${pgTargets.length} targets, ${pgLogs.length} logs`,
      );

      return {
        employees: pgEmployees,
        jobs: pgJobs,
        candidates: pgCandidates,
        targets: pgTargets,
        uploadedDatasets: pgLogs,
      };
    } catch (err) {
      console.error("[SERVER DB] [fetchDataset] PostgreSQL fetch failed:", err);
      throw err;
    }
  });

export const checkOrganizationScopeServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrganizationScopeHealth> => {
    if (!context?.supabase || !context.userId) {
      return { status: "error", message: "Unable to verify authenticated data access" };
    }

    const sb = context.supabase;

    try {
      const [{ data: memberships, error: membershipsError }, currentOrgResult] = await Promise.all([
        (sb as any).from("organization_members").select("organization_id").eq("user_id", context.userId).limit(20),
        (sb as any).rpc("current_organization_id"),
      ]);

      const { data: currentOrgId, error: currentOrgError } = currentOrgResult as { data?: string | null; error?: { message?: string } | null };
      if (membershipsError) throw new Error(membershipsError.message);
      if (currentOrgError) throw new Error(currentOrgError.message);

      const membershipCount = Array.isArray(memberships) ? memberships.length : 0;
      const organizationId = typeof currentOrgId === "string" && currentOrgId ? currentOrgId : null;

      if (!organizationId) {
        return {
          status: "warning",
          message: "Organization scope not configured",
          organization_id: null,
          membership_count: membershipCount,
        };
      }

      const { error: accessError } = await (sb as any)
        .from("uploaded_datasets")
        .select("id")
        .eq("organization_id", organizationId)
        .limit(1);
      if (accessError) {
        throw new Error(accessError.message);
      }

      return {
        status: "green",
        message: "Organization-scoped access verified",
        organization_id: organizationId,
        membership_count: membershipCount,
      };
    } catch (error) {
      console.error("[SERVER DB] [checkOrganizationScopeServerFn] failed:", error);
      return { status: "error", message: "Unable to verify authenticated data access" };
    }
  });

export const deleteDatasetServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { datasetId: string }) => data)
  .handler(async ({ context, data }): Promise<DeleteDatasetResult> => {
    if (!context?.supabase || !isValidUUID(context.userId) || !isValidUUID(data.datasetId)) {
      throw new Error("Authenticated identity and a valid dataset are required for deletion.");
    }

    const { data: result, error } = await (context.supabase.rpc as any)("delete_workspace_dataset", {
      p_dataset_id: data.datasetId,
    });

    if (error) {
      throw new Error(error.message || "Dataset deletion failed.");
    }

    if (!result?.success) {
      throw new Error("Dataset deletion failed.");
    }

    return result as DeleteDatasetResult;
  });

export const validateDatasetReferencesServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      employees?: EmployeeRow[];
      jobs?: JobRow[];
      candidates?: CandidateRow[];
      targets?: TargetRow[];
    }) => data,
  )
  .handler(async ({ context, data }): Promise<ReferenceValidationResult> => {
    if (!context?.supabase || !isValidUUID(context.userId)) {
      throw new Error("Authenticated Supabase client and user identity are required to validate workspace data.");
    }

    const sb = context.supabase;
    const [{ data: departments, error: departmentsError }, { data: jobs, error: jobsError }, { data: sources, error: sourcesError }] = await Promise.all([
      sb.from("departments").select("id,name"),
      sb.from("job_openings").select("id,job_title,department_id"),
      sb.from("recruitment_sources").select("id,name"),
    ]);
    if (departmentsError) throw departmentsError;
    if (jobsError) throw jobsError;
    if (sourcesError) throw sourcesError;

    const departmentIds = new Map((departments ?? []).map((department: any) => [String(department.name).trim().toLowerCase(), department.id]));
    const jobKeys = new Set((jobs ?? []).map((job: any) => `${String(job.job_title).trim().toLowerCase()}|${job.department_id ?? ""}`));
    for (const job of data.jobs ?? []) {
      const departmentId = departmentIds.get(job.department.trim().toLowerCase());
      if (departmentId) jobKeys.add(`${job.job_title.trim().toLowerCase()}|${departmentId}`);
    }
    const sourceNames = new Set((sources ?? []).map((source: any) => String(source.name).trim().toLowerCase()));
    const errors: ImportReferenceError[] = [];
    const checkDepartment = (department: string, rowNumber: number) => {
      if (!departmentIds.has(department.trim().toLowerCase())) {
        errors.push({ rowNumber, field: "department", value: department, message: `Department '${department}' does not exist in this organization.` });
      }
    };

    (data.employees ?? []).forEach((employee, index) => checkDepartment(employee.department, index + 1));
    (data.jobs ?? []).forEach((job, index) => checkDepartment(job.department, index + 1));
    (data.targets ?? []).forEach((target, index) => checkDepartment(target.department, index + 1));
    (data.candidates ?? []).forEach((candidate, index) => {
      const rowNumber = index + 1;
      const departmentId = departmentIds.get(candidate.department.trim().toLowerCase());
      if (!departmentId) {
        errors.push({ rowNumber, field: "department", value: candidate.department, message: `Department '${candidate.department}' does not exist in this organization.` });
      } else if (!jobKeys.has(`${candidate.job_title.trim().toLowerCase()}|${departmentId}`)) {
        errors.push({ rowNumber, field: "job_title", value: candidate.job_title, message: `No job opening '${candidate.job_title}' exists for department '${candidate.department}'.` });
      }
      if (!sourceNames.has(candidate.source.trim().toLowerCase())) {
        errors.push({ rowNumber, field: "source", value: candidate.source, message: `Recruitment source '${candidate.source}' does not exist in this organization.` });
      }
    });

    const summary = summarizeReferenceValidationErrors(errors);
    return {
      valid: errors.length === 0,
      errors,
      summary: summary.summary,
      actionable: summary.actionable,
      missingReferenceTypes: summary.missingReferenceTypes,
    };
  });

export const saveDatasetServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      employees?: EmployeeRow[];
      jobs?: JobRow[];
      candidates?: CandidateRow[];
      targets?: TargetRow[];
      datasetName: string;
      datasetType: "employees" | "jobs" | "candidates" | "targets" | "attrition";
    }) => data,
  )
  .handler(async ({ context, data }): Promise<{ success: boolean; imported: number; error: string | null }> => {
    console.log(`[SERVER DB] [saveDatasetServerFn] START datasetName="${data.datasetName}" userId="${context?.userId}"`);
    console.log(
      `[SERVER DB] Incoming counts: employees=${data.employees?.length ?? 0}, jobs=${data.jobs?.length ?? 0}, candidates=${data.candidates?.length ?? 0}, targets=${data.targets?.length ?? 0}`,
    );

    if (!context?.supabase || !isValidUUID(context.userId)) {
      throw new Error("Authenticated Supabase client and user identity are required to save workspace data.");
    }

    const sb = context.supabase;
    const fileType = data.datasetName.toLowerCase().endsWith(".xlsx") || data.datasetName.toLowerCase().endsWith(".xls")
      ? "xlsx"
      : "csv";

    const { data: result, error } = await (sb.rpc as any)("import_workspace_dataset", {
      p_dataset_name: data.datasetName,
      p_file_type: fileType,
      p_target_entity: data.datasetType === "attrition" ? "employees" : data.datasetType,
      p_employees: data.employees ?? [],
      p_jobs: data.jobs ?? [],
      p_candidates: data.candidates ?? [],
      p_targets: data.targets ?? [],
    });

    if (error) {
      console.error("[SERVER DB] Atomic PostgreSQL import failed:", error);
      return { success: false, imported: 0, error: error.message };
    }

    const imported = Number(result?.imported ?? 0);
    return { success: result?.success === true, imported, error: null };
  });
