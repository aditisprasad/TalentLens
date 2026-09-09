
INSERT INTO public.departments (name, code) VALUES
 ('Engineering','ENG'),('Sales','SAL'),('Customer Support','CS'),('Marketing','MKT'),
 ('Finance','FIN'),('Human Resources','HR'),('Operations','OPS'),('Product','PRD');

INSERT INTO public.recruitment_sources (name, channel_type, cost_per_application) VALUES
 ('LinkedIn','external',42.00),
 ('Employee Referral','internal',12.00),
 ('Job Portal','external',18.00),
 ('Company Website','owned',6.00),
 ('Campus Hiring','external',25.00),
 ('Recruitment Agency','agency',95.00);

-- ---------- EMPLOYEES ----------
WITH base AS (
  SELECT i,
    (abs(hashtext('d'||i))%100) AS dp,
    (abs(hashtext('l'||i))%100) AS lp,
    (abs(hashtext('hd'||i))%2900)+40 AS tenure_days,
    round((2.4 + (abs(hashtext('sat'||i))%260)/100.0)::numeric,1) AS satisfaction,
    round((2.0 + (abs(hashtext('perf'||i))%300)/100.0)::numeric,1) AS perf,
    (abs(hashtext('ot'||i))%32) AS overtime,
    (abs(hashtext('pc'||i))%4) AS promos,
    (abs(hashtext('mc'||i))%4) AS mgr_changes,
    round((3 + (abs(hashtext('wl'||i))%70)/10.0)::numeric,1) AS workload,
    (abs(hashtext('sal'||i))%100) AS salp,
    (abs(hashtext('et'||i))%100) AS etp,
    (abs(hashtext('att'||i))%1000) AS attp,
    (abs(hashtext('fn'||i))%20) AS fn,
    (abs(hashtext('ln'||i))%20) AS ln,
    (abs(hashtext('mg'||i))%10) AS mg,
    (abs(hashtext('ti'||i))%4) AS ti
  FROM generate_series(1,520) i
), b2 AS (
  SELECT *,
    CASE WHEN dp<28 THEN 'Engineering' WHEN dp<43 THEN 'Sales' WHEN dp<56 THEN 'Customer Support'
         WHEN dp<65 THEN 'Marketing' WHEN dp<73 THEN 'Finance' WHEN dp<79 THEN 'Human Resources'
         WHEN dp<91 THEN 'Operations' ELSE 'Product' END AS dept_name,
    CASE WHEN lp<32 THEN 'Bengaluru' WHEN lp<52 THEN 'London' WHEN lp<70 THEN 'New York'
         WHEN lp<82 THEN 'Berlin' WHEN lp<92 THEN 'Singapore' ELSE 'Remote' END AS location,
    (CURRENT_DATE - ((abs(hashtext('hd'||i))%2900)+40)) AS hire_date
  FROM base
), b3 AS (
  SELECT *,
    (attp < (55
      + CASE WHEN dept_name='Customer Support' THEN 95 WHEN dept_name='Sales' THEN 70 WHEN dept_name='Operations' THEN 30 ELSE 0 END
      + CASE WHEN satisfaction < 3.2 THEN 85 ELSE 0 END
      + CASE WHEN overtime > 18 THEN 55 ELSE 0 END
      + CASE WHEN tenure_days BETWEEN 365 AND 900 THEN 65 ELSE 0 END
      + CASE WHEN promos = 0 THEN 40 ELSE 0 END
      + CASE WHEN mgr_changes >= 2 THEN 35 ELSE 0 END)) AND tenure_days > 260 AS exited
  FROM b2
)
INSERT INTO public.employees
 (employee_code, full_name, department_id, job_title, location, employment_type, hire_date, salary,
  manager_name, performance_rating, promotion_count, satisfaction_score, workload_score, overtime_hours,
  manager_changes, attrition_status, exit_date, exit_type, exit_reason)
