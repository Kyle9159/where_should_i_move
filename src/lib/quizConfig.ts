import type { FilterWeights } from "./ranking";

export interface QuizAnswers {
	q1_priorities: string[]; // top 3 from 8 options
	q2_housing: "buy" | "rent" | "flexible";
	q3_climate: "warm" | "four-seasons" | "mild" | "any";
	q4_children: "have-now" | "planning" | "no";
	q5_walkability: number; // 0–10 (0=drive everywhere, 10=walk everywhere)
	q6_work: "remote" | "find-local" | "self-employed" | "retired";
	q7_outdoors: string[]; // multi-select
	q8_budget: { min: number; max: number };
}

export type QuizStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const QUIZ_QUESTIONS: Record<QuizStep, { title: string; subtitle: string; type: "multi-card" | "single-card" | "slider" | "range" | "multi-select" }> = {
	1: {
		title: "What matters most to you in a new home?",
		subtitle: "Pick your top 3 priorities",
		type: "multi-card",
	},
	2: {
		title: "What's your housing situation?",
		subtitle: "This helps us weight cost-of-living factors",
		type: "single-card",
	},
	3: {
		title: "What's your ideal climate?",
		subtitle: "Sunshine, snow, or somewhere in between",
		type: "single-card",
	},
	4: {
		title: "Do you have or plan to have children?",
		subtitle: "We'll factor in schools, parks, and family amenities",
		type: "single-card",
	},
	5: {
		title: "How important is being able to walk places?",
		subtitle: "Drag to set your preference",
		type: "slider",
	},
	6: {
		title: "What's your work situation?",
		subtitle: "This shapes which job market factors matter",
		type: "single-card",
	},
	7: {
		title: "What kind of outdoor access matters to you?",
		subtitle: "Pick everything that resonates",
		type: "multi-select",
	},
	8: {
		title: "What's your monthly housing budget?",
		subtitle: "Rent or mortgage, all-in",
		type: "range",
	},
};

export const Q1_OPTIONS = [
	{ id: "affordability", label: "Affordability", icon: "💰", weights: { scoreCostOfLiving: 0.12, scoreMedianHomePrice: 0.10, scoreMedianRent: 0.08 } },
	{ id: "jobs", label: "Job Market", icon: "💼", weights: { scoreJobMarket: 0.12, scoreUnemployment: 0.08, scoreIncomeGrowth: 0.06 } },
	{ id: "climate", label: "Climate", icon: "☀️", weights: { scoreWeather: 0.10, scoreSunnyDays: 0.08, scoreAirQuality: 0.05 } },
	{ id: "schools", label: "Schools", icon: "🎓", weights: { scoreSchoolQuality: 0.12, scoreHighSchool: 0.08, scoreGraduationRate: 0.05 } },
	{ id: "lifestyle", label: "Lifestyle", icon: "🎭", weights: { scoreRestaurants: 0.06, scoreNightlife: 0.05, scoreArtsAndCulture: 0.06 } },
	{ id: "safety", label: "Safety", icon: "🛡️", weights: { scoreViolentCrime: 0.12, scorePropertyCrime: 0.08 } },
	{ id: "nature", label: "Nature Access", icon: "🏔️", weights: { scoreTrails: 0.08, scoreNearMountains: 0.07, scoreNearOcean: 0.07, scoreNationalPark: 0.05 } },
	{ id: "community", label: "Diverse Community", icon: "🤝", weights: { scoreDiversity: 0.10, scoreLgbtqFriendly: 0.07 } },
] as const;

export const Q7_OPTIONS = [
	{ id: "ocean", label: "Ocean Beaches", icon: "🌊", weights: { scoreNearOcean: 0.12 } },
	{ id: "mountains", label: "Mountains", icon: "⛰️", weights: { scoreNearMountains: 0.12 } },
	{ id: "hiking", label: "Hiking Trails", icon: "🥾", weights: { scoreTrails: 0.10 } },
	{ id: "parks", label: "City Parks", icon: "🌳", weights: { scoreGreenSpace: 0.08 } },
	{ id: "national-parks", label: "National Parks", icon: "🦌", weights: { scoreNationalPark: 0.10 } },
	{ id: "lakes", label: "Lakes & Rivers", icon: "🏞️", weights: { scoreNearLake: 0.10 } },
	{ id: "cycling", label: "Cycling", icon: "🚴", weights: { scoreBikeability: 0.08 } },
	{ id: "none", label: "Not important", icon: "🏙️", weights: {} },
] as const;

