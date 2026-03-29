import type { CityFilterScores } from "@/db/schema";

export type FilterWeightKey = keyof Omit<CityFilterScores, "id" | "cityId" | "updatedAt">;

export type FilterWeights = Partial<Record<FilterWeightKey, number>>;

export interface RankedCity {
	cityId: string;
	slug: string;
	name: string;
	stateId: string;
	matchPct: number;
	categoryScores: CategoryScores;
}

export interface CategoryScores {
	essentials: number;
	lifestyle: number;
	practical: number;
	family: number;
	nature: number;
}

// Maps each score column to its category
export const SCORE_CATEGORIES: Record<string, keyof CategoryScores> = {
	scoreMedianHomePrice: "essentials",
	scoreMedianRent: "essentials",
	scorePriceToRent: "essentials",
	scoreCostOfLiving: "essentials",
	scoreJobMarket: "essentials",
	scoreUnemployment: "essentials",
	scoreIncomeGrowth: "essentials",
	scoreMedianIncome: "essentials",
	scoreTaxBurden: "essentials",
	scoreAffordabilityIndex: "essentials",

	scoreWalkability: "lifestyle",
	scoreTransit: "lifestyle",
	scoreBikeability: "lifestyle",
	scoreRestaurants: "lifestyle",
	scoreNightlife: "lifestyle",
	scoreArtsAndCulture: "lifestyle",
	scoreDiversity: "lifestyle",
	scoreLgbtqFriendly: "lifestyle",
	scoreCollegeEducated: "lifestyle",
	scoreMedAge: "lifestyle",
	scoreHomeownership: "practical",
	scoreCollegeTown: "lifestyle",
	scoreTechHub: "lifestyle",

	scoreViolentCrime: "practical",
	scorePropertyCrime: "practical",
	scoreHealthcare: "practical",
	scoreBroadband: "practical",
	scorePopulationGrowth: "practical",

	scoreSchoolQuality: "family",
	scoreHighSchool: "family",
	scoreGraduationRate: "family",
	scoreChildcare: "family",
	scorePupilSpending: "family",

	scoreWeather: "nature",
	scoreWarmClimate: "nature",
	scoreAirQuality: "nature",
	scoreSunnyDays: "nature",
	scoreNaturalDisasterRisk: "nature",
	scoreNearOcean: "nature",
	scoreNearMountains: "nature",
	scoreNearLake: "nature",
	scoreTrails: "nature",
	scoreNationalPark: "nature",
	scoreGreenSpace: "nature",
	scoreLowHumidity: "nature",
};

const BACKGROUND_WEIGHT = 0; // only score keys the user explicitly weighted

export function computeMatchPct(
	scores: CityFilterScores,
	weights: FilterWeights,
): number {
	let weightedSum = 0;
	let totalWeight = 0;

	for (const key of Object.keys(SCORE_CATEGORIES) as FilterWeightKey[]) {
		const weight = weights[key] ?? BACKGROUND_WEIGHT;
		const score = (scores[key] as number | null) ?? 50;
		weightedSum += score * weight;
		totalWeight += weight;
	}

	if (totalWeight === 0) {
		// No quiz weights set — return unweighted average of all available scores
		const all = (Object.keys(SCORE_CATEGORIES) as FilterWeightKey[])
			.map((k) => (scores[k] as number | null) ?? 50);
		return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
	}
	return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
}

export function computeCategoryScores(
	scores: CityFilterScores,
	weights: FilterWeights,
): CategoryScores {
	const cats = ["essentials", "lifestyle", "practical", "family", "nature"] as const;
	const result = {} as CategoryScores;

	for (const cat of cats) {
		const keys = Object.entries(SCORE_CATEGORIES)
			.filter(([, c]) => c === cat)
			.map(([k]) => k as FilterWeightKey);

		let weightedSum = 0;
		let totalWeight = 0;

		for (const key of keys) {
			const weight = weights[key] ?? BACKGROUND_WEIGHT;
			const score = (scores[key] as number | null) ?? 50;
			weightedSum += score * weight;
			totalWeight += weight;
		}

		result[cat] = totalWeight === 0
			? Math.round(keys.map((k) => (scores[k] as number | null) ?? 50).reduce((a, b) => a + b, 0) / Math.max(1, keys.length))
			: Math.round(weightedSum / totalWeight);
	}

	return result;
}

export function rankCities(
	cities: Array<CityFilterScores & { slug: string; name: string; stateId: string }>,
	weights: FilterWeights,
): RankedCity[] {
	return cities
		.map((city) => ({
			cityId: city.cityId,
			slug: city.slug,
			name: city.name,
			stateId: city.stateId,
			matchPct: computeMatchPct(city, weights),
			categoryScores: computeCategoryScores(city, weights),
		}))
		.sort((a, b) => b.matchPct - a.matchPct);
}

// Encode/decode weights to/from base64 URL params
// Uses btoa/atob instead of Buffer — works in both browser and Node without polyfill issues
export function encodeWeights(weights: FilterWeights): string {
	try {
		const json = JSON.stringify(weights);
		// Base64 encode then make URL-safe
		const b64 = typeof btoa !== "undefined"
			? btoa(json)
			: Buffer.from(json).toString("base64");
		return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	} catch {
		return "";
	}
}

export function decodeWeights(encoded: string): FilterWeights {
	try {
		// Restore standard base64 padding and characters
		const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
		const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
		const json = typeof atob !== "undefined"
			? atob(padded)
			: Buffer.from(padded, "base64").toString();
		return JSON.parse(json) as FilterWeights;
	} catch {
		return {};
	}
}

// Normalize weights so they sum to 1.0
export function normalizeWeights(weights: FilterWeights): FilterWeights {
	const total = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
	if (total === 0) return weights;
	return Object.fromEntries(
		Object.entries(weights).map(([k, v]) => [k, (v ?? 0) / total]),
	) as FilterWeights;
}
