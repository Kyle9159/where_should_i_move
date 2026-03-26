/**
 * Seed 2,000+ additional cities from CITIES_3K to bring the total to 3,000+.
 *
 * No external API calls — uses population-derived estimates and state-average
 * climate data. Run enrichment scripts separately for real data.
 *
 * Run: npm run db:seed:3k
 * Options:
 *   DRY_RUN=1  — print stats without writing to DB
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "./schema";
import { CITIES_3K } from "./cities-3k";
import { CITIES_3K_EXTRA } from "./cities-3k-extra";
import { CITIES_3K_FINAL } from "./cities-3k-final";
import { CITIES_3K_NEW } from "./cities-3k-new";

const ALL_CITIES = [...CITIES_3K, ...CITIES_3K_EXTRA, ...CITIES_3K_FINAL, ...CITIES_3K_NEW];

const DRY_RUN = process.env.DRY_RUN === "1";
const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

// ── State climate defaults (for cities without Open-Meteo data) ─────────────
const STATE_CLIMATE: Record<string, { jan: number; jul: number; sunny: number; rain: number }> = {
	AK: { jan: 15, jul: 60, sunny: 150, rain: 16 },
	AL: { jan: 47, jul: 82, sunny: 275, rain: 55 },
	AR: { jan: 42, jul: 82, sunny: 280, rain: 49 },
	AZ: { jan: 54, jul: 100, sunny: 330, rain: 8 },
	CA: { jan: 52, jul: 78, sunny: 300, rain: 22 },
	CO: { jan: 32, jul: 74, sunny: 300, rain: 17 },
	CT: { jan: 32, jul: 74, sunny: 265, rain: 47 },
	DC: { jan: 37, jul: 79, sunny: 262, rain: 39 },
	DE: { jan: 36, jul: 77, sunny: 263, rain: 44 },
	FL: { jan: 62, jul: 91, sunny: 290, rain: 54 },
	GA: { jan: 47, jul: 82, sunny: 280, rain: 49 },
	HI: { jan: 72, jul: 81, sunny: 310, rain: 18 },
	IA: { jan: 21, jul: 76, sunny: 265, rain: 35 },
	ID: { jan: 30, jul: 75, sunny: 205, rain: 12 },
	IL: { jan: 25, jul: 76, sunny: 255, rain: 37 },
	IN: { jan: 28, jul: 76, sunny: 253, rain: 40 },
	KS: { jan: 32, jul: 81, sunny: 284, rain: 28 },
	KY: { jan: 36, jul: 79, sunny: 268, rain: 46 },
	LA: { jan: 53, jul: 84, sunny: 279, rain: 59 },
	MA: { jan: 30, jul: 73, sunny: 261, rain: 46 },
	MD: { jan: 36, jul: 78, sunny: 262, rain: 41 },
	ME: { jan: 20, jul: 68, sunny: 258, rain: 42 },
	MI: { jan: 22, jul: 72, sunny: 245, rain: 33 },
	MN: { jan: 14, jul: 73, sunny: 263, rain: 30 },
	MO: { jan: 32, jul: 80, sunny: 275, rain: 41 },
	MS: { jan: 48, jul: 83, sunny: 280, rain: 55 },
	MT: { jan: 24, jul: 71, sunny: 250, rain: 14 },
	NC: { jan: 43, jul: 80, sunny: 270, rain: 47 },
	ND: { jan: 10, jul: 72, sunny: 271, rain: 17 },
	NE: { jan: 23, jul: 79, sunny: 274, rain: 26 },
	NH: { jan: 23, jul: 69, sunny: 264, rain: 42 },
	NJ: { jan: 35, jul: 77, sunny: 265, rain: 46 },
	NM: { jan: 40, jul: 89, sunny: 320, rain: 9 },
	NV: { jan: 40, jul: 95, sunny: 330, rain: 7 },
	NY: { jan: 28, jul: 73, sunny: 255, rain: 42 },
	OH: { jan: 30, jul: 75, sunny: 247, rain: 37 },
	OK: { jan: 40, jul: 83, sunny: 285, rain: 35 },
	OR: { jan: 43, jul: 68, sunny: 165, rain: 44 },
	PA: { jan: 31, jul: 74, sunny: 258, rain: 41 },
	RI: { jan: 32, jul: 74, sunny: 260, rain: 46 },
	SC: { jan: 48, jul: 82, sunny: 279, rain: 47 },
	SD: { jan: 18, jul: 76, sunny: 270, rain: 19 },
	TN: { jan: 42, jul: 82, sunny: 274, rain: 50 },
	TX: { jan: 49, jul: 90, sunny: 305, rain: 29 },
	UT: { jan: 29, jul: 90, sunny: 235, rain: 13 },
	VA: { jan: 38, jul: 78, sunny: 267, rain: 43 },
	VT: { jan: 21, jul: 70, sunny: 264, rain: 38 },
	WA: { jan: 40, jul: 66, sunny: 165, rain: 40 },
	WI: { jan: 18, jul: 72, sunny: 263, rain: 32 },
	WV: { jan: 34, jul: 76, sunny: 266, rain: 44 },
	WY: { jan: 25, jul: 71, sunny: 268, rain: 13 },
};

// Derive tier from population
function tierFromPop(pop: number): string {
	if (pop >= 300000) return "major-city";
	if (pop >= 100000) return "mid-size";
	if (pop >= 25000) return "small-city";
	return "town";
}

// Derive overall score estimate from population + tier
function estimateOverallScore(pop: number, tier: string): number {
	const base = tier === "major-city" ? 70 : tier === "mid-size" ? 65 : tier === "small-city" ? 58 : 50;
	return base + Math.min(10, Math.floor(Math.log10(Math.max(pop, 1)) - 3));
}

async function main() {
	const countBefore = (sqlite.prepare("SELECT COUNT(*) as c FROM cities").get() as { c: number }).c;
	console.log(`📊 Cities before seed: ${countBefore}`);
	console.log(`🌆 Adding up to ${ALL_CITIES.length} new cities...`);
	if (DRY_RUN) console.log("DRY RUN — no writes");

	let inserted = 0;
	let skipped = 0;

	for (const [name, stateId, county, population, lat, lng] of ALL_CITIES) {
		// Check for duplicate (name + state)
		const exists = sqlite.prepare(
			"SELECT id FROM cities WHERE LOWER(name) = LOWER(?) AND state_id = ?"
		).get(name, stateId);

		if (exists) {
			skipped++;
			continue;
		}

		if (DRY_RUN) {
			inserted++;
			continue;
		}

		const id = createId();
		const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${stateId.toLowerCase()}`;
		const tier = tierFromPop(population);
		const overallScore = estimateOverallScore(population, tier);
		const climate = STATE_CLIMATE[stateId] ?? { jan: 40, jul: 75, sunny: 260, rain: 35 };

		// Proximity heuristics
		const nearOcean = ["CA", "OR", "WA", "TX", "FL", "GA", "SC", "NC", "VA", "MD", "DE", "NJ", "NY", "CT", "RI", "MA", "ME", "NH", "HI", "AK", "LA", "MS", "AL"].includes(stateId) && lat < 45;
		const nearMountains = ["CO", "WY", "MT", "ID", "UT", "NV", "AZ", "NM", "CA", "OR", "WA", "AK"].includes(stateId);
		const nearLake = ["MN", "WI", "MI", "IL", "IN", "OH", "NY", "PA", "VT", "NH", "ME"].includes(stateId);

		// Insert city
		const cityResult = sqlite.prepare(`
			INSERT OR IGNORE INTO cities (
				id, slug, name, state_id, county, population, lat, lng, tier,
				overall_score, metro, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
		`).run(id, slug, name, stateId, county, population, lat, lng, tier,
			overallScore, `${name} Metro Area`);
		if (cityResult.changes === 0) { skipped++; continue; }

		// Insert estimated housing data
		const medianHomePrice = Math.round(
			tier === "major-city" ? 550000 :
			tier === "mid-size" ? 320000 :
			tier === "small-city" ? 220000 : 170000
		);
		const medianRent = Math.round(medianHomePrice * 0.004);

		sqlite.prepare(`
			INSERT OR IGNORE INTO city_housing (id, city_id, median_home_price, median_rent_2bed, affordability_index)
			VALUES (?, ?, ?, ?, ?)
		`).run(createId(), id, medianHomePrice, medianRent, Math.round((medianHomePrice / 300000) * 100) / 100);

		// Insert estimated jobs data
		const medianIncome = Math.round(
			tier === "major-city" ? 75000 : tier === "mid-size" ? 62000 : tier === "small-city" ? 52000 : 44000
		);

		sqlite.prepare(`
			INSERT OR IGNORE INTO city_jobs (id, city_id, median_household_income, unemployment_rate, job_growth_rate)
			VALUES (?, ?, ?, ?, ?)
		`).run(createId(), id, medianIncome, 4.2, 1.5);

		// Insert climate data from state defaults
		sqlite.prepare(`
			INSERT OR IGNORE INTO city_climate (
				id, city_id, avg_temp_jan, avg_temp_jul, sunny_days_per_year, avg_rainfall_inches, air_quality_index
			) VALUES (?, ?, ?, ?, ?, ?, ?)
		`).run(createId(), id, climate.jan, climate.jul, climate.sunny, climate.rain, 45);

		// Insert estimated safety data
		const violentCrimeRate = tier === "major-city" ? 480 : tier === "mid-size" ? 320 : tier === "small-city" ? 220 : 160;

		sqlite.prepare(`
			INSERT OR IGNORE INTO city_safety (id, city_id, violent_crime_rate, property_crime_rate)
			VALUES (?, ?, ?, ?)
		`).run(createId(), id, violentCrimeRate, violentCrimeRate * 4);

		// Insert estimated schools data
		sqlite.prepare(`
			INSERT OR IGNORE INTO city_schools (id, city_id, great_schools_rating, graduation_rate)
			VALUES (?, ?, ?, ?)
		`).run(createId(), id, 6.5, 88);

		// Insert estimated walkability
		const walkScore = tier === "major-city" ? 72 : tier === "mid-size" ? 45 : tier === "small-city" ? 30 : 20;

		sqlite.prepare(`
			INSERT OR IGNORE INTO city_walkability (id, city_id, walk_score, transit_score, bike_score)
			VALUES (?, ?, ?, ?, ?)
		`).run(createId(), id, walkScore, Math.round(walkScore * 0.6), Math.round(walkScore * 0.7));

		inserted++;
		if (inserted % 100 === 0) {
			process.stdout.write(`\r  ✓ ${inserted} inserted, ${skipped} skipped...`);
		}
	}

	const countAfter = (sqlite.prepare("SELECT COUNT(*) as c FROM cities").get() as { c: number }).c;
	console.log(`\n\n✅ Done!`);
	console.log(`   Before: ${countBefore} cities`);
	console.log(`   Inserted: ${inserted} new cities`);
	console.log(`   Skipped (duplicates): ${skipped}`);
	console.log(`   After: ${countAfter} cities`);

	sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