/**
 * Builds deterministic filter weights from quiz answers.
 * Used as a fallback if Grok call fails.
 */
export function buildDeterministicWeights(answers: QuizAnswers): FilterWeights {
	const weights: FilterWeights = {};

	// Q1: priorities (each selection multiplies category weights)
	for (const priorityId of answers.q1_priorities.slice(0, 3)) {
		const option = Q1_OPTIONS.find((o) => o.id === priorityId);
		if (!option) continue;
		for (const [key, val] of Object.entries(option.weights)) {
			const k = key as keyof FilterWeights;
			weights[k] = (weights[k] ?? 0) + val / answers.q1_priorities.length;
		}
	}

	// Q2: housing
	if (answers.q2_housing === "buy") {
		weights.scoreMedianHomePrice = (weights.scoreMedianHomePrice ?? 0) + 0.08;
		weights.scoreAffordabilityIndex = (weights.scoreAffordabilityIndex ?? 0) + 0.05;
	} else if (answers.q2_housing === "rent") {
		weights.scoreMedianRent = (weights.scoreMedianRent ?? 0) + 0.08;
	}

	// Q3: climate
	if (answers.q3_climate === "warm") {
		weights.scoreWarmClimate = (weights.scoreWarmClimate ?? 0) + 0.08;
		weights.scoreSunnyDays = (weights.scoreSunnyDays ?? 0) + 0.05;
	} else if (answers.q3_climate === "mild") {
		weights.scoreWeather = (weights.scoreWeather ?? 0) + 0.06;
		weights.scoreLowHumidity = (weights.scoreLowHumidity ?? 0) + 0.04;
	} else if (answers.q3_climate === "four-seasons") {
		weights.scoreWeather = (weights.scoreWeather ?? 0) + 0.05;
	}

	// Q4: children
	if (answers.q4_children !== "no") {
		weights.scoreSchoolQuality = (weights.scoreSchoolQuality ?? 0) + 0.08;
		weights.scoreChildcare = (weights.scoreChildcare ?? 0) + 0.04;
	}

	// Q5: walkability (0-10 → 0-0.12)
	const walkWeight = (answers.q5_walkability / 10) * 0.12;
	weights.scoreWalkability = (weights.scoreWalkability ?? 0) + walkWeight;
	if (answers.q5_walkability >= 6) {
		weights.scoreTransit = (weights.scoreTransit ?? 0) + walkWeight * 0.5;
	}

	// Q6: work
	if (answers.q6_work === "remote") {
		weights.scoreBroadband = (weights.scoreBroadband ?? 0) + 0.07;
	} else if (answers.q6_work === "find-local") {
		weights.scoreJobMarket = (weights.scoreJobMarket ?? 0) + 0.08;
		weights.scoreUnemployment = (weights.scoreUnemployment ?? 0) + 0.06;
	} else if (answers.q6_work === "retired") {
		weights.scoreHealthcare = (weights.scoreHealthcare ?? 0) + 0.08;
	}

	// Q7: outdoors
	for (const outdoorId of answers.q7_outdoors) {
		const option = Q7_OPTIONS.find((o) => o.id === outdoorId);
		if (!option) continue;
		for (const [key, val] of Object.entries(option.weights)) {
			const k = key as keyof FilterWeights;
			weights[k] = (weights[k] ?? 0) + val / Math.max(answers.q7_outdoors.length, 1);
		}
	}

	// Always add baseline safety weight
	weights.scoreViolentCrime = (weights.scoreViolentCrime ?? 0) + 0.05;

	// Normalize to sum to 1.0
	const total = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
	if (total === 0) return weights;
	return Object.fromEntries(
		Object.entries(weights).map(([k, v]) => [k, (v ?? 0) / total]),
	) as FilterWeights;
}
