import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a monetary value in INR using Indian number grouping (Lakh/Crore) */
export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "₹0";
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val)
  );
}
