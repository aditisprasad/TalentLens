import type { Dataset } from "./analytics/types";

/**
 * Synthetic business-data generation is intentionally disabled.
 * TalentLens must only use data uploaded by the authenticated user.
 */
export function generateDemoDataset(): Dataset {
    throw new Error("Synthetic business data generation is disabled. Upload your own CSV/XLSX data instead.");
}
