/**
 * Enriches city_jobs with real BLS unemployment rates via LAUS series.
 *
 * Strategy:
 *  1. Fetch all 50 state-level annual unemployment rates in ONE API call
 *     (BLS allows 500 series/request with a key).
 *  2. Apply state rate to every city in that state.
 *  3. For major metros, also pull MSA-level LAUS data for more precision.
 *
 * Run: npx tsx src/db/enrich-bls.ts
 * Options:
 *   DRY_RUN=1  — print results without writing to DB
 *   MSA=0      — skip MSA-level pass (faster, state-level only)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";

const DRY_RUN = process.env.DRY_RUN === "1";
const SKIP_MSA = process.env.MSA === "0";
const BLS_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const KEY = process.env.BLS_API_KEY ?? "";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── State FIPS codes ──────────────────────────────────────────────────────────

const STATE_FIPS: Record<string, string> = {
	AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DC:"11",
	DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",
	KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",
	MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",
	NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
	SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",
	WV:"54",WI:"55",WY:"56",
};

// ── BLS API call ──────────────────────────────────────────────────────────────

async function fetchBLSSeries(seriesIds: string[]): Promise<Map<string, number>> {
	const currentYear = new Date().getFullYear();
	const body = {
		seriesid: seriesIds,
		startyear: String(currentYear - 1),
		endyear: String(currentYear),
		annualaverage: true,
		registrationkey: KEY,
	};

	const res = await fetch(BLS_BASE, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(30000),
	});

	if (!res.ok) throw new Error(`BLS API ${res.status}`);
	const data = await res.json() as {
		status: string;
		Results?: { series: Array<{ seriesID: string; data: Array<{ year: string; period: string; value: string }> }> };
		message?: string[];
	};

	if (data.status !== "REQUEST_SUCCEEDED") {
		throw new Error(`BLS: ${data.message?.join(", ") ?? data.status}`);
	}

	const result = new Map<string, number>();
	for (const s of data.Results?.series ?? []) {
		// Prefer annual average (M13), then most recent monthly
		const annual = s.data.find(d => d.period === "M13");
		const latest = s.data.sort((a, b) => Number(b.year) - Number(a.year))[0];
		const entry = annual ?? latest;
		if (entry) {
			const val = parseFloat(entry.value);
			if (!isNaN(val)) result.set(s.seriesID, val);
		}
	}
	return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	if (!KEY) {
		console.error("❌  BLS_API_KEY not set in .env.local");
		process.exit(1);
	}

	// ── Pass 1: State-level unemployment rates ──────────────────────────────
	console.log("📊 Fetching state-level unemployment rates (LAUS)...");

	const stateSeriesIds = Object.entries(STATE_FIPS).map(
		([, fips]) => `LASST${fips}0000000000003`
	);

	const stateRates = await fetchBLSSeries(stateSeriesIds);
	console.log(`   Got rates for ${stateRates.size}/51 states`);

	// Build stateId → rate map
	const stateUnemployment = new Map<string, number>();
	for (const [stateId, fips] of Object.entries(STATE_FIPS)) {
		const seriesId = `LASST${fips}0000000000003`;
		const rate = stateRates.get(seriesId);
		if (rate !== undefined) stateUnemployment.set(stateId, rate);
	}

	// Print sample
	for (const [s, r] of [...stateUnemployment.entries()].slice(0, 6)) {
		console.log(`   ${s}: ${r}%`);
	}

	// ── Pass 2: Apply state rates to all cities ─────────────────────────────
	const cities = sqlite
		.prepare("SELECT id, state_id FROM cities ORDER BY overall_score DESC")
		.all() as Array<{ id: string; state_id: string }>;

	console.log(`\n🏙️  Applying rates to ${cities.length} cities...`);

	let updated = 0; let skipped = 0;
	const updateStmt = sqlite.prepare(
		"UPDATE city_jobs SET unemployment_rate = ? WHERE city_id = ?"
	);
	const insertStmt = sqlite.prepare(
		"INSERT OR IGNORE INTO city_jobs (id, city_id, unemployment_rate) VALUES (lower(hex(randomblob(16))), ?, ?)"
	);
	const existsStmt = sqlite.prepare("SELECT id FROM city_jobs WHERE city_id = ?");

	for (const city of cities) {
		const rate = stateUnemployment.get(city.state_id);
		if (rate === undefined) { skipped++; continue; }

		if (!DRY_RUN) {
			const existing = existsStmt.get(city.id);
			if (existing) {
				updateStmt.run(rate, city.id);
			} else {
				insertStmt.run(city.id, rate);
			}
		}
		updated++;
	}

	console.log(`   ✅ Updated: ${updated}, Skipped (no state data): ${skipped}`);

	// ── Pass 3: MSA-level data for major metros (optional) ─────────────────
	if (!SKIP_MSA) {
		console.log("\n🏢 Fetching MSA-level rates for major metros...");

		// Top 50 MSA LAUS codes (LAUMT + 4-digit state + 5-digit area + suffix)
		// Format: LAUMT{stateFips2}{areaCBSACode}0000000003
		// Source: BLS LAUS geographic definitions
		const msaData: Array<{ stateId: string; seriesId: string; cityNames: string[] }> = [
			{ stateId: "NY", seriesId: "LAUMT364200000000003", cityNames: ["New York", "Newark", "Jersey City"] },
			{ stateId: "CA", seriesId: "LAUMT063100000000003", cityNames: ["Los Angeles", "Long Beach", "Anaheim"] },
			{ stateId: "IL", seriesId: "LAUMT170140000000003", cityNames: ["Chicago", "Naperville", "Elgin"] },
			{ stateId: "TX", seriesId: "LAUMT481910000000003", cityNames: ["Dallas", "Fort Worth", "Arlington"] },
			{ stateId: "TX", seriesId: "LAUMT483360000000003", cityNames: ["Houston", "Pasadena", "Sugar Land"] },
			{ stateId: "DC", seriesId: "LAUMT117900000000003", cityNames: ["Washington", "Arlington", "Alexandria"] },
			{ stateId: "FL", seriesId: "LAUMT123600000000003", cityNames: ["Miami", "Hialeah", "Fort Lauderdale"] },
			{ stateId: "PA", seriesId: "LAUMT423700000000003", cityNames: ["Philadelphia", "Camden"] },
			{ stateId: "GA", seriesId: "LAUMT130120000000003", cityNames: ["Atlanta", "Sandy Springs", "Marietta"] },
			{ stateId: "MA", seriesId: "LAUMT250714000000003", cityNames: ["Boston", "Cambridge", "Newton"] },
			{ stateId: "AZ", seriesId: "LAUMT043800000000003", cityNames: ["Phoenix", "Mesa", "Chandler", "Scottsdale"] },
			{ stateId: "WA", seriesId: "LAUMT537600000000003", cityNames: ["Seattle", "Tacoma", "Bellevue"] },
			{ stateId: "MN", seriesId: "LAUMT273300000000003", cityNames: ["Minneapolis", "St Paul", "Bloomington"] },
			{ stateId: "CA", seriesId: "LAUMT067600000000003", cityNames: ["San Francisco", "Oakland", "Berkeley"] },
			{ stateId: "CA", seriesId: "LAUMT067400000000003", cityNames: ["San Jose", "Sunnyvale", "Santa Clara"] },
			{ stateId: "CA", seriesId: "LAUMT064100000000003", cityNames: ["San Diego", "Chula Vista", "Carlsbad"] },
			{ stateId: "CO", seriesId: "LAUMT081900000000003", cityNames: ["Denver", "Aurora", "Lakewood"] },
			{ stateId: "OR", seriesId: "LAUMT413800000000003", cityNames: ["Portland", "Vancouver", "Beaverton"] },
			{ stateId: "MO", seriesId: "LAUMT293400000000003", cityNames: ["St Louis", "Clayton", "O'Fallon"] },
			{ stateId: "TX", seriesId: "LAUMT481200000000003", cityNames: ["Austin", "Round Rock", "Georgetown"] },
			{ stateId: "NC", seriesId: "LAUMT370200000000003", cityNames: ["Charlotte", "Gastonia", "Concord"] },
			{ stateId: "FL", seriesId: "LAUMT124200000000003", cityNames: ["Orlando", "Kissimmee", "Sanford"] },
			{ stateId: "TX", seriesId: "LAUMT484260000000003", cityNames: ["San Antonio", "New Braunfels"] },
			{ stateId: "CA", seriesId: "LAUMT065200000000003", cityNames: ["Riverside", "San Bernardino", "Ontario"] },
			{ stateId: "OH", seriesId: "LAUMT391840000000003", cityNames: ["Columbus", "Dublin", "Westerville"] },
			{ stateId: "NV", seriesId: "LAUMT322900000000003", cityNames: ["Las Vegas", "Henderson", "North Las Vegas"] },
			{ stateId: "FL", seriesId: "LAUMT124600000000003", cityNames: ["Jacksonville", "St Augustine"] },
			{ stateId: "VA", seriesId: "LAUMT515440000000003", cityNames: ["Virginia Beach", "Norfolk", "Chesapeake"] },
			{ stateId: "TN", seriesId: "LAUMT473400000000003", cityNames: ["Nashville", "Franklin", "Murfreesboro"] },
			{ stateId: "UT", seriesId: "LAUMT490260000000003", cityNames: ["Salt Lake City", "West Valley City", "Sandy"] },
		];

		const msaSeriesIds = msaData.map(m => m.seriesId);

		try {
			const msaRates = await fetchBLSSeries(msaSeriesIds);
			let msaUpdated = 0;

			for (const { seriesId, cityNames } of msaData) {
				const rate = msaRates.get(seriesId);
				if (rate === undefined) continue;

				for (const cityName of cityNames) {
					const cityRows = sqlite
						.prepare("SELECT c.id FROM cities c JOIN city_jobs j ON j.city_id = c.id WHERE LOWER(c.name) = LOWER(?)")
						.all(cityName) as Array<{ id: string }>;

					if (!DRY_RUN) {
						for (const { id } of cityRows) {
							updateStmt.run(rate, id);
							msaUpdated++;
						}
					} else {
						msaUpdated += cityRows.length;
					}
				}
			}

			console.log(`   ✅ MSA precision updates: ${msaUpdated} cities`);
		} catch (e) {
			console.log(`   ⚠️  MSA pass failed (non-fatal): ${e}`);
		}
	}

	// ── Summary ──────────────────────────────────────────────────────────────
	const withRate = (sqlite.prepare("SELECT COUNT(*) as c FROM city_jobs WHERE unemployment_rate > 0").get() as { c: number }).c;
	console.log(`\n✅ Done! Cities with unemployment rate: ${withRate}/${cities.length}`);
	if (DRY_RUN) console.log("   (DRY RUN — no changes written)");

	sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
