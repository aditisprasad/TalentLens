-- Track which persisted records were touched by each import batch.
-- Shared upserts are retained when another import still references the same row.

CREATE TABLE IF NOT EXISTS public.dataset_record_links (
  dataset_id uuid NOT NULL REFERENCES public.uploaded_datasets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  record_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dataset_id, entity_type, record_id),
  CONSTRAINT dataset_record_links_entity_chk CHECK (
    entity_type IN ('employees', 'job_openings', 'candidates', 'workforce_targets')
  )
);

CREATE INDEX IF NOT EXISTS idx_dataset_record_links_record
  ON public.dataset_record_links (organization_id, entity_type, record_id);

ALTER TABLE public.dataset_record_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dataset_record_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dataset_record_links TO authenticated;

DROP POLICY IF EXISTS "read dataset record links" ON public.dataset_record_links;
CREATE POLICY "read dataset record links" ON public.dataset_record_links
  FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

-- The import function owns lineage writes so callers cannot forge links to
-- unrelated records and later delete them through an import they own.
CREATE OR REPLACE FUNCTION public.import_workspace_dataset(
  p_dataset_name text,
  p_file_type text,
  p_target_entity text,
  p_employees jsonb DEFAULT '[]'::jsonb,
  p_jobs jsonb DEFAULT '[]'::jsonb,
  p_candidates jsonb DEFAULT '[]'::jsonb,
  p_targets jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_organization_id uuid := public.current_organization_id();
  v_dataset_id uuid;
  v_total_count integer := CASE p_target_entity
    WHEN 'employees' THEN jsonb_array_length(COALESCE(p_employees, '[]'::jsonb))
    WHEN 'jobs' THEN jsonb_array_length(COALESCE(p_jobs, '[]'::jsonb))
    WHEN 'candidates' THEN jsonb_array_length(COALESCE(p_candidates, '[]'::jsonb))
    WHEN 'targets' THEN jsonb_array_length(COALESCE(p_targets, '[]'::jsonb))
    ELSE 0
  END;
BEGIN
  IF auth.uid() IS NULL OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated organization context is required for import';
  END IF;

  IF p_target_entity IN ('employees', 'targets')
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')) THEN
    RAISE EXCEPTION 'Insufficient role for this import';
  END IF;

  IF p_target_entity IN ('jobs', 'candidates')
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'recruiter')) THEN
    RAISE EXCEPTION 'Insufficient role for this import';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS e(department text)
    LEFT JOIN public.departments d
      ON lower(d.name) = lower(trim(e.department))
     AND d.organization_id = v_organization_id
    WHERE d.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Employee import contains a department that does not exist in this organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_jobs, '[]'::jsonb)) AS j(department text)
    LEFT JOIN public.departments d
      ON lower(d.name) = lower(trim(j.department))
     AND d.organization_id = v_organization_id
    WHERE d.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Job import contains a department that does not exist in this organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_targets, '[]'::jsonb)) AS t(department text)
    LEFT JOIN public.departments d
      ON lower(d.name) = lower(trim(t.department))
     AND d.organization_id = v_organization_id
    WHERE d.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Workforce target import contains a department that does not exist in this organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_candidates, '[]'::jsonb)) AS c(job_title text, department text, source text)
    LEFT JOIN public.departments d
      ON lower(d.name) = lower(trim(c.department))
     AND d.organization_id = v_organization_id
    LEFT JOIN public.job_openings j
      ON lower(j.job_title) = lower(trim(c.job_title))
     AND j.department_id = d.id
     AND j.organization_id = v_organization_id
    LEFT JOIN public.recruitment_sources s
      ON lower(s.name) = lower(trim(c.source))
     AND s.organization_id = v_organization_id
    WHERE j.id IS NULL OR s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Candidate import contains a missing department, job opening, or recruitment source';
  END IF;

  INSERT INTO public.employees (
    employee_code, full_name, department_id, job_title, location,
    employment_type, hire_date, salary, manager_name, performance_rating,
    promotion_count, satisfaction_score, workload_score, overtime_hours,
    manager_changes, attrition_status, exit_date, exit_type, exit_reason,
    is_demo, organization_id
  )
  SELECT e.employee_code, e.full_name, d.id, e.job_title, e.location,
    e.employment_type, e.hire_date::date, e.salary::numeric, e.manager_name,
    e.performance_rating::numeric, COALESCE(e.promotion_count, 0),
    e.satisfaction_score::numeric, e.workload_score::numeric,
    COALESCE(e.overtime_hours, 0), COALESCE(e.manager_changes, 0),
    COALESCE(e.attrition_status, 'active'), e.exit_date::date, e.exit_type,
    e.exit_reason, false, v_organization_id
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS e(
    employee_code text, full_name text, department text, job_title text,
    location text, employment_type text, hire_date text, salary numeric,
    manager_name text, performance_rating numeric, promotion_count integer,
    satisfaction_score numeric, workload_score numeric, overtime_hours numeric,
    manager_changes integer, attrition_status text, exit_date text,
    exit_type text, exit_reason text
  )
  JOIN public.departments d
    ON lower(d.name) = lower(trim(e.department))
   AND d.organization_id = v_organization_id
  ON CONFLICT (employee_code) DO UPDATE SET
    full_name = EXCLUDED.full_name, department_id = EXCLUDED.department_id,
    job_title = EXCLUDED.job_title, location = EXCLUDED.location,
    employment_type = EXCLUDED.employment_type, hire_date = EXCLUDED.hire_date,
    salary = EXCLUDED.salary, manager_name = EXCLUDED.manager_name,
    performance_rating = EXCLUDED.performance_rating, promotion_count = EXCLUDED.promotion_count,
    satisfaction_score = EXCLUDED.satisfaction_score, workload_score = EXCLUDED.workload_score,
    overtime_hours = EXCLUDED.overtime_hours, manager_changes = EXCLUDED.manager_changes,
    attrition_status = EXCLUDED.attrition_status, exit_date = EXCLUDED.exit_date,
    exit_type = EXCLUDED.exit_type, exit_reason = EXCLUDED.exit_reason,
    is_demo = false, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.job_openings (
    job_code, job_title, department_id, location, employment_type,
    status, opening_date, closing_date, target_hires, is_demo, organization_id
  )
  SELECT j.job_code, j.job_title, d.id, j.location, j.employment_type,
    COALESCE(j.status, 'open'), j.opening_date::date, j.closing_date::date,
    COALESCE(j.target_hires, 1), false, v_organization_id
  FROM jsonb_to_recordset(COALESCE(p_jobs, '[]'::jsonb)) AS j(
    job_code text, job_title text, department text, location text,
    employment_type text, status text, opening_date text, closing_date text,
    target_hires integer
  )
  JOIN public.departments d
    ON lower(d.name) = lower(trim(j.department))
   AND d.organization_id = v_organization_id
  ON CONFLICT (job_code) DO UPDATE SET
    job_title = EXCLUDED.job_title, department_id = EXCLUDED.department_id,
    location = EXCLUDED.location, employment_type = EXCLUDED.employment_type,
    status = EXCLUDED.status, opening_date = EXCLUDED.opening_date,
    closing_date = EXCLUDED.closing_date, target_hires = EXCLUDED.target_hires,
    is_demo = false, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.candidates (
    candidate_code, full_name, job_id, source_id, application_date,
    stage, joined_date, hiring_cost, rejection_reason, is_demo, organization_id
  )
  SELECT c.candidate_code, c.full_name, j.id, s.id, c.application_date::date,
    c.stage, c.joined_date::date, COALESCE(c.hiring_cost, 0),
    c.rejection_reason, false, v_organization_id
  FROM jsonb_to_recordset(COALESCE(p_candidates, '[]'::jsonb)) AS c(
    candidate_code text, full_name text, job_title text, department text,
    location text, source text, application_date text, stage text,
    joined_date text, hiring_cost numeric, rejection_reason text
  )
  JOIN public.departments d
    ON lower(d.name) = lower(trim(c.department))
   AND d.organization_id = v_organization_id
  JOIN public.job_openings j
    ON lower(j.job_title) = lower(trim(c.job_title))
   AND j.department_id = d.id
   AND j.organization_id = v_organization_id
  JOIN public.recruitment_sources s
    ON lower(s.name) = lower(trim(c.source))
   AND s.organization_id = v_organization_id
  ON CONFLICT (candidate_code) DO UPDATE SET
    full_name = EXCLUDED.full_name, job_id = EXCLUDED.job_id,
    source_id = EXCLUDED.source_id, application_date = EXCLUDED.application_date,
    stage = EXCLUDED.stage, joined_date = EXCLUDED.joined_date,
    hiring_cost = EXCLUDED.hiring_cost, rejection_reason = EXCLUDED.rejection_reason,
    is_demo = false, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.workforce_targets (department_id, period, required_headcount, organization_id)
  SELECT d.id, t.period, t.required_headcount, v_organization_id
  FROM jsonb_to_recordset(COALESCE(p_targets, '[]'::jsonb)) AS t(
    department text, period text, required_headcount integer
  )
  JOIN public.departments d
    ON lower(d.name) = lower(trim(t.department))
   AND d.organization_id = v_organization_id
  ON CONFLICT (department_id, period) DO UPDATE SET
    required_headcount = EXCLUDED.required_headcount,
    organization_id = EXCLUDED.organization_id;

  INSERT INTO public.uploaded_datasets (
    user_id, file_name, file_type, target_entity, row_count,
    imported_rows, status, validation_report, organization_id
  )
  VALUES (
    auth.uid(), p_dataset_name, p_file_type, p_target_entity, v_total_count,
    v_total_count, 'imported', jsonb_build_object('invalid_rows', 0), v_organization_id
  )
  RETURNING id INTO v_dataset_id;

  INSERT INTO public.dataset_record_links (dataset_id, organization_id, entity_type, record_id)
  SELECT v_dataset_id, v_organization_id, 'employees', e.id
  FROM jsonb_to_recordset(COALESCE(p_employees, '[]'::jsonb)) AS input(employee_code text)
  JOIN public.employees e ON e.employee_code = input.employee_code AND e.organization_id = v_organization_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.dataset_record_links (dataset_id, organization_id, entity_type, record_id)
  SELECT v_dataset_id, v_organization_id, 'job_openings', j.id
  FROM jsonb_to_recordset(COALESCE(p_jobs, '[]'::jsonb)) AS input(job_code text)
  JOIN public.job_openings j ON j.job_code = input.job_code AND j.organization_id = v_organization_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.dataset_record_links (dataset_id, organization_id, entity_type, record_id)
  SELECT v_dataset_id, v_organization_id, 'candidates', c.id
  FROM jsonb_to_recordset(COALESCE(p_candidates, '[]'::jsonb)) AS input(candidate_code text)
  JOIN public.candidates c ON c.candidate_code = input.candidate_code AND c.organization_id = v_organization_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.dataset_record_links (dataset_id, organization_id, entity_type, record_id)
  SELECT v_dataset_id, v_organization_id, 'workforce_targets', wt.id
  FROM jsonb_to_recordset(COALESCE(p_targets, '[]'::jsonb)) AS input(department text, period text)
  JOIN public.departments d ON lower(d.name) = lower(trim(input.department)) AND d.organization_id = v_organization_id
  JOIN public.workforce_targets wt ON wt.department_id = d.id AND wt.period = input.period AND wt.organization_id = v_organization_id
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'imported', v_total_count, 'dataset_id', v_dataset_id);
END;
$$;

