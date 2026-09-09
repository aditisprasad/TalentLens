
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- ============ DEPARTMENTS ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ EMPLOYEES ============
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  location text NOT NULL,
  employment_type text NOT NULL DEFAULT 'Full-time',
  hire_date date NOT NULL,
  salary numeric(12,2) NOT NULL DEFAULT 0,
  manager_name text,
  performance_rating numeric(3,1),
  promotion_count int NOT NULL DEFAULT 0,
  satisfaction_score numeric(3,1),
  workload_score numeric(3,1),
  overtime_hours numeric(6,1) NOT NULL DEFAULT 0,
  manager_changes int NOT NULL DEFAULT 0,
  attrition_status text NOT NULL DEFAULT 'active',
  exit_date date,
  exit_type text,
  exit_reason text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_attrition_chk CHECK (attrition_status IN ('active','exited')),
  CONSTRAINT employees_exit_chk CHECK (attrition_status = 'active' OR exit_date IS NOT NULL)
);
CREATE INDEX idx_employees_dept ON public.employees(department_id);
CREATE INDEX idx_employees_hire ON public.employees(hire_date);
CREATE INDEX idx_employees_exit ON public.employees(exit_date);
CREATE INDEX idx_employees_status ON public.employees(attrition_status);
CREATE INDEX idx_employees_location ON public.employees(location);

-- ============ RECRUITMENT SOURCES ============
CREATE TABLE public.recruitment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  channel_type text NOT NULL DEFAULT 'external',
  cost_per_application numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ JOB OPENINGS ============
CREATE TABLE public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code text NOT NULL UNIQUE,
  job_title text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location text NOT NULL,
  employment_type text NOT NULL DEFAULT 'Full-time',
  opening_date date NOT NULL,
  closing_date date,
  status text NOT NULL DEFAULT 'open',
  target_hires int NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_status_chk CHECK (status IN ('open','closed','on_hold','filled'))
);
CREATE INDEX idx_jobs_dept ON public.job_openings(department_id);
CREATE INDEX idx_jobs_status ON public.job_openings(status);
CREATE INDEX idx_jobs_open_date ON public.job_openings(opening_date);

-- ============ CANDIDATES / APPLICATIONS ============
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  job_id uuid REFERENCES public.job_openings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.recruitment_sources(id) ON DELETE SET NULL,
  application_date date NOT NULL,
  stage text NOT NULL DEFAULT 'applied',
  screening_status text NOT NULL DEFAULT 'pending',
  interview_status text NOT NULL DEFAULT 'not_started',
  offer_status text NOT NULL DEFAULT 'none',
  joining_status text NOT NULL DEFAULT 'none',
  joined_date date,
  rejection_reason text,
  hiring_cost numeric(10,2) NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_stage_chk CHECK (stage IN ('applied','screened','interviewed','offered','accepted','joined'))
);
CREATE INDEX idx_cand_job ON public.candidates(job_id);
CREATE INDEX idx_cand_source ON public.candidates(source_id);
CREATE INDEX idx_cand_stage ON public.candidates(stage);
CREATE INDEX idx_cand_appdate ON public.candidates(application_date);

-- ============ WORKFORCE TARGETS ============
CREATE TABLE public.workforce_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  period text NOT NULL,
  required_headcount int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, period)
);

-- ============ INSIGHT REPORTS ============
CREATE TABLE public.insight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  report_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_user ON public.insight_reports(user_id);

-- ============ UPLOADED DATASETS ============
CREATE TABLE public.uploaded_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  target_entity text NOT NULL,
  row_count int NOT NULL DEFAULT 0,
  imported_rows int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  validation_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dataset_status_chk CHECK (status IN ('uploaded','validated','imported','failed'))
);
CREATE INDEX idx_datasets_user ON public.uploaded_datasets(user_id);

CREATE TABLE public.column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  target_entity text NOT NULL,
  source_column text NOT NULL,
  target_column text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_entity, source_column)
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_datasets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.column_mappings TO authenticated;
GRANT ALL ON public.departments, public.employees, public.recruitment_sources, public.job_openings,
  public.candidates, public.workforce_targets, public.insight_reports, public.uploaded_datasets,
  public.column_mappings TO service_role;

-- ============ RLS ============
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "write departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'));

CREATE POLICY "read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "write employees" ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'));

CREATE POLICY "read sources" ON public.recruitment_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "write sources" ON public.recruitment_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'));

CREATE POLICY "read jobs" ON public.job_openings FOR SELECT TO authenticated USING (true);
CREATE POLICY "write jobs" ON public.job_openings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter'));

CREATE POLICY "read candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "write candidates" ON public.candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter'));

CREATE POLICY "read targets" ON public.workforce_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "write targets" ON public.workforce_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager'));

CREATE POLICY "own reports" ON public.insight_reports FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own datasets" ON public.uploaded_datasets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own mappings" ON public.column_mappings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
