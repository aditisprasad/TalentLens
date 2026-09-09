export type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  job_title: string;
  location: string;
  employment_type: string;
  hire_date: string;
  salary: number;
  manager_name: string | null;
  performance_rating: number | null;
  promotion_count: number;
  satisfaction_score: number | null;
  workload_score: number | null;
  overtime_hours: number;
  manager_changes: number;
  attrition_status: "active" | "exited";
  exit_date: string | null;
  exit_type: string | null;
  exit_reason: string | null;
};

export type CandidateRow = {
  id: string;
  candidate_code: string;
  full_name: string;
  job_title: string;
  department: string;
  location: string;
  source: string;
  application_date: string;
  stage: "applied" | "screened" | "interviewed" | "offered" | "accepted" | "joined";
  joined_date: string | null;
  hiring_cost: number;
  rejection_reason: string | null;
};

export type JobRow = {
  id: string;
  job_code: string;
  job_title: string;
  department: string;
  location: string;
  employment_type: string;
  status: "open" | "closed" | "on_hold" | "filled";
  opening_date: string;
  closing_date: string | null;
  target_hires: number;
};

export type TargetRow = {
  department: string;
  period: string;
  required_headcount: number;
};

export type Dataset = {
  employees: EmployeeRow[];
  candidates: CandidateRow[];
  jobs: JobRow[];
  targets: TargetRow[];
};

export type Filters = {
  dateFrom?: string | null;
  dateTo?: string | null;
  department?: string | null;
  location?: string | null;
  jobRole?: string | null;
  employmentType?: string | null;
  source?: string | null;
};

export type Kpi = {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "days" | "currency";
  previous: number | null;
  deltaDirection: "up" | "down" | "flat";
  goodDirection: "up" | "down";
  context: string;
};