REVOKE ALL ON FUNCTION public.import_workspace_dataset(text, text, text, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_workspace_dataset(text, text, text, jsonb, jsonb, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_workspace_dataset(p_dataset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_organization_id uuid := public.current_organization_id();
  v_dataset_owner uuid;
  v_deleted_candidates integer := 0;
  v_deleted_jobs integer := 0;
  v_deleted_employees integer := 0;
  v_deleted_targets integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated organization context is required for deletion';
  END IF;

  SELECT user_id INTO v_dataset_owner
  FROM public.uploaded_datasets
  WHERE id = p_dataset_id AND organization_id = v_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dataset was not found in the current organization';
  END IF;

  IF v_dataset_owner <> auth.uid()
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')) THEN
    RAISE EXCEPTION 'You are not authorized to delete this dataset';
  END IF;

  DELETE FROM public.candidates c
  WHERE c.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.dataset_record_links l
      WHERE l.dataset_id = p_dataset_id AND l.entity_type = 'candidates' AND l.record_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dataset_record_links other
      WHERE other.entity_type = 'candidates' AND other.record_id = c.id AND other.dataset_id <> p_dataset_id
    );
  GET DIAGNOSTICS v_deleted_candidates = ROW_COUNT;

  DELETE FROM public.employees e
  WHERE e.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.dataset_record_links l
      WHERE l.dataset_id = p_dataset_id AND l.entity_type = 'employees' AND l.record_id = e.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dataset_record_links other
      WHERE other.entity_type = 'employees' AND other.record_id = e.id AND other.dataset_id <> p_dataset_id
    );
  GET DIAGNOSTICS v_deleted_employees = ROW_COUNT;

  DELETE FROM public.workforce_targets wt
  WHERE wt.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.dataset_record_links l
      WHERE l.dataset_id = p_dataset_id AND l.entity_type = 'workforce_targets' AND l.record_id = wt.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dataset_record_links other
      WHERE other.entity_type = 'workforce_targets' AND other.record_id = wt.id AND other.dataset_id <> p_dataset_id
    );
  GET DIAGNOSTICS v_deleted_targets = ROW_COUNT;

  -- A job is removed only when it has no remaining candidate dependency.
  DELETE FROM public.job_openings j
  WHERE j.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.dataset_record_links l
      WHERE l.dataset_id = p_dataset_id AND l.entity_type = 'job_openings' AND l.record_id = j.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dataset_record_links other
      WHERE other.entity_type = 'job_openings' AND other.record_id = j.id AND other.dataset_id <> p_dataset_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.candidates c WHERE c.job_id = j.id
    );
  GET DIAGNOSTICS v_deleted_jobs = ROW_COUNT;

  DELETE FROM public.uploaded_datasets
  WHERE id = p_dataset_id AND organization_id = v_organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_candidates', v_deleted_candidates,
    'deleted_jobs', v_deleted_jobs,
    'deleted_employees', v_deleted_employees,
    'deleted_targets', v_deleted_targets
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_workspace_dataset(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_workspace_dataset(uuid) TO authenticated;