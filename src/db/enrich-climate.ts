/**
 * Enriches city_climate table with real climate data from Open-Meteo Historical Archive.
 * Fetches 5 years (2019-2023) of daily data and computes climate normals.
 * Free — no API key required.
 *
 * Run: npm run db:enrich:climate
 * Options:
 *   LIMIT=100   — only enrich first N cities (default: 1000, ordered by score desc)
 *   DRY_RUN=1   — fetch but do not write to DB
 *   DELAY_MS=1200 — ms between API calls (default: 1200, stays within free tier)
 *
 * Approx time: 1000 cities × 1.2s ≈ 20 minutes
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";

const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1200", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = parseInt(process.env.LIMIT ?? "1000", 10);

const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const START_DATE = "2019-01-01";
const END_DATE = "2023-12-31";
const YEARS = 5;

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function celsiusToF(c: number): number {
	return Math.round(c * 9 / 5 + 32);
}

function mmToInches(mm: number): number {
	return Math.round(mm * 0.03937 * 10) / 10;
}

function cmToInches(cm: number): number {
	return Math.round(cm * 0.3937 * 10) / 10;
}

interface OpenMeteoResponse {
	daily: {
		time: string[];
		temperature_2m_max: (number | null)[];
		temperature_2m_min: (number | null)[];
		temperature_2m_mean: (number | null)[];
		precipitation_sum: (number | null)[];
		snowfall_sum: (number | null)[];
		sunshine_duration: (number | null)[]; // seconds per day
	};
}

interface ClimateStats {
	avgTempJan: number;
	avgTempJul: number;
	avgTempAnnual: number;
	avgRainfallInches: number;
	avgSnowfallInches: number;
	sunnyDaysPerYear: number; // days with >6h of sunshine
	extremeHeatDays: number;  // days max >95°F, per year
	freezeDays: number;       // days min <32°F, per year
}

async function fetchClimate(lat: number, lng: number): Promise<ClimateStats | null> {
	const url = new URL(ARCHIVE_BASE);
	url.searchParams.set("latitude", lat.toFixed(4));
	url.searchParams.set("longitude", lng.toFixed(4));
	url.searchParams.set("start_date", START_DATE);
	url.searchParams.set("end_date", END_DATE);
	url.searchParams.set(
		"daily",
		"temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,snowfall_sum,sunshine_duration",
	);
	url.searchParams.set("timezone", "auto");

	try {
		const res = await fetch(url.toString(), { signal: AbortSignal.timeout(25_000) });
		if (!res.ok) return null;
		const data = (await res.json()) as OpenMeteoResponse;
		const d = data.daily;
		if (!d?.time?.length) return null;

		const n = d.time.length;

		const janMaxC: number[] = [];
		const janMinC: number[] = [];
		const julMaxC: number[] = [];
		const julMinC: number[] = [];
		let annualMeanSum = 0;
		let annualMeanCount = 0;
		let totalRainMm = 0;
		let totalSnowCm = 0;
		let sunnyDays = 0;
		let extremeHeatDays = 0;
		let freezeDays = 0;

		for (let i = 0; i < n; i++) {
			const month = parseInt(d.time[i].slice(5, 7), 10);
			const maxC = d.temperature_2m_max[i];
			const minC = d.temperature_2m_min[i];
			const meanC = d.temperature_2m_mean[i];
			const rain = d.precipitation_sum[i];
			const snow = d.snowfall_sum[i];
			const sun = d.sunshine_duration[i];

			if (maxC !== null) {
				if (month === 1) janMaxC.push(maxC);
				if (month === 7) julMaxC.push(maxC);
				if (celsiusToF(maxC) > 95) extremeHeatDays++;
			}
			if (minC !== null) {
				if (month === 1) janMinC.push(minC);
				if (month === 7) julMinC.push(minC);
				if (celsiusToF(minC) < 32) freezeDays++;
			}
			if (meanC !== null) {
				annualMeanSum += meanC;
				annualMeanCount++;
			}
			if (rain !== null) totalRainMm += rain;
			if (snow !== null) totalSnowCm += snow;
			if (sun !== null && sun > 21_600) sunnyDays++; // >6h = sunny day
		}

		const avg = (arr: number[]) =>
			arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

		const avgJanMeanC = (avg(janMaxC) + avg(janMinC)) / 2;
		const avgJulMeanC = (avg(julMaxC) + avg(julMinC)) / 2;
		const avgAnnualC = annualMeanCount > 0 ? annualMeanSum / annualMeanCount : 0;

		return {
			avgTempJan: celsiusToF(avgJanMeanC),
			avgTempJul: celsiusToF(avgJulMeanC),
			avgTempAnnual: celsiusToF(avgAnnualC),
			avgRainfallInches: mmToInches(totalRainMm / YEARS),
			avgSnowfallInches: cmToInches(totalSnowCm / YEARS),
			sunnyDaysPerYear: Math.round(sunnyDays / YEARS),
			extremeHeatDays: Math.round(extremeHeatDays / YEARS),
			freezeDays: Math.round(freezeDays / YEARS),
		};
	} catch {
		return null;
	}
}

async function main() {
	const db = new Database("./nexthome.db");
	const cities = db
		.prepare(
			`SELECT id, name, lat, lng FROM cities
       WHERE lat IS NOT NULL AND lng IS NOT NULL
       ORDER BY overall_score DESC
       LIMIT ?`,
		)
		.all(LIMIT) as Array<{ id: string; name: string; lat: number; lng: number }>;

	console.log(`🌡️  Enriching climate data for ${cities.length} cities...`);
	if (DRY_RUN) console.log("   (DRY_RUN=1 — will not write to DB)");

	const today = new Date().toISOString().slice(0, 10);
	let updated = 0;
	let failed = 0;

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i];
		process.stdout.write(`[${i + 1}/${cities.length}] ${city.name}... `);

		if (DRY_RUN) {
			console.log("(dry run)");
			continue;
		}

		const stats = await fetchClimate(city.lat, city.lng);

		if (!stats) {
			console.log("❌ failed");
			failed++;
		} else {
			const existing = db
				.prepare("SELECT id FROM city_climate WHERE city_id = ?")
				.get(city.id) as { id: string } | undefined;

			if (existing) {
				db.prepare(
					`UPDATE city_climate SET
             avg_temp_jan = ?, avg_temp_jul = ?, avg_temp_annual = ?,
             avg_rainfall_inches = ?, avg_snowfall_inches = ?,
             sunny_days_per_year = ?, extreme_heat_days = ?, freeze_days = ?,
             data_as_of = ?
           WHERE city_id = ?`,
				).run(
					stats.avgTempJan,
					stats.avgTempJul,
					stats.avgTempAnnual,
					stats.avgRainfallInches,
					stats.avgSnowfallInches,
					stats.sunnyDaysPerYear,
					stats.extremeHeatDays,
					stats.freezeDays,
					today,
					city.id,
				);
			} else {
				db.prepare(
					`INSERT INTO city_climate
             (id, city_id, avg_temp_jan, avg_temp_jul, avg_temp_annual,
              avg_rainfall_inches, avg_snowfall_inches,
              sunny_days_per_year, extreme_heat_days, freeze_days, data_as_of)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				).run(
					createId(),
					city.id,
					stats.avgTempJan,
					stats.avgTempJul,
					stats.avgTempAnnual,
					stats.avgRainfallInches,
					stats.avgSnowfallInches,
					stats.sunnyDaysPerYear,
					stats.extremeHeatDays,
					stats.freezeDays,
					today,
				);
			}

			console.log(
				`✅ Jan:${stats.avgTempJan}°F  Jul:${stats.avgTempJul}°F  Rain:${stats.avgRainfallInches}"  Sunny:${stats.sunnyDaysPerYear}d`,
			);
			updated++;
		}

		if (i < cities.length - 1) await sleep(DELAY_MS);
	}

	db.close();
	console.log(`\n✅ Done. Updated: ${updated}  Failed: ${failed}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