SELECT
 'EMP-'||lpad(b3.i::text,4,'0'),
 (ARRAY['Aarav','Maya','Liam','Sofia','Noah','Priya','Ethan','Chloe','Omar','Hannah','Lucas','Nina','Arjun','Elena','Marcus','Yuki','Ravi','Clara','Tomas','Ines'])[b3.fn+1]
   ||' '||(ARRAY['Sharma','Novak','Okafor','Bennett','Lindqvist','Rossi','Kim','Dubois','Silva','Haddad','Nakamura','Weber','Patel','Moreau','Andersen','Costa','Ibrahim','Kowalski','Reyes','Tanaka'])[b3.ln+1],
 d.id,
 CASE b3.dept_name
   WHEN 'Engineering' THEN (ARRAY['Software Engineer','Senior Software Engineer','QA Engineer','Engineering Manager'])[b3.ti+1]
   WHEN 'Sales' THEN (ARRAY['Account Executive','Sales Development Rep','Sales Manager','Solutions Consultant'])[b3.ti+1]
   WHEN 'Customer Support' THEN (ARRAY['Support Specialist','Senior Support Specialist','Support Team Lead','Technical Support Engineer'])[b3.ti+1]
   WHEN 'Marketing' THEN (ARRAY['Marketing Associate','Content Strategist','Growth Marketer','Marketing Manager'])[b3.ti+1]
   WHEN 'Finance' THEN (ARRAY['Financial Analyst','Accountant','Controller','FP&A Manager'])[b3.ti+1]
   WHEN 'Human Resources' THEN (ARRAY['HR Generalist','Recruiter','HR Business Partner','People Operations Lead'])[b3.ti+1]
   WHEN 'Operations' THEN (ARRAY['Operations Analyst','Operations Specialist','Logistics Coordinator','Operations Manager'])[b3.ti+1]
   ELSE (ARRAY['Product Manager','Product Designer','Product Analyst','Senior Product Manager'])[b3.ti+1]
 END,
 b3.location,
 CASE WHEN b3.etp < 84 THEN 'Full-time' WHEN b3.etp < 93 THEN 'Contract' ELSE 'Part-time' END,
 b3.hire_date,
 round((CASE b3.dept_name
   WHEN 'Engineering' THEN 92000 WHEN 'Product' THEN 88000 WHEN 'Finance' THEN 76000
   WHEN 'Sales' THEN 71000 WHEN 'Marketing' THEN 66000 WHEN 'Human Resources' THEN 62000
   WHEN 'Operations' THEN 58000 ELSE 48000 END
   * (0.82 + b3.salp/300.0)
   * (1 + (b3.tenure_days/365.0) * 0.035))::numeric, 2),
 (ARRAY['Dana Whitfield','Peter Lindgren','Amara Diallo','Jonas Keller','Rina Mehta','Victor Alvarez','Sara Lindberg','Ken Osei','Lucia Ferrari','Tom Braddock'])[b3.mg+1],
 b3.perf, b3.promos, b3.satisfaction, b3.workload, b3.overtime, b3.mgr_changes,
 CASE WHEN b3.exited THEN 'exited' ELSE 'active' END,
 CASE WHEN b3.exited THEN (CURRENT_DATE - (abs(hashtext('ed'||b3.i)) % (b3.tenure_days - 200))) ELSE NULL END,
 CASE WHEN b3.exited THEN (CASE WHEN (abs(hashtext('xt'||b3.i))%100) < 78 THEN 'voluntary' ELSE 'involuntary' END) ELSE NULL END,
 CASE WHEN b3.exited THEN (ARRAY['Better compensation elsewhere','Career growth','Work-life balance','Relocation','Manager relationship','Performance','Role restructuring','Higher education'])[(abs(hashtext('xr'||b3.i))%8)+1] ELSE NULL END
FROM b3 JOIN public.departments d ON d.name = b3.dept_name;

