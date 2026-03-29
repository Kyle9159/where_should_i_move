"use client";

import { useEffect, useState } from "react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

interface Props {
	filterScores: Record<string, number | null | undefined>;
	fallbackScore: number;
	size?: "sm" | "md" | "lg";
}

/** Computes weighted match % using only keys the user explicitly weighted. */
function computeMatch(
	scores: Record<string, number | null | undefined>,
	weights: Record<string, number>,
): number {
	let weightedSum = 0;
	let totalWeight = 0;

	for (const [key, w] of Object.entries(weights)) {
		if (!w) continue;
		const s = scores[key] ?? 50;
		weightedSum += (s ?? 50) * w;
		totalWeight += w;
	}

	if (totalWeight === 0) return -1; // sentinel: no weights set
	return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
}

export function PersonalizedMatchBadge({ filterScores, fallbackScore, size = "md" }: Props) {
	const [score, setScore] = useState<number>(fallbackScore);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("quiz_weights");
			if (!raw) return;
			const weights = JSON.parse(atob(raw)) as Record<string, number>;
			const match = computeMatch(filterScores, weights);
			if (match >= 0) setScore(match);
		} catch {
			// localStorage unavailable or corrupted weights — keep fallback
		}
	}, [filterScores]);

	return <MatchScoreBadge score={score} size={size} />;
}
