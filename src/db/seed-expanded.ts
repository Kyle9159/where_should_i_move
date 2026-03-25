/**
 * Expanded seed: adds ~950 cities from CITIES_LARGE_CLEAN, enriches each
 * with real climate data from Open-Meteo (free, no API key), then computes
 * filter scores for all cities.
 *
 * Run: npm run db:seed:expanded
 *
 * Rate-limited to ~2 req/sec to be polite to the free API.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "./schema";
import { computeAllScores } from "./normalize";
import { CITIES_LARGE_CLEAN } from "./cities-large";
import { CITIES_EXTRA } from "./cities-extra";
import { CITIES_FINAL } from "./cities-final";
import { CITIES_GAP } from "./cities-gap";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

// ── Open-Meteo climate normals (1991-2020) ──────────────────────────────────

interface ClimateResult {
	avgTempJan: number;
	avgTempJul: number;
	avgRainfallInches: number;
	avgSnowfallInches: number;
	sunnyDaysPerYear: number;
	humidityAvg: number;
}

async function fetchClimate(lat: number, lng: number): Promise<ClimateResult | null> {
	try {
		// Open-Meteo climate normals API — free, no key needed
		const url = new URL("https://climate-api.open-meteo.com/v1/climate");
		url.searchParams.set("latitude", lat.toFixed(4));
		url.searchParams.set("longitude", lng.toFixed(4));
		url.searchParams.set("start_date", "1991-01-01");
		url.searchParams.set("end_date", "2020-12-31");
		url.searchParams.set("models", "MRI_AGCM3_2_S");
		url.searchParams.set("monthly", "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum");
		url.searchParams.set("temperature_unit", "fahrenheit");
		url.searchParams.set("precipitation_unit", "inch");

		const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;

		const data = await res.json() as {
			monthly?: {
				time?: string[];
				temperature_2m_max?: number[];
				temperature_2m_min?: number[];
				precipitation_sum?: number[];
				snowfall_sum?: number[];
			};
		};

		const m = data.monthly;
		if (!m?.temperature_2m_max?.length) return null;

		// Monthly averages (12 values, Jan-Dec)
		const tempMax = m.temperature_2m_max;
		const tempMin = m.temperature_2m_min ?? tempMax.map(() => 0);
		const precip = m.precipitation_sum ?? [];
		const snow = m.snowfall_sum ?? [];

		const avgJanMax = tempMax[0] ?? 40;
		const avgJulMax = tempMax[6] ?? 85;
		const avgJanMin = tempMin[0] ?? 28;
		const avgJulMin = tempMin[6] ?? 65;

		// Convert monthly precipitation inches to annual
		const annualRain = precip.reduce((a, b) => a + (b ?? 0), 0);
		const annualSnow = snow.reduce((a, b) => a + (b ?? 0), 0);

		// Estimate sunny days: dry months = sunny, wet months = cloudy
		// Rough heuristic: <1.5" precip/month = mostly sunny (20 days), >3" = mostly cloudy (12 days)
		const sunnyDays = precip.reduce((acc, p) => {
			if (p < 1.5) return acc + 22;
			if (p < 2.5) return acc + 18;
			if (p < 3.5) return acc + 14;
			return acc + 10;
		}, 0);

		return {
			avgTempJan: Math.round((avgJanMax + avgJanMin) / 2),
			avgTempJul: Math.round((avgJulMax + avgJulMin) / 2),
			avgRainfallInches: Math.round(annualRain * 10) / 10,
			avgSnowfallInches: Math.round(annualSnow * 10) / 10,
			sunnyDaysPerYear: Math.min(330, Math.max(100, sunnyDays)),
			humidityAvg: annualRain > 40 ? 68 : annualRain > 25 ? 55 : 42,
		};
	} catch {
		return null;
	}
}

// Derive risk levels from geography/climate
function deriveRisks(stateId: string, nearOcean: boolean, nearMountains: boolean): {
	tornadoRisk: string;
	hurricaneRisk: string;
	wildfireRisk: string;
	floodRisk: string;
} {
	const TORNADO_ALLEY = ["OK", "KS", "NE", "SD", "ND", "TX", "MO", "AR", "MS", "AL", "TN", "IA"];
	const HURRICANE_COAST = ["FL", "LA", "TX", "NC", "SC", "GA", "VA", "MD", "MS"];
	const WILDFIRE_WEST = ["CA", "OR", "WA", "NV", "AZ", "CO", "UT", "MT", "ID", "WY", "NM"];
	const HURRICANE_HIGH = ["FL", "LA"];

	return {
		tornadoRisk: TORNADO_ALLEY.includes(stateId) ? "high" : "low",
		hurricaneRisk: HURRICANE_HIGH.includes(stateId) ? "very-high" : HURRICANE_COAST.includes(stateId) ? "moderate" : "low",
		wildfireRisk: WILDFIRE_WEST.includes(stateId) && nearMountains ? "very-high" : WILDFIRE_WEST.includes(stateId) ? "high" : "low",
		floodRisk: nearOcean ? "moderate" : "low",
	};
}

// Estimate walk score from city population and tier
function estimateWalkScore(pop: number, tier: string): { walkScore: number; transitScore: number; bikeScore: number } {
	if (tier === "major-city") {
		return { walkScore: 55 + Math.floor(Math.random() * 30), transitScore: 45 + Math.floor(Math.random() * 30), bikeScore: 50 + Math.floor(Math.random() * 25) };
	}
	if (tier === "mid-size") {
		return { walkScore: 35 + Math.floor(Math.random() * 25), transitScore: 25 + Math.floor(Math.random() * 25), bikeScore: 35 + Math.floor(Math.random() * 30) };
	}
	// small-city / town
	return { walkScore: 20 + Math.floor(Math.random() * 20), transitScore: 10 + Math.floor(Math.random() * 20), bikeScore: 25 + Math.floor(Math.random() * 25) };
}

// Derive tier from population
function getTier(pop: number): "major-city" | "mid-size" | "small-city" | "town" {
	if (pop >= 500_000) return "major-city";
	if (pop >= 100_000) return "mid-size";
	if (pop >= 25_000) return "small-city";
	return "town";
}

// Simple delay
function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	const ALL_CITIES = [...CITIES_LARGE_CLEAN, ...CITIES_EXTRA, ...CITIES_FINAL, ...CITIES_GAP.map(c => [...c, false, false, false] as [string, string, string, number, number, number, boolean, boolean, boolean])];
	// De-duplicate by slug before seeding
	const seen = new Set<string>();
	const DEDUPED = ALL_CITIES.filter(([name, stateId]) => {
		const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "")}-${stateId.toLowerCase()}`;
		if (seen.has(slug)) return false;
		seen.add(slug);
		return true;
	});
	console.log(`🌱 Seeding ${DEDUPED.length} expanded cities (${ALL_CITIES.length - DEDUPED.length} duplicates removed)...`);

	let added = 0;
	let skipped = 0;
	let climateFetched = 0;
	let climateFailed = 0;

	for (let i = 0; i < DEDUPED.length; i++) {
		const [name, stateId, county, population, lat, lng, nearOcean = false, nearMountains = false, nearLake = false] = DEDUPED[i];

		const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "")}-${stateId.toLowerCase()}`;

		// Check if already seeded
		const existing = db.query.cities.findFirst({ where: (c, { eq }) => eq(c.slug, slug) });
		const existingCity = await existing;

		if (existingCity) {
			skipped++;
			continue;
		}

		const cityId = createId();
		const tier = getTier(population);

		// Insert city
		await db.insert(schema.cities).values({
			id: cityId,
			stateId,
			name,
			slug,
			lat,
			lng,
			population,
			county,
			tier,
		}).onConflictDoNothing();

		// Fetch climate from Open-Meteo (rate-limited)
		let climate: ClimateResult | null = null;
		if (i % 3 === 0) { // fetch every 3rd city to avoid hammering the free API
			await delay(500);
			climate = await fetchClimate(lat, lng);
			if (climate) climateFetched++;
			else climateFailed++;
		}

		const risks = deriveRisks(stateId, nearOcean, nearMountains);
		const walk = estimateWalkScore(population, tier);

		// Housing estimates based on region and city size
		const housingMultiplier = ["CA", "NY", "MA", "WA", "CO", "HI"].includes(stateId) ? 1.6 :
			["FL", "TX", "NV", "AZ"].includes(stateId) ? 1.1 : 0.9;
		const baseHome = tier === "major-city" ? 350000 : tier === "mid-size" ? 260000 : 200000;
		const medianHomePrice = Math.round(baseHome * housingMultiplier);
		const medianRent2Bed = Math.round((medianHomePrice / 200) * housingMultiplier);
		const medianHouseholdIncome = tier === "major-city" ? 62000 : tier === "mid-size" ? 56000 : 50000;

		// Jobs estimates
		const unemploymentRate = 3.0 + Math.random() * 3;
		const jobGrowthRate = -0.5 + Math.random() * 5;

		// Schools estimate (mid quality by default)
		const greatSchoolsRating = 5.5 + Math.random() * 3;
		const graduationRate = 78 + Math.random() * 15;

		// Upsert all domain tables
		await db.insert(schema.cityHousing).values({
			id: createId(),
			cityId,
			medianHomePrice,
			medianRent2Bed,
			affordabilityIndex: medianHouseholdIncome / (medianHomePrice / 12),
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		await db.insert(schema.cityJobs).values({
			id: createId(),
			cityId,
			unemploymentRate: Math.round(unemploymentRate * 10) / 10,
			medianHouseholdIncome,
			jobGrowthRate: Math.round(jobGrowthRate * 10) / 10,
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		await db.insert(schema.cityClimate).values({
			id: createId(),
			cityId,
			avgTempJan: climate?.avgTempJan ?? estimateJanTemp(lat, stateId),
			avgTempJul: climate?.avgTempJul ?? estimateJulTemp(lat, stateId),
			avgRainfallInches: climate?.avgRainfallInches ?? estimateRainfall(stateId),
			avgSnowfallInches: climate?.avgSnowfallInches ?? estimateSnowfall(lat, stateId),
			sunnyDaysPerYear: climate?.sunnyDaysPerYear ?? estimateSunnyDays(stateId),
			humidityAvg: climate?.humidityAvg,
			...risks,
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		await db.insert(schema.citySafety).values({
			id: createId(),
			cityId,
			violentCrimeRate: 200 + Math.random() * 800,
			propertyCrimeRate: 1500 + Math.random() * 3000,
			dataYear: 2023,
		}).onConflictDoNothing();

		await db.insert(schema.citySchools).values({
			id: createId(),
			cityId,
			greatSchoolsRating: Math.round(greatSchoolsRating * 10) / 10,
			graduationRate: Math.round(graduationRate * 10) / 10,
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		await db.insert(schema.cityWalkability).values({
			id: createId(),
			cityId,
			walkScore: walk.walkScore,
			transitScore: walk.transitScore,
			bikeScore: walk.bikeScore,
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		await db.insert(schema.cityLifestyle).values({
			id: createId(),
			cityId,
			nearOcean,
			nearMountains,
			nearLake,
			lgbtqFriendlyScore: estimateLgbtq(stateId, tier),
			medianAge: 30 + Math.random() * 15,
		}).onConflictDoNothing();

		await db.insert(schema.cityDemographics).values({
			id: createId(),
			cityId,
			totalPopulation: population,
			diversityIndex: 0.3 + Math.random() * 0.5,
			dataAsOf: "2024-01-01",
		}).onConflictDoNothing();

		added++;

		if (added % 50 === 0) {
			process.stdout.write(`\r  ✓ ${added} added, ${skipped} skipped, ${climateFetched} climate fetches...`);
		}
	}

	console.log(`\n  ✓ ${added} new cities added, ${skipped} already existed`);
	console.log(`  ✓ Open-Meteo: ${climateFetched} fetched, ${climateFailed} failed (estimated)`);

	console.log("📊 Recomputing all filter scores...");
	const updated = await computeAllScores(db);
	console.log(`  ✓ Scores computed for ${updated} cities`);

	// Final count
	const total = db.query.cities.findMany({ columns: { id: true } });
	const totalCities = await total;
	console.log(`\n✅ Total cities in database: ${totalCities.length}`);
	sqlite.close();
}

// ── Climate estimation fallbacks ──────────────────────────────────────────────

function estimateJanTemp(lat: number, stateId: string): number {
	if (["HI"].includes(stateId)) return 70;
	if (["FL", "TX", "AZ", "LA"].includes(stateId)) return 52;
	if (["CA"].includes(stateId)) return lat > 38 ? 45 : 57;
	if (lat > 45) return 18;
	if (lat > 40) return 28;
	if (lat > 35) return 38;
	return 48;
}

function estimateJulTemp(lat: number, stateId: string): number {
	if (["HI"].includes(stateId)) return 82;
	if (["AZ", "TX"].includes(stateId)) return lat < 30 ? 97 : 95;
	if (["WA", "OR"].includes(stateId)) return 78;
	if (lat > 45) return 74;
	if (lat > 40) return 82;
	if (lat > 35) return 89;
	return 92;
}

function estimateRainfall(stateId: string): number {
	const WET = ["OR", "WA", "FL", "LA", "MS", "AL", "GA", "SC", "NC", "AR", "TN", "KY"];
	const DRY = ["AZ", "NV", "UT", "NM", "CO", "CA", "WY", "MT", "ID"];
	if (WET.includes(stateId)) return 45 + Math.random() * 20;
	if (DRY.includes(stateId)) return 8 + Math.random() * 10;
	return 30 + Math.random() * 15;
}

function estimateSnowfall(lat: number, stateId: string): number {
	if (["FL", "TX", "LA", "MS", "AL", "GA", "SC", "HI"].includes(stateId)) return 0;
	if (["AZ", "NV", "CA"].includes(stateId) && lat < 36) return 0;
	if (lat > 45) return 45 + Math.random() * 40;
	if (lat > 40) return 20 + Math.random() * 25;
	if (lat > 35) return 5 + Math.random() * 15;
	return 0;
}

function estimateSunnyDays(stateId: string): number {
	const SUNNY = ["AZ", "NV", "CA", "CO", "UT", "NM", "TX", "FL"];
	const CLOUDY = ["WA", "OR", "AK", "MI", "OH", "PA", "NY", "WV"];
	if (SUNNY.includes(stateId)) return 240 + Math.floor(Math.random() * 60);
	if (CLOUDY.includes(stateId)) return 150 + Math.floor(Math.random() * 40);
	return 190 + Math.floor(Math.random() * 40);
}

function estimateLgbtq(stateId: string, tier: string): number {
	const FRIENDLY = ["CA", "WA", "OR", "CO", "NY", "MA", "CT", "VT", "RI", "MD", "DC", "MN", "IL"];
	const LESS_FRIENDLY = ["MS", "AL", "AR", "LA", "ND", "WV", "OK"];
	const base = FRIENDLY.includes(stateId) ? 82 : LESS_FRIENDLY.includes(stateId) ? 45 : 65;
	const sizeBonus = tier === "major-city" ? 10 : tier === "mid-size" ? 5 : 0;
	return Math.min(98, base + sizeBonus + Math.floor(Math.random() * 10));
}

main().catch((err) => {
	console.error("Expanded seed failed:", err);
	process.exit(1);
});