-- ---------- JOB OPENINGS ----------
WITH j AS (
  SELECT i,
    (abs(hashtext('jd'||i))%100) AS dp,
    (abs(hashtext('jl'||i))%100) AS lp,
    (abs(hashtext('jo'||i))%620)+15 AS age_days,
    (abs(hashtext('js'||i))%100) AS sp,
    (abs(hashtext('jt'||i))%4) AS ti,
    (abs(hashtext('jh'||i))%3)+1 AS hires
  FROM generate_series(1,60) i
), j2 AS (
  SELECT *,
    CASE WHEN dp<30 THEN 'Engineering' WHEN dp<45 THEN 'Sales' WHEN dp<57 THEN 'Customer Support'
         WHEN dp<66 THEN 'Marketing' WHEN dp<73 THEN 'Finance' WHEN dp<78 THEN 'Human Resources'
         WHEN dp<90 THEN 'Operations' ELSE 'Product' END AS dept_name,
    CASE WHEN lp<32 THEN 'Bengaluru' WHEN lp<52 THEN 'London' WHEN lp<70 THEN 'New York'
         WHEN lp<82 THEN 'Berlin' WHEN lp<92 THEN 'Singapore' ELSE 'Remote' END AS location,
    (CURRENT_DATE - ((abs(hashtext('jo'||i))%620)+15)) AS opening_date
  FROM j
)
INSERT INTO public.job_openings (job_code, job_title, department_id, location, employment_type, opening_date, closing_date, status, target_hires)
SELECT 'JOB-'||lpad(j2.i::text,3,'0'),
  CASE j2.dept_name
   WHEN 'Engineering' THEN (ARRAY['Software Engineer','Senior Software Engineer','QA Engineer','Engineering Manager'])[j2.ti+1]
   WHEN 'Sales' THEN (ARRAY['Account Executive','Sales Development Rep','Sales Manager','Solutions Consultant'])[j2.ti+1]
   WHEN 'Customer Support' THEN (ARRAY['Support Specialist','Senior Support Specialist','Support Team Lead','Technical Support Engineer'])[j2.ti+1]
   WHEN 'Marketing' THEN (ARRAY['Marketing Associate','Content Strategist','Growth Marketer','Marketing Manager'])[j2.ti+1]
   WHEN 'Finance' THEN (ARRAY['Financial Analyst','Accountant','Controller','FP&A Manager'])[j2.ti+1]
   WHEN 'Human Resources' THEN (ARRAY['HR Generalist','Recruiter','HR Business Partner','People Operations Lead'])[j2.ti+1]
   WHEN 'Operations' THEN (ARRAY['Operations Analyst','Operations Specialist','Logistics Coordinator','Operations Manager'])[j2.ti+1]
   ELSE (ARRAY['Product Manager','Product Designer','Product Analyst','Senior Product Manager'])[j2.ti+1]
  END,
  d.id, j2.location, 'Full-time', j2.opening_date,
  CASE WHEN j2.sp < 55 THEN (j2.opening_date + ((abs(hashtext('jc'||j2.i))%70)+25)) ELSE NULL END,
  CASE WHEN j2.sp < 40 THEN 'filled' WHEN j2.sp < 55 THEN 'closed' WHEN j2.sp < 62 THEN 'on_hold' ELSE 'open' END,
  j2.hires
FROM j2 JOIN public.departments d ON d.name = j2.dept_name;

-- ---------- CANDIDATES ----------
WITH jobs AS (SELECT id, opening_date, row_number() OVER (ORDER BY job_code) - 1 AS rn, (SELECT count(*) FROM public.job_openings) AS n FROM public.job_openings),
src AS (SELECT id, name, cost_per_application, row_number() OVER (ORDER BY name) - 1 AS rn FROM public.recruitment_sources),
c AS (
  SELECT i,
    (abs(hashtext('cj'||i)) % (SELECT n FROM jobs LIMIT 1)) AS jrn,
    (abs(hashtext('cs'||i)) % 100) AS sp,
    ((abs(hashtext('cp'||i)) % 1000) / 1000.0) AS p,
    (abs(hashtext('cd'||i)) % 60) AS days_after_open,
    (abs(hashtext('cf'||i)) % 20) AS fn,
    (abs(hashtext('cl'||i)) % 20) AS ln,
    (abs(hashtext('ch'||i)) % 45) + 14 AS cycle_days
  FROM generate_series(1,1400) i
), c2 AS (
  SELECT c.*,
    CASE WHEN sp<26 THEN 'LinkedIn' WHEN sp<41 THEN 'Employee Referral' WHEN sp<60 THEN 'Job Portal'
         WHEN sp<74 THEN 'Company Website' WHEN sp<87 THEN 'Campus Hiring' ELSE 'Recruitment Agency' END AS source_name
  FROM c
), c3 AS (
  SELECT c2.*, jobs.id AS job_id, jobs.opening_date,
    CASE c2.source_name WHEN 'Employee Referral' THEN 1.55 WHEN 'Recruitment Agency' THEN 1.2
      WHEN 'LinkedIn' THEN 1.05 WHEN 'Company Website' THEN 1.0 WHEN 'Campus Hiring' THEN 0.85 ELSE 0.75 END AS q
  FROM c2 JOIN jobs ON jobs.rn = c2.jrn
), c4 AS (
  SELECT c3.*,
    CASE WHEN p < 0.115*q THEN 'joined' WHEN p < 0.135*q THEN 'accepted' WHEN p < 0.175*q THEN 'offered'
         WHEN p < 0.34*q THEN 'interviewed' WHEN p < 0.62*q THEN 'screened' ELSE 'applied' END AS stage,
    (c3.opening_date + c3.days_after_open) AS application_date
  FROM c3
)
INSERT INTO public.candidates
 (candidate_code, full_name, job_id, source_id, application_date, stage, screening_status, interview_status,
  offer_status, joining_status, joined_date, rejection_reason, hiring_cost)
