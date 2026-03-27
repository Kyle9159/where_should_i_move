/**
 * Score normalization pipeline.
 * Reads raw data tables, normalizes every metric to 0-100,
 * and writes the results to city_filter_scores.
 */
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

function minMaxNorm(value: number | null | undefined, min: number, max: number): number {
	if (value == null) return 50;
	return Math.min(100, Math.max(0, Math.round(((value - min) / (max - min)) * 100)));
}

function invertNorm(value: number | null | undefined, min: number, max: number): number {
	return 100 - minMaxNorm(value, min, max);
}

function boolScore(value: boolean | number | null | undefined): number {
	return value ? 100 : 0;
}

function riskScore(risk: string | null | undefined): number {
	const map: Record<string, number> = { low: 100, moderate: 65, high: 30, "very-high": 5 };
	return map[risk ?? "low"] ?? 50;
}

export async function computeAllScores(db: DB, cityIds?: string[]): Promise<number> {
	// Fetch cities with their related data in one pass (optionally filtered by IDs)
	const cities = db.query.cities.findMany({
		where: cityIds?.length ? (c, { inArray }) => inArray(c.id, cityIds) : undefined,
		with: {
			housing: true,
			jobs: true,
			climate: true,
			safety: true,
			schools: true,
			walkability: true,
			demographics: true,
			lifestyle: true,
		},
	});

	// Sync drizzle query (better-sqlite3 is sync)
	const allCities = await cities;

	let updated = 0;
	for (const city of allCities) {
		const h = city.housing;
		const j = city.jobs;
		const c = city.climate;
		const s = city.safety;
		const sc = city.schools;
		const w = city.walkability;
		const d = city.demographics;
		const l = city.lifestyle;

		// Composite weather comfort score (sunny days + mild temps)
		const weatherScore = Math.round(
			(minMaxNorm(c?.sunnyDaysPerYear, 100, 330) * 0.4) +
			(invertNorm(Math.abs((c?.avgTempJul ?? 80) - 78), 0, 30) * 0.3) +
			(invertNorm(Math.abs((c?.avgTempJan ?? 40) - 42), 0, 40) * 0.3)
		);

		// Warm climate score (favors hot summers + mild winters)
		const warmScore = Math.round(
			(minMaxNorm(c?.avgTempJan, 30, 65) * 0.5) +
			(minMaxNorm(c?.sunnyDaysPerYear, 150, 320) * 0.5)
		);

		// Natural disaster risk (aggregate of all risks, lower is better)
		const disasterScore = Math.round(
			(riskScore(c?.tornadoRisk) * 0.25) +
			(riskScore(c?.hurricaneRisk) * 0.25) +
			(riskScore(c?.wildfireRisk) * 0.25) +
			(riskScore(c?.floodRisk) * 0.25)
		);

		const scores: typeof schema.cityFilterScores.$inferInsert = {
			id: createId(),
			cityId: city.id,
			updatedAt: new Date().toISOString(),

			// Essentials
			scoreMedianHomePrice: invertNorm(h?.medianHomePrice, 150_000, 900_000),
			scoreMedianRent: invertNorm(h?.medianRent2Bed, 700, 3500),
			scorePriceToRent: minMaxNorm(h?.priceToRentRatio, 10, 30),
			scoreCostOfLiving: 50, // placeholder until COL data integrated
			scoreJobMarket: minMaxNorm(j?.jobGrowthRate, -1, 5),
			scoreUnemployment: invertNorm(j?.unemploymentRate, 2, 10),
			scoreIncomeGrowth: minMaxNorm(j?.wageGrowthRate, -1, 8),
			scoreMedianIncome: minMaxNorm(j?.medianHouseholdIncome, 35_000, 130_000),
			scoreTaxBurden: 50, // placeholder
			scoreAffordabilityIndex: minMaxNorm(h?.affordabilityIndex, 0.2, 1.2),

			// Lifestyle
			scoreWalkability: minMaxNorm(w?.walkScore, 0, 100),
			scoreTransit: minMaxNorm(w?.transitScore, 0, 100),
			scoreBikeability: minMaxNorm(w?.bikeScore, 0, 100),
			scoreRestaurants: 50, // placeholder until Google Places integrated
			scoreNightlife: 50,
			scoreArtsAndCulture: 50,
			scoreDiversity: minMaxNorm((l?.diversityIndex ?? d?.diversityIndex), 0.2, 0.85),
			scoreLgbtqFriendly: minMaxNorm(l?.lgbtqFriendlyScore, 30, 100),
			scoreMedAge: 50, // neutral; filtered by user preference
			scoreCollegeTown: 50,
			scoreTechHub: 50,

			// Practical / Safety
			scoreViolentCrime: invertNorm(s?.violentCrimeRate, 50, 2000),
			scorePropertyCrime: invertNorm(s?.propertyCrimeRate, 500, 7000),
			scoreHealthcare: 50,
			scoreBroadband: 50,
			scorePopulationGrowth: minMaxNorm(city.populationGrowthPct, -2, 8),

			// Family
			scoreSchoolQuality: minMaxNorm(sc?.greatSchoolsRating, 1, 10),
			scoreHighSchool: minMaxNorm(sc?.highSchoolRating, 1, 10),
			scoreGraduationRate: minMaxNorm(sc?.graduationRate, 25, 95),
			scoreChildcare: 50,
			scorePupilSpending: minMaxNorm(sc?.perPupilSpending, 5_000, 25_000),

			// Nature & Climate
			scoreWeather: weatherScore,
			scoreWarmClimate: warmScore,
			scoreAirQuality: invertNorm(c?.airQualityIndex, 0, 150),
			scoreSunnyDays: minMaxNorm(c?.sunnyDaysPerYear, 100, 330),
			scoreNaturalDisasterRisk: disasterScore,
			scoreNearOcean: boolScore(l?.nearOcean),
			scoreNearMountains: boolScore(l?.nearMountains),
			scoreNearLake: boolScore(l?.nearLake),
			scoreTrails: 50,
			scoreNationalPark: 50,
			scoreGreenSpace: 50,
			scoreLowHumidity: invertNorm(c?.humidityAvg, 20, 90),
		};

		// Upsert
		const existing = db.query.cityFilterScores.findFirst
			? await db.query.cityFilterScores.findFirst({ where: (t, { eq }) => eq(t.cityId, city.id) })
			: null;

		if (existing) {
			await db
				.update(schema.cityFilterScores)
				.set(scores)
				.where(eq(schema.cityFilterScores.cityId, city.id));
		} else {
			await db.insert(schema.cityFilterScores).values(scores);
		}

		// Update overall score on cities table (balanced preset)
		const overall = Math.round(
			((scores.scoreMedianHomePrice ?? 50) * 0.08) +
			((scores.scoreJobMarket ?? 50) * 0.08) +
			((scores.scoreViolentCrime ?? 50) * 0.1) +
			((scores.scoreSchoolQuality ?? 50) * 0.08) +
			((scores.scoreWeather ?? 50) * 0.07) +
			((scores.scoreWalkability ?? 50) * 0.06) +
			((scores.scoreAirQuality ?? 50) * 0.05) +
			((scores.scoreNaturalDisasterRisk ?? 50) * 0.06) +
			((scores.scoreMedianIncome ?? 50) * 0.06) +
			((scores.scoreUnemployment ?? 50) * 0.06) +
			50 * 0.30 // remaining weight neutral
		);

		await db
			.update(schema.cities)
			.set({ overallScore: overall })
			.where(eq(schema.cities.id, city.id));

		updated++;
	}

	return updated;
}
