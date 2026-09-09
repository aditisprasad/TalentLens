import { exportCsv, exportXlsx, toCsv } from "@/lib/export";

export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
    const safeFilename = filename.endsWith(".csv") ? filename.slice(0, -4) : filename;
    exportCsv(rows as Record<string, string | number | null | undefined>[], safeFilename);
}

export { exportCsv, exportXlsx, toCsv };
