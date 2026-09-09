-- Tenant isolation for all business data. Existing rows are assigned to one persisted workspace;
-- this migration does not reseed or delete any business records.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'analyst',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organizations, public.organization_members TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organizations (name, slug)
VALUES ('TalentLens Workspace', 'talentlens-workspace')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;

DO $$
DECLARE
  workspace_id uuid;
BEGIN
  SELECT id INTO workspace_id
  FROM public.organizations
  WHERE slug = 'talentlens-workspace';

  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT workspace_id, p.user_id, COALESCE(ur.role, 'analyst'::public.app_role)
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT role
    FROM public.user_roles
    WHERE user_id = p.user_id
    ORDER BY created_at
    LIMIT 1
  ) ur ON true
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.recruitment_sources ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.workforce_targets ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.uploaded_datasets ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.insight_reports ADD COLUMN IF NOT EXISTS organization_id uuid;
  ALTER TABLE public.column_mappings ADD COLUMN IF NOT EXISTS organization_id uuid;

  UPDATE public.departments SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.recruitment_sources SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.employees SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.job_openings SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.candidates SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.workforce_targets SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.uploaded_datasets SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.insight_reports SET organization_id = workspace_id WHERE organization_id IS NULL;
  UPDATE public.column_mappings SET organization_id = workspace_id WHERE organization_id IS NULL;

  ALTER TABLE public.departments ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.recruitment_sources ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.employees ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.job_openings ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.candidates ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.workforce_targets ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.uploaded_datasets ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.insight_reports ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
  ALTER TABLE public.column_mappings ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();

  ALTER TABLE public.departments ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.recruitment_sources ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.employees ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.job_openings ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.candidates ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.workforce_targets ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.uploaded_datasets ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.insight_reports ALTER COLUMN organization_id SET NOT NULL;
  ALTER TABLE public.column_mappings ALTER COLUMN organization_id SET NOT NULL;
END $$;

ALTER TABLE public.departments
  ADD CONSTRAINT departments_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.recruitment_sources
  ADD CONSTRAINT sources_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.employees
  ADD CONSTRAINT employees_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.job_openings
  ADD CONSTRAINT jobs_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.workforce_targets
  ADD CONSTRAINT targets_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.uploaded_datasets
  ADD CONSTRAINT datasets_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.insight_reports
  ADD CONSTRAINT reports_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.column_mappings
  ADD CONSTRAINT mappings_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_sources_org ON public.recruitment_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.job_openings(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_org ON public.candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_targets_org ON public.workforce_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_datasets_org ON public.uploaded_datasets(organization_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing int;
  workspace_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT count(*) INTO existing FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN existing = 0 THEN 'admin'::public.app_role ELSE 'hr_manager'::public.app_role END)
  ON CONFLICT DO NOTHING;

  SELECT id INTO workspace_id FROM public.organizations WHERE slug = 'talentlens-workspace';
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (workspace_id, NEW.id, CASE WHEN existing = 0 THEN 'admin'::public.app_role ELSE 'hr_manager'::public.app_role END)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "read organizations" ON public.organizations;
CREATE POLICY "read organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_organization_id());

DROP POLICY IF EXISTS "read organization memberships" ON public.organization_members;
CREATE POLICY "read organization memberships" ON public.organization_members
  FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "read departments" ON public.departments;
CREATE POLICY "read departments" ON public.departments FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write departments" ON public.departments;
CREATE POLICY "write departments" ON public.departments FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')));

DROP POLICY IF EXISTS "read sources" ON public.recruitment_sources;
CREATE POLICY "read sources" ON public.recruitment_sources FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write sources" ON public.recruitment_sources;
CREATE POLICY "write sources" ON public.recruitment_sources FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')));

DROP POLICY IF EXISTS "read employees" ON public.employees;
CREATE POLICY "read employees" ON public.employees FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write employees" ON public.employees;
CREATE POLICY "write employees" ON public.employees FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')));

DROP POLICY IF EXISTS "read jobs" ON public.job_openings;
CREATE POLICY "read jobs" ON public.job_openings FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write jobs" ON public.job_openings;
CREATE POLICY "write jobs" ON public.job_openings FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter')));

DROP POLICY IF EXISTS "read candidates" ON public.candidates;
CREATE POLICY "read candidates" ON public.candidates FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write candidates" ON public.candidates;
CREATE POLICY "write candidates" ON public.candidates FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager') OR public.has_role(auth.uid(),'recruiter')));

DROP POLICY IF EXISTS "read targets" ON public.workforce_targets;
CREATE POLICY "read targets" ON public.workforce_targets FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
DROP POLICY IF EXISTS "write targets" ON public.workforce_targets;
CREATE POLICY "write targets" ON public.workforce_targets FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr_manager')));

DROP POLICY IF EXISTS "own datasets" ON public.uploaded_datasets;
CREATE POLICY "own datasets" ON public.uploaded_datasets FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND user_id = auth.uid())
  WITH CHECK (organization_id = public.current_organization_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "own reports" ON public.insight_reports;
CREATE POLICY "own reports" ON public.insight_reports FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND user_id = auth.uid())
  WITH CHECK (organization_id = public.current_organization_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "own mappings" ON public.column_mappings;
CREATE POLICY "own mappings" ON public.column_mappings FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND user_id = auth.uid())
  WITH CHECK (organization_id = public.current_organization_id() AND user_id = auth.uid());