SELECT 'CAND-'||lpad(c4.i::text,4,'0'),
 (ARRAY['Aarav','Maya','Liam','Sofia','Noah','Priya','Ethan','Chloe','Omar','Hannah','Lucas','Nina','Arjun','Elena','Marcus','Yuki','Ravi','Clara','Tomas','Ines'])[c4.fn+1]
   ||' '||(ARRAY['Sharma','Novak','Okafor','Bennett','Lindqvist','Rossi','Kim','Dubois','Silva','Haddad','Nakamura','Weber','Patel','Moreau','Andersen','Costa','Ibrahim','Kowalski','Reyes','Tanaka'])[c4.ln+1],
 c4.job_id, s.id,
 LEAST(c4.application_date, CURRENT_DATE - 5),
 c4.stage,
 CASE WHEN c4.stage = 'applied' THEN 'rejected' ELSE 'passed' END,
 CASE WHEN c4.stage IN ('applied','screened') THEN 'not_started' WHEN c4.stage='interviewed' THEN 'completed' ELSE 'passed' END,
 CASE WHEN c4.stage IN ('applied','screened','interviewed') THEN 'none' WHEN c4.stage='offered' THEN 'pending' ELSE 'accepted' END,
 CASE WHEN c4.stage='joined' THEN 'joined' WHEN c4.stage='accepted' THEN 'pending' ELSE 'none' END,
 CASE WHEN c4.stage='joined' THEN LEAST(c4.application_date + c4.cycle_days, CURRENT_DATE) ELSE NULL END,
 CASE WHEN c4.stage='applied' THEN (ARRAY['Skills mismatch','Insufficient experience','Location constraint','Salary expectation','Incomplete application'])[(abs(hashtext('rr'||c4.i))%5)+1]
      WHEN c4.stage='screened' THEN (ARRAY['Failed technical screen','Withdrew','Better internal candidate'])[(abs(hashtext('rs'||c4.i))%3)+1]
      ELSE NULL END,
 round((s.cost_per_application * (CASE WHEN c4.stage='joined' THEN 14 WHEN c4.stage IN ('accepted','offered') THEN 6 WHEN c4.stage='interviewed' THEN 3 ELSE 1 END))::numeric,2)
FROM c4 JOIN public.recruitment_sources s ON s.name = c4.source_name;

-- ---------- WORKFORCE TARGETS ----------
INSERT INTO public.workforce_targets (department_id, period, required_headcount)
SELECT d.id, to_char(CURRENT_DATE,'YYYY')||'-Q'||to_char(CURRENT_DATE,'Q'),
  GREATEST(1, round(count(e.id) * (CASE d.name WHEN 'Engineering' THEN 1.22 WHEN 'Customer Support' THEN 1.18
    WHEN 'Sales' THEN 1.12 WHEN 'Product' THEN 1.10 WHEN 'Operations' THEN 0.98
    WHEN 'Marketing' THEN 1.04 WHEN 'Finance' THEN 0.96 ELSE 1.0 END))::int)
FROM public.departments d
LEFT JOIN public.employees e ON e.department_id = d.id AND e.attrition_status = 'active'
GROUP BY d.id, d.name;
