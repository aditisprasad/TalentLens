import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { trainAttritionRisk, type RiskModel } from "@/lib/analytics/compute";
import type { EmployeeRow } from "@/lib/analytics/types";

export type MlRiskPayload = {
  employees: EmployeeRow[];
};

type MlPrediction = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  probability: number;
  risk_category: "LOW" | "MEDIUM" | "HIGH";
  feature_contributions?: Array<{
    feature: string;
    contribution: number;
    direction: "higher_risk" | "lower_risk";
  }>;
};

type MlRiskResponse = {
  status: "ok" | "insufficient_data";
  message?: string;
  model?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    roc_auc?: number | null;
    class_balance?: number;
    feature_count?: number;
  };
  predictions?: MlPrediction[];
};

function mapRiskBand(probability: number): "Low" | "Medium" | "High" {
  if (probability >= 55) return "High";
  if (probability >= 32) return "Medium";
  return "Low";
}

function normalizeFeatureImportance(predictions: MlPrediction[]): {
  feature: string;
  weight: number;
  direction: "increases" | "reduces";
}[] {
  const contributionMap = new Map<string, number[]>();

  predictions.forEach((prediction) => {
    (prediction.feature_contributions ?? []).forEach((feature) => {
      const key = feature.feature;
      const list = contributionMap.get(key) ?? [];
      list.push(Math.abs(feature.contribution));
      contributionMap.set(key, list);
    });
  });

  return [...contributionMap.entries()]
    .map(([feature, weights]) => ({
      feature,
      weight: weights.reduce((sum, value) => sum + value, 0) / weights.length,
      direction: "increases" as const,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      weight: Number(entry.weight.toFixed(3)),
      direction: (entry.weight > 0 ? "increases" : "reduces") as "increases" | "reduces",
    }));
}

function convertMlResponse(employees: EmployeeRow[], payload: MlRiskResponse): RiskModel {
  const fallback = trainAttritionRisk(employees);

  if (!payload || payload.status !== "ok" || !Array.isArray(payload.predictions)) {
    return fallback;
  }

  const predictionMap = new Map<string, MlPrediction>();
  payload.predictions.forEach((prediction) => {
    const employeeKey = prediction.employee_code || prediction.employee_id;
    if (employeeKey) predictionMap.set(employeeKey, prediction);
  });

  const activeEmployees = employees.filter((employee) => employee.attrition_status === "active");
  const scores = activeEmployees
    .map((employee) => {
      const rawPrediction = predictionMap.get(employee.employee_code) ?? predictionMap.get(employee.id);
      const probability = rawPrediction ? Number(rawPrediction.probability) * 100 : 0;
      return {
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        job_title: employee.job_title,
        tenure: Number((employee.hire_date ? Math.max(0, (Date.now() - new Date(employee.hire_date).getTime()) / 31557600000) : 0).toFixed(2)),
        satisfaction: Number(employee.satisfaction_score ?? 0),
        overtime: Number(employee.overtime_hours ?? 0),
        probability: Number(probability.toFixed(1)),
        band: mapRiskBand(probability),
      };
    })
    .sort((a, b) => b.probability - a.probability);

  const baseRate = employees.length ? (employees.filter((employee) => employee.attrition_status === "exited").length / employees.length) * 100 : 0;

  return {
    trained: true,
    sampleSize: employees.length,
    accuracy: Number((payload.model?.accuracy ?? fallback.accuracy ?? 0) * 100 || 0),
    baseRate: Number(baseRate.toFixed(1)),
    importance: normalizeFeatureImportance(payload.predictions),
    scores,
    bands: (['Low', 'Medium', 'High'] as const).map((name) => ({
      name,
      value: scores.filter((score) => score.band === name).length,
    })),
  };
}

export const trainAttritionRiskServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: MlRiskPayload) => data)
  .handler(async ({ data }): Promise<RiskModel> => {
    const serviceUrl =
      process.env["TALENTLENS_ML_SERVICE_URL"] ||
      process.env["ML_SERVICE_URL"] ||
      "http://localhost:8000";

    if (!data.employees || data.employees.length === 0) {
      return trainAttritionRisk([]);
    }

    try {
      const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/train-and-predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: data.employees.map((employee) => ({
            employee_id: employee.id,
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            department: employee.department,
            job_title: employee.job_title,
            location: employee.location,
            employment_type: employee.employment_type,
            tenure_years: Number(employee.hire_date ? (Date.now() - new Date(employee.hire_date).getTime()) / 31557600000 : 0),
            salary: Number(employee.salary ?? 0),
            performance_rating: employee.performance_rating ?? 3,
            satisfaction_score: employee.satisfaction_score ?? 3,
            workload_score: employee.workload_score ?? 5,
            overtime_hours: employee.overtime_hours ?? 0,
            promotion_count: employee.promotion_count ?? 0,
            manager_changes: employee.manager_changes ?? 0,
            attrition_label: employee.attrition_status === "exited" ? 1 : 0,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service responded with ${response.status}`);
      }

      const payload = (await response.json()) as MlRiskResponse;
      return convertMlResponse(data.employees, payload);
    } catch (error) {
      console.warn("Falling back to legacy attrition-risk model because the Python ML service is unavailable:", error);
      return trainAttritionRisk(data.employees);
    }
  });
