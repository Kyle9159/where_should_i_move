import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, opts?: { compact?: boolean }): string {
	if (value == null) return "N/A";
	if (opts?.compact && value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(1)}M`;
	}
	if (opts?.compact && value >= 1_000) {
		return `$${(value / 1_000).toFixed(0)}K`;
	}
	return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
	if (value == null) return "N/A";
	return new Intl.NumberFormat("en-US").format(value);
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
	if (value == null) return "N/A";
	return `${value.toFixed(decimals)}%`;
}

export function scoreToGrade(score: number | null | undefined): string {
	if (score == null) return "?";
	if (score >= 90) return "A+";
	if (score >= 80) return "A";
	if (score >= 70) return "B";
	if (score >= 60) return "C";
	if (score >= 50) return "D";
	return "F";
}

export function scoreToColor(score: number | null | undefined): string {
	if (score == null) return "text-muted-foreground";
	if (score >= 80) return "text-emerald-400";
	if (score >= 60) return "text-cyan-400";
	if (score >= 40) return "text-yellow-400";
	return "text-red-400";
}
