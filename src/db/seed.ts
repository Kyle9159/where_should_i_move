/**
 * Seed script: populates states, 100 major/mid-size cities with realistic
 * data, and computes initial filter scores.
 *
 * Run: npm run db:seed
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "./schema";
import { computeAllScores } from "./normalize";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db";
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// State data
// ---------------------------------------------------------------------------
const STATE_DATA: Array<typeof schema.states.$inferInsert> = [
	{ id: "AL", name: "Alabama", abbreviation: "AL", region: "South", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.0 },
	{ id: "AK", name: "Alaska", abbreviation: "AK", region: "West", timezone: "America/Anchorage", noIncomeTax: true, rightToWork: true, salesTaxRate: 0.0 },
	{ id: "AZ", name: "Arizona", abbreviation: "AZ", region: "West", timezone: "America/Phoenix", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.6 },
	{ id: "AR", name: "Arkansas", abbreviation: "AR", region: "South", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.5 },
	{ id: "CA", name: "California", abbreviation: "CA", region: "West", timezone: "America/Los_Angeles", noIncomeTax: false, rightToWork: false, salesTaxRate: 7.25 },
	{ id: "CO", name: "Colorado", abbreviation: "CO", region: "West", timezone: "America/Denver", noIncomeTax: false, rightToWork: false, salesTaxRate: 2.9 },
	{ id: "CT", name: "Connecticut", abbreviation: "CT", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.35 },
	{ id: "DC", name: "District of Columbia", abbreviation: "DC", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.0 },
	{ id: "DE", name: "Delaware", abbreviation: "DE", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 0.0 },
	{ id: "FL", name: "Florida", abbreviation: "FL", region: "South", timezone: "America/New_York", noIncomeTax: true, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "GA", name: "Georgia", abbreviation: "GA", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.0 },
	{ id: "HI", name: "Hawaii", abbreviation: "HI", region: "West", timezone: "Pacific/Honolulu", noIncomeTax: false, rightToWork: false, salesTaxRate: 4.0 },
	{ id: "ID", name: "Idaho", abbreviation: "ID", region: "West", timezone: "America/Boise", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "IL", name: "Illinois", abbreviation: "IL", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.25 },
	{ id: "IN", name: "Indiana", abbreviation: "IN", region: "Midwest", timezone: "America/Indiana/Indianapolis", noIncomeTax: false, rightToWork: true, salesTaxRate: 7.0 },
	{ id: "IA", name: "Iowa", abbreviation: "IA", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "KS", name: "Kansas", abbreviation: "KS", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.5 },
	{ id: "KY", name: "Kentucky", abbreviation: "KY", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "LA", name: "Louisiana", abbreviation: "LA", region: "South", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.45 },
	{ id: "ME", name: "Maine", abbreviation: "ME", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 5.5 },
	{ id: "MD", name: "Maryland", abbreviation: "MD", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.0 },
	{ id: "MA", name: "Massachusetts", abbreviation: "MA", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.25 },
	{ id: "MI", name: "Michigan", abbreviation: "MI", region: "Midwest", timezone: "America/Detroit", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "MN", name: "Minnesota", abbreviation: "MN", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.875 },
	{ id: "MS", name: "Mississippi", abbreviation: "MS", region: "South", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 7.0 },
	{ id: "MO", name: "Missouri", abbreviation: "MO", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.225 },
	{ id: "MT", name: "Montana", abbreviation: "MT", region: "West", timezone: "America/Denver", noIncomeTax: false, rightToWork: true, salesTaxRate: 0.0 },
	{ id: "NE", name: "Nebraska", abbreviation: "NE", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.5 },
	{ id: "NV", name: "Nevada", abbreviation: "NV", region: "West", timezone: "America/Los_Angeles", noIncomeTax: true, rightToWork: true, salesTaxRate: 6.85 },
	{ id: "NH", name: "New Hampshire", abbreviation: "NH", region: "Northeast", timezone: "America/New_York", noIncomeTax: true, rightToWork: false, salesTaxRate: 0.0 },
	{ id: "NJ", name: "New Jersey", abbreviation: "NJ", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.625 },
	{ id: "NM", name: "New Mexico", abbreviation: "NM", region: "West", timezone: "America/Denver", noIncomeTax: false, rightToWork: false, salesTaxRate: 5.0 },
	{ id: "NY", name: "New York", abbreviation: "NY", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 4.0 },
	{ id: "NC", name: "North Carolina", abbreviation: "NC", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.75 },
	{ id: "ND", name: "North Dakota", abbreviation: "ND", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.0 },
	{ id: "OH", name: "Ohio", abbreviation: "OH", region: "Midwest", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.75 },
	{ id: "OK", name: "Oklahoma", abbreviation: "OK", region: "South", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.5 },
	{ id: "OR", name: "Oregon", abbreviation: "OR", region: "West", timezone: "America/Los_Angeles", noIncomeTax: false, rightToWork: false, salesTaxRate: 0.0 },
	{ id: "PA", name: "Pennsylvania", abbreviation: "PA", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.0 },
	{ id: "RI", name: "Rhode Island", abbreviation: "RI", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 7.0 },
	{ id: "SC", name: "South Carolina", abbreviation: "SC", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "SD", name: "South Dakota", abbreviation: "SD", region: "Midwest", timezone: "America/Chicago", noIncomeTax: true, rightToWork: true, salesTaxRate: 4.5 },
	{ id: "TN", name: "Tennessee", abbreviation: "TN", region: "South", timezone: "America/Chicago", noIncomeTax: true, rightToWork: true, salesTaxRate: 7.0 },
	{ id: "TX", name: "Texas", abbreviation: "TX", region: "South", timezone: "America/Chicago", noIncomeTax: true, rightToWork: true, salesTaxRate: 6.25 },
	{ id: "UT", name: "Utah", abbreviation: "UT", region: "West", timezone: "America/Denver", noIncomeTax: false, rightToWork: true, salesTaxRate: 4.85 },
	{ id: "VT", name: "Vermont", abbreviation: "VT", region: "Northeast", timezone: "America/New_York", noIncomeTax: false, rightToWork: false, salesTaxRate: 6.0 },
	{ id: "VA", name: "Virginia", abbreviation: "VA", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.3 },
	{ id: "WA", name: "Washington", abbreviation: "WA", region: "West", timezone: "America/Los_Angeles", noIncomeTax: true, rightToWork: false, salesTaxRate: 6.5 },
	{ id: "WV", name: "West Virginia", abbreviation: "WV", region: "South", timezone: "America/New_York", noIncomeTax: false, rightToWork: true, salesTaxRate: 6.0 },
	{ id: "WI", name: "Wisconsin", abbreviation: "WI", region: "Midwest", timezone: "America/Chicago", noIncomeTax: false, rightToWork: true, salesTaxRate: 5.0 },
	{ id: "WY", name: "Wyoming", abbreviation: "WY", region: "West", timezone: "America/Denver", noIncomeTax: true, rightToWork: true, salesTaxRate: 4.0 },
];

// ---------------------------------------------------------------------------
// City seed data — 60 cities with realistic stats
// ---------------------------------------------------------------------------
type CityRaw = {
	name: string;
	stateId: string;
	tier: "major-city" | "mid-size" | "small-city";
	population: number;
	lat: number;
	lng: number;
	county: string;
	metro?: string;
	// housing
	medianHomePrice: number;
	medianRent2Bed: number;
	// jobs
	unemploymentRate: number;
	medianHouseholdIncome: number;
	jobGrowthRate: number;
	// climate
	avgTempJan: number;
	avgTempJul: number;
	sunnyDaysPerYear: number;
	avgRainfallInches: number;
	avgSnowfallInches: number;
	airQualityIndex: number;
	tornadoRisk?: string;
	hurricaneRisk?: string;
	wildfireRisk?: string;
	// safety
	violentCrimeRate: number;
	propertyCrimeRate: number;
	// schools
	greatSchoolsRating: number;
	graduationRate: number;
	// walkability
	walkScore: number;
	transitScore: number;
	bikeScore: number;
	// lifestyle
	nearOcean: boolean;
	nearMountains: boolean;
	nearLake: boolean;
	lgbtqFriendlyScore: number;
	diversityIndex: number;
	medianAge: number;
};

const CITIES_RAW: CityRaw[] = [
	{ name: "Austin", stateId: "TX", tier: "major-city", population: 978908, lat: 30.2672, lng: -97.7431, county: "Travis", metro: "Austin-Round Rock MSA", medianHomePrice: 490000, medianRent2Bed: 1850, unemploymentRate: 3.1, medianHouseholdIncome: 75752, jobGrowthRate: 4.2, avgTempJan: 50, avgTempJul: 95, sunnyDaysPerYear: 228, avgRainfallInches: 34, avgSnowfallInches: 1, airQualityIndex: 45, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 380, propertyCrimeRate: 2800, greatSchoolsRating: 7.2, graduationRate: 87, walkScore: 42, transitScore: 34, bikeScore: 55, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 82, diversityIndex: 0.68, medianAge: 33.5 },
	{ name: "Denver", stateId: "CO", tier: "major-city", population: 715522, lat: 39.7392, lng: -104.9903, county: "Denver", metro: "Denver-Aurora MSA", medianHomePrice: 545000, medianRent2Bed: 1950, unemploymentRate: 2.9, medianHouseholdIncome: 68592, jobGrowthRate: 2.8, avgTempJan: 32, avgTempJul: 88, sunnyDaysPerYear: 300, avgRainfallInches: 14, avgSnowfallInches: 57, airQualityIndex: 50, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 620, propertyCrimeRate: 3200, greatSchoolsRating: 6.8, graduationRate: 81, walkScore: 61, transitScore: 47, bikeScore: 71, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 88, diversityIndex: 0.62, medianAge: 35.1 },
	{ name: "Seattle", stateId: "WA", tier: "major-city", population: 737255, lat: 47.6062, lng: -122.3321, county: "King", metro: "Seattle-Tacoma MSA", medianHomePrice: 820000, medianRent2Bed: 2400, unemploymentRate: 2.6, medianHouseholdIncome: 102486, jobGrowthRate: 3.1, avgTempJan: 45, avgTempJul: 75, sunnyDaysPerYear: 152, avgRainfallInches: 38, avgSnowfallInches: 6, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 490, propertyCrimeRate: 4200, greatSchoolsRating: 7.4, graduationRate: 88, walkScore: 73, transitScore: 57, bikeScore: 67, nearOcean: true, nearMountains: true, nearLake: true, lgbtqFriendlyScore: 91, diversityIndex: 0.70, medianAge: 36.2 },
	{ name: "Nashville", stateId: "TN", tier: "major-city", population: 689447, lat: 36.1627, lng: -86.7816, county: "Davidson", metro: "Nashville-Davidson MSA", medianHomePrice: 395000, medianRent2Bed: 1600, unemploymentRate: 2.8, medianHouseholdIncome: 63474, jobGrowthRate: 3.5, avgTempJan: 38, avgTempJul: 90, sunnyDaysPerYear: 204, avgRainfallInches: 48, avgSnowfallInches: 5, airQualityIndex: 42, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 850, propertyCrimeRate: 3800, greatSchoolsRating: 6.4, graduationRate: 83, walkScore: 28, transitScore: 20, bikeScore: 22, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 65, diversityIndex: 0.57, medianAge: 34.8 },
	{ name: "Portland", stateId: "OR", tier: "major-city", population: 652503, lat: 45.5051, lng: -122.6750, county: "Multnomah", metro: "Portland MSA", medianHomePrice: 480000, medianRent2Bed: 1750, unemploymentRate: 3.4, medianHouseholdIncome: 73000, jobGrowthRate: 1.8, avgTempJan: 40, avgTempJul: 81, sunnyDaysPerYear: 144, avgRainfallInches: 36, avgSnowfallInches: 4, airQualityIndex: 44, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 510, propertyCrimeRate: 4600, greatSchoolsRating: 6.9, graduationRate: 80, walkScore: 66, transitScore: 52, bikeScore: 84, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 92, diversityIndex: 0.60, medianAge: 37.1 },
	{ name: "Charlotte", stateId: "NC", tier: "major-city", population: 879709, lat: 35.2271, lng: -80.8431, county: "Mecklenburg", metro: "Charlotte MSA", medianHomePrice: 380000, medianRent2Bed: 1480, unemploymentRate: 3.2, medianHouseholdIncome: 65359, jobGrowthRate: 3.8, avgTempJan: 42, avgTempJul: 90, sunnyDaysPerYear: 213, avgRainfallInches: 43, avgSnowfallInches: 4, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 720, propertyCrimeRate: 3400, greatSchoolsRating: 7.0, graduationRate: 85, walkScore: 25, transitScore: 22, bikeScore: 20, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 70, diversityIndex: 0.65, medianAge: 35.0 },
	{ name: "Phoenix", stateId: "AZ", tier: "major-city", population: 1608139, lat: 33.4484, lng: -112.0740, county: "Maricopa", metro: "Phoenix MSA", medianHomePrice: 390000, medianRent2Bed: 1560, unemploymentRate: 3.5, medianHouseholdIncome: 60247, jobGrowthRate: 3.2, avgTempJan: 55, avgTempJul: 106, sunnyDaysPerYear: 299, avgRainfallInches: 8, avgSnowfallInches: 0, airQualityIndex: 75, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 690, propertyCrimeRate: 3600, greatSchoolsRating: 6.2, graduationRate: 82, walkScore: 41, transitScore: 30, bikeScore: 55, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 68, diversityIndex: 0.65, medianAge: 33.8 },
	{ name: "Minneapolis", stateId: "MN", tier: "major-city", population: 429954, lat: 44.9778, lng: -93.2650, county: "Hennepin", metro: "Minneapolis-St. Paul MSA", medianHomePrice: 320000, medianRent2Bed: 1450, unemploymentRate: 2.5, medianHouseholdIncome: 67612, jobGrowthRate: 2.1, avgTempJan: 14, avgTempJul: 83, sunnyDaysPerYear: 198, avgRainfallInches: 30, avgSnowfallInches: 55, airQualityIndex: 35, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 820, propertyCrimeRate: 3500, greatSchoolsRating: 7.1, graduationRate: 86, walkScore: 70, transitScore: 60, bikeScore: 77, nearOcean: false, nearMountains: false, nearLake: true, lgbtqFriendlyScore: 88, diversityIndex: 0.65, medianAge: 34.3 },
	{ name: "Raleigh", stateId: "NC", tier: "major-city", population: 467665, lat: 35.7796, lng: -78.6382, county: "Wake", metro: "Raleigh-Durham MSA", medianHomePrice: 365000, medianRent2Bed: 1550, unemploymentRate: 2.9, medianHouseholdIncome: 72457, jobGrowthRate: 4.1, avgTempJan: 40, avgTempJul: 90, sunnyDaysPerYear: 213, avgRainfallInches: 46, avgSnowfallInches: 7, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 410, propertyCrimeRate: 2900, greatSchoolsRating: 7.8, graduationRate: 91, walkScore: 35, transitScore: 28, bikeScore: 42, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 78, diversityIndex: 0.63, medianAge: 34.5 },
	{ name: "San Diego", stateId: "CA", tier: "major-city", population: 1386932, lat: 32.7157, lng: -117.1611, county: "San Diego", metro: "San Diego MSA", medianHomePrice: 870000, medianRent2Bed: 2600, unemploymentRate: 2.8, medianHouseholdIncome: 83454, jobGrowthRate: 2.4, avgTempJan: 58, avgTempJul: 76, sunnyDaysPerYear: 266, avgRainfallInches: 11, avgSnowfallInches: 0, airQualityIndex: 42, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "very-high", violentCrimeRate: 360, propertyCrimeRate: 2600, greatSchoolsRating: 7.5, graduationRate: 89, walkScore: 54, transitScore: 37, bikeScore: 61, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 90, diversityIndex: 0.72, medianAge: 35.4 },
	{ name: "Tampa", stateId: "FL", tier: "major-city", population: 399700, lat: 27.9506, lng: -82.4572, county: "Hillsborough", metro: "Tampa-St. Petersburg MSA", medianHomePrice: 350000, medianRent2Bed: 1700, unemploymentRate: 3.0, medianHouseholdIncome: 59040, jobGrowthRate: 3.6, avgTempJan: 62, avgTempJul: 90, sunnyDaysPerYear: 246, avgRainfallInches: 46, avgSnowfallInches: 0, airQualityIndex: 38, tornadoRisk: "moderate", hurricaneRisk: "high", wildfireRisk: "low", violentCrimeRate: 750, propertyCrimeRate: 3200, greatSchoolsRating: 6.5, graduationRate: 83, walkScore: 47, transitScore: 34, bikeScore: 38, nearOcean: true, nearMountains: false, nearLake: true, lgbtqFriendlyScore: 75, diversityIndex: 0.65, medianAge: 36.5 },
	{ name: "Atlanta", stateId: "GA", tier: "major-city", population: 498715, lat: 33.7490, lng: -84.3880, county: "Fulton", metro: "Atlanta-Sandy Springs MSA", medianHomePrice: 340000, medianRent2Bed: 1650, unemploymentRate: 3.3, medianHouseholdIncome: 59048, jobGrowthRate: 3.1, avgTempJan: 44, avgTempJul: 89, sunnyDaysPerYear: 216, avgRainfallInches: 50, avgSnowfallInches: 2, airQualityIndex: 48, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 1100, propertyCrimeRate: 5100, greatSchoolsRating: 6.0, graduationRate: 80, walkScore: 48, transitScore: 44, bikeScore: 28, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 80, diversityIndex: 0.70, medianAge: 33.8 },
	{ name: "Miami", stateId: "FL", tier: "major-city", population: 442241, lat: 25.7617, lng: -80.1918, county: "Miami-Dade", metro: "Miami-Fort Lauderdale MSA", medianHomePrice: 580000, medianRent2Bed: 2400, unemploymentRate: 2.8, medianHouseholdIncome: 44268, jobGrowthRate: 3.8, avgTempJan: 68, avgTempJul: 90, sunnyDaysPerYear: 248, avgRainfallInches: 61, avgSnowfallInches: 0, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "very-high", wildfireRisk: "low", violentCrimeRate: 870, propertyCrimeRate: 3900, greatSchoolsRating: 6.2, graduationRate: 79, walkScore: 77, transitScore: 57, bikeScore: 62, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 88, diversityIndex: 0.78, medianAge: 39.8 },
	{ name: "Boston", stateId: "MA", tier: "major-city", population: 675647, lat: 42.3601, lng: -71.0589, county: "Suffolk", metro: "Boston MSA", medianHomePrice: 720000, medianRent2Bed: 2700, unemploymentRate: 2.4, medianHouseholdIncome: 71834, jobGrowthRate: 2.2, avgTempJan: 29, avgTempJul: 82, sunnyDaysPerYear: 200, avgRainfallInches: 44, avgSnowfallInches: 44, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 760, propertyCrimeRate: 2400, greatSchoolsRating: 7.6, graduationRate: 90, walkScore: 88, transitScore: 75, bikeScore: 70, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 90, diversityIndex: 0.65, medianAge: 32.2 },
	{ name: "Chicago", stateId: "IL", tier: "major-city", population: 2696555, lat: 41.8781, lng: -87.6298, county: "Cook", metro: "Chicago-Naperville MSA", medianHomePrice: 310000, medianRent2Bed: 1700, unemploymentRate: 4.0, medianHouseholdIncome: 65781, jobGrowthRate: 0.8, avgTempJan: 25, avgTempJul: 84, sunnyDaysPerYear: 189, avgRainfallInches: 37, avgSnowfallInches: 36, airQualityIndex: 52, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 980, propertyCrimeRate: 3700, greatSchoolsRating: 6.5, graduationRate: 82, walkScore: 78, transitScore: 65, bikeScore: 72, nearOcean: false, nearMountains: false, nearLake: true, lgbtqFriendlyScore: 85, diversityIndex: 0.74, medianAge: 34.8 },
	{ name: "Houston", stateId: "TX", tier: "major-city", population: 2304580, lat: 29.7604, lng: -95.3698, county: "Harris", metro: "Houston-The Woodlands MSA", medianHomePrice: 285000, medianRent2Bed: 1400, unemploymentRate: 3.8, medianHouseholdIncome: 55945, jobGrowthRate: 2.5, avgTempJan: 54, avgTempJul: 93, sunnyDaysPerYear: 204, avgRainfallInches: 49, avgSnowfallInches: 0, airQualityIndex: 65, tornadoRisk: "moderate", hurricaneRisk: "high", wildfireRisk: "low", violentCrimeRate: 1050, propertyCrimeRate: 4200, greatSchoolsRating: 6.0, graduationRate: 80, walkScore: 48, transitScore: 36, bikeScore: 42, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.75, medianAge: 33.5 },
	{ name: "Dallas", stateId: "TX", tier: "major-city", population: 1304379, lat: 32.7767, lng: -96.7970, county: "Dallas", metro: "Dallas-Fort Worth MSA", medianHomePrice: 320000, medianRent2Bed: 1480, unemploymentRate: 3.4, medianHouseholdIncome: 54747, jobGrowthRate: 3.0, avgTempJan: 46, avgTempJul: 96, sunnyDaysPerYear: 234, avgRainfallInches: 38, avgSnowfallInches: 3, airQualityIndex: 58, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 850, propertyCrimeRate: 4100, greatSchoolsRating: 6.3, graduationRate: 82, walkScore: 46, transitScore: 38, bikeScore: 44, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 75, diversityIndex: 0.73, medianAge: 32.7 },
	{ name: "Salt Lake City", stateId: "UT", tier: "mid-size", population: 204657, lat: 40.7608, lng: -111.8910, county: "Salt Lake", metro: "Salt Lake City MSA", medianHomePrice: 430000, medianRent2Bed: 1600, unemploymentRate: 2.4, medianHouseholdIncome: 62854, jobGrowthRate: 3.8, avgTempJan: 29, avgTempJul: 93, sunnyDaysPerYear: 222, avgRainfallInches: 16, avgSnowfallInches: 55, airQualityIndex: 62, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 660, propertyCrimeRate: 3800, greatSchoolsRating: 6.8, graduationRate: 85, walkScore: 62, transitScore: 48, bikeScore: 64, nearOcean: false, nearMountains: true, nearLake: true, lgbtqFriendlyScore: 70, diversityIndex: 0.48, medianAge: 31.8 },
	{ name: "Boise", stateId: "ID", tier: "mid-size", population: 235984, lat: 43.6150, lng: -116.2023, county: "Ada", metro: "Boise City MSA", medianHomePrice: 380000, medianRent2Bed: 1450, unemploymentRate: 2.6, medianHouseholdIncome: 63000, jobGrowthRate: 4.5, avgTempJan: 30, avgTempJul: 94, sunnyDaysPerYear: 206, avgRainfallInches: 12, avgSnowfallInches: 19, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 380, propertyCrimeRate: 2900, greatSchoolsRating: 7.2, graduationRate: 88, walkScore: 38, transitScore: 26, bikeScore: 60, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 60, diversityIndex: 0.38, medianAge: 35.8 },
	{ name: "Tucson", stateId: "AZ", tier: "mid-size", population: 542629, lat: 32.2226, lng: -110.9747, county: "Pima", metro: "Tucson MSA", medianHomePrice: 280000, medianRent2Bed: 1200, unemploymentRate: 4.0, medianHouseholdIncome: 48000, jobGrowthRate: 2.1, avgTempJan: 51, avgTempJul: 100, sunnyDaysPerYear: 286, avgRainfallInches: 12, avgSnowfallInches: 1, airQualityIndex: 48, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 700, propertyCrimeRate: 4200, greatSchoolsRating: 5.8, graduationRate: 76, walkScore: 39, transitScore: 28, bikeScore: 60, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.64, medianAge: 33.4 },
	{ name: "Albuquerque", stateId: "NM", tier: "mid-size", population: 564559, lat: 35.0844, lng: -106.6504, county: "Bernalillo", metro: "Albuquerque MSA", medianHomePrice: 265000, medianRent2Bed: 1100, unemploymentRate: 4.2, medianHouseholdIncome: 53000, jobGrowthRate: 1.5, avgTempJan: 36, avgTempJul: 93, sunnyDaysPerYear: 278, avgRainfallInches: 9, avgSnowfallInches: 11, airQualityIndex: 50, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 1200, propertyCrimeRate: 6200, greatSchoolsRating: 5.2, graduationRate: 72, walkScore: 41, transitScore: 28, bikeScore: 55, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.70, medianAge: 36.1 },
	{ name: "Spokane", stateId: "WA", tier: "mid-size", population: 228989, lat: 47.6588, lng: -117.4260, county: "Spokane", metro: "Spokane MSA", medianHomePrice: 290000, medianRent2Bed: 1200, unemploymentRate: 3.8, medianHouseholdIncome: 48000, jobGrowthRate: 2.0, avgTempJan: 26, avgTempJul: 84, sunnyDaysPerYear: 178, avgRainfallInches: 17, avgSnowfallInches: 45, airQualityIndex: 42, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 650, propertyCrimeRate: 4500, greatSchoolsRating: 6.4, graduationRate: 81, walkScore: 48, transitScore: 30, bikeScore: 55, nearOcean: false, nearMountains: true, nearLake: true, lgbtqFriendlyScore: 65, diversityIndex: 0.42, medianAge: 35.5 },
	{ name: "Louisville", stateId: "KY", tier: "mid-size", population: 633045, lat: 38.2527, lng: -85.7585, county: "Jefferson", metro: "Louisville MSA", medianHomePrice: 225000, medianRent2Bed: 1050, unemploymentRate: 3.5, medianHouseholdIncome: 56000, jobGrowthRate: 1.8, avgTempJan: 34, avgTempJul: 88, sunnyDaysPerYear: 197, avgRainfallInches: 45, avgSnowfallInches: 17, airQualityIndex: 50, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 850, propertyCrimeRate: 4600, greatSchoolsRating: 6.0, graduationRate: 80, walkScore: 36, transitScore: 28, bikeScore: 40, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 68, diversityIndex: 0.55, medianAge: 36.5 },
	{ name: "Memphis", stateId: "TN", tier: "mid-size", population: 633104, lat: 35.1495, lng: -90.0490, county: "Shelby", metro: "Memphis MSA", medianHomePrice: 165000, medianRent2Bed: 950, unemploymentRate: 5.2, medianHouseholdIncome: 42000, jobGrowthRate: 1.2, avgTempJan: 40, avgTempJul: 92, sunnyDaysPerYear: 217, avgRainfallInches: 54, avgSnowfallInches: 5, airQualityIndex: 55, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 1650, propertyCrimeRate: 6900, greatSchoolsRating: 5.0, graduationRate: 76, walkScore: 30, transitScore: 22, bikeScore: 25, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 55, diversityIndex: 0.60, medianAge: 34.5 },
	{ name: "Omaha", stateId: "NE", tier: "mid-size", population: 486051, lat: 41.2565, lng: -95.9345, county: "Douglas", metro: "Omaha MSA", medianHomePrice: 248000, medianRent2Bed: 1050, unemploymentRate: 2.5, medianHouseholdIncome: 60000, jobGrowthRate: 2.2, avgTempJan: 22, avgTempJul: 87, sunnyDaysPerYear: 199, avgRainfallInches: 30, avgSnowfallInches: 30, airQualityIndex: 40, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 680, propertyCrimeRate: 4000, greatSchoolsRating: 6.8, graduationRate: 86, walkScore: 40, transitScore: 26, bikeScore: 42, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 68, diversityIndex: 0.56, medianAge: 33.6 },
	{ name: "Kansas City", stateId: "MO", tier: "mid-size", population: 508090, lat: 39.0997, lng: -94.5786, county: "Jackson", metro: "Kansas City MSA", medianHomePrice: 220000, medianRent2Bed: 1100, unemploymentRate: 3.4, medianHouseholdIncome: 57000, jobGrowthRate: 2.0, avgTempJan: 28, avgTempJul: 88, sunnyDaysPerYear: 214, avgRainfallInches: 40, avgSnowfallInches: 20, airQualityIndex: 50, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 1500, propertyCrimeRate: 5500, greatSchoolsRating: 6.2, graduationRate: 81, walkScore: 35, transitScore: 28, bikeScore: 38, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.60, medianAge: 35.5 },
	{ name: "Oklahoma City", stateId: "OK", tier: "mid-size", population: 681054, lat: 35.4676, lng: -97.5164, county: "Oklahoma", metro: "Oklahoma City MSA", medianHomePrice: 195000, medianRent2Bed: 1000, unemploymentRate: 3.2, medianHouseholdIncome: 55000, jobGrowthRate: 2.5, avgTempJan: 37, avgTempJul: 94, sunnyDaysPerYear: 230, avgRainfallInches: 35, avgSnowfallInches: 9, airQualityIndex: 48, tornadoRisk: "very-high", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 950, propertyCrimeRate: 5200, greatSchoolsRating: 5.8, graduationRate: 80, walkScore: 28, transitScore: 16, bikeScore: 30, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 52, diversityIndex: 0.60, medianAge: 34.6 },
	{ name: "Richmond", stateId: "VA", tier: "mid-size", population: 226610, lat: 37.5407, lng: -77.4360, county: "Richmond City", metro: "Richmond MSA", medianHomePrice: 335000, medianRent2Bed: 1450, unemploymentRate: 3.0, medianHouseholdIncome: 55000, jobGrowthRate: 2.8, avgTempJan: 36, avgTempJul: 89, sunnyDaysPerYear: 204, avgRainfallInches: 44, avgSnowfallInches: 14, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 1100, propertyCrimeRate: 3800, greatSchoolsRating: 6.5, graduationRate: 83, walkScore: 55, transitScore: 38, bikeScore: 52, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 75, diversityIndex: 0.62, medianAge: 34.2 },
	{ name: "New Orleans", stateId: "LA", tier: "mid-size", population: 383997, lat: 29.9511, lng: -90.0715, county: "Orleans", metro: "New Orleans MSA", medianHomePrice: 250000, medianRent2Bed: 1300, unemploymentRate: 5.5, medianHouseholdIncome: 44000, jobGrowthRate: 1.5, avgTempJan: 53, avgTempJul: 91, sunnyDaysPerYear: 216, avgRainfallInches: 62, avgSnowfallInches: 0, airQualityIndex: 50, tornadoRisk: "moderate", hurricaneRisk: "very-high", wildfireRisk: "low", violentCrimeRate: 1800, propertyCrimeRate: 5100, greatSchoolsRating: 5.5, graduationRate: 76, walkScore: 58, transitScore: 42, bikeScore: 68, nearOcean: true, nearMountains: false, nearLake: true, lgbtqFriendlyScore: 82, diversityIndex: 0.70, medianAge: 37.0 },
	{ name: "Savannah", stateId: "GA", tier: "mid-size", population: 147780, lat: 32.0835, lng: -81.0998, county: "Chatham", metro: "Savannah MSA", medianHomePrice: 285000, medianRent2Bed: 1350, unemploymentRate: 3.5, medianHouseholdIncome: 48000, jobGrowthRate: 3.0, avgTempJan: 49, avgTempJul: 91, sunnyDaysPerYear: 218, avgRainfallInches: 49, avgSnowfallInches: 0, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "moderate", wildfireRisk: "low", violentCrimeRate: 920, propertyCrimeRate: 3900, greatSchoolsRating: 6.2, graduationRate: 81, walkScore: 46, transitScore: 28, bikeScore: 55, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 70, diversityIndex: 0.60, medianAge: 33.8 },
	{ name: "Asheville", stateId: "NC", tier: "small-city", population: 94067, lat: 35.5951, lng: -82.5515, county: "Buncombe", metro: "Asheville MSA", medianHomePrice: 395000, medianRent2Bed: 1650, unemploymentRate: 2.8, medianHouseholdIncome: 52000, jobGrowthRate: 3.2, avgTempJan: 36, avgTempJul: 82, sunnyDaysPerYear: 210, avgRainfallInches: 47, avgSnowfallInches: 16, airQualityIndex: 32, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 420, propertyCrimeRate: 3200, greatSchoolsRating: 7.2, graduationRate: 88, walkScore: 42, transitScore: 22, bikeScore: 48, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 85, diversityIndex: 0.48, medianAge: 38.5 },
	{ name: "Boulder", stateId: "CO", tier: "small-city", population: 105112, lat: 40.0150, lng: -105.2705, county: "Boulder", metro: "Boulder MSA", medianHomePrice: 720000, medianRent2Bed: 2200, unemploymentRate: 2.1, medianHouseholdIncome: 78000, jobGrowthRate: 2.4, avgTempJan: 30, avgTempJul: 88, sunnyDaysPerYear: 300, avgRainfallInches: 20, avgSnowfallInches: 88, airQualityIndex: 42, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 300, propertyCrimeRate: 2800, greatSchoolsRating: 8.5, graduationRate: 95, walkScore: 62, transitScore: 48, bikeScore: 82, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 90, diversityIndex: 0.38, medianAge: 30.0 },
	{ name: "Fort Collins", stateId: "CO", tier: "small-city", population: 164685, lat: 40.5853, lng: -105.0844, county: "Larimer", metro: "Fort Collins MSA", medianHomePrice: 480000, medianRent2Bed: 1600, unemploymentRate: 2.5, medianHouseholdIncome: 65000, jobGrowthRate: 3.0, avgTempJan: 27, avgTempJul: 90, sunnyDaysPerYear: 300, avgRainfallInches: 15, avgSnowfallInches: 52, airQualityIndex: 44, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 310, propertyCrimeRate: 2800, greatSchoolsRating: 8.2, graduationRate: 93, walkScore: 46, transitScore: 32, bikeScore: 78, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 82, diversityIndex: 0.38, medianAge: 28.5 },
	{ name: "Chattanooga", stateId: "TN", tier: "mid-size", population: 181099, lat: 35.0456, lng: -85.3097, county: "Hamilton", metro: "Chattanooga MSA", medianHomePrice: 280000, medianRent2Bed: 1200, unemploymentRate: 3.2, medianHouseholdIncome: 52000, jobGrowthRate: 3.5, avgTempJan: 40, avgTempJul: 90, sunnyDaysPerYear: 206, avgRainfallInches: 53, avgSnowfallInches: 5, airQualityIndex: 40, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 780, propertyCrimeRate: 4200, greatSchoolsRating: 6.5, graduationRate: 82, walkScore: 34, transitScore: 22, bikeScore: 38, nearOcean: false, nearMountains: true, nearLake: true, lgbtqFriendlyScore: 62, diversityIndex: 0.52, medianAge: 36.0 },
	{ name: "Knoxville", stateId: "TN", tier: "mid-size", population: 190740, lat: 35.9606, lng: -83.9207, county: "Knox", metro: "Knoxville MSA", medianHomePrice: 255000, medianRent2Bed: 1150, unemploymentRate: 3.0, medianHouseholdIncome: 50000, jobGrowthRate: 2.8, avgTempJan: 38, avgTempJul: 88, sunnyDaysPerYear: 204, avgRainfallInches: 47, avgSnowfallInches: 11, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 600, propertyCrimeRate: 3800, greatSchoolsRating: 6.8, graduationRate: 84, walkScore: 32, transitScore: 18, bikeScore: 35, nearOcean: false, nearMountains: true, nearLake: true, lgbtqFriendlyScore: 60, diversityIndex: 0.45, medianAge: 35.8 },
	{ name: "Sacramento", stateId: "CA", tier: "mid-size", population: 524943, lat: 38.5816, lng: -121.4944, county: "Sacramento", metro: "Sacramento MSA", medianHomePrice: 480000, medianRent2Bed: 1700, unemploymentRate: 3.8, medianHouseholdIncome: 65000, jobGrowthRate: 2.2, avgTempJan: 46, avgTempJul: 97, sunnyDaysPerYear: 265, avgRainfallInches: 19, avgSnowfallInches: 0, airQualityIndex: 62, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "very-high", violentCrimeRate: 780, propertyCrimeRate: 4800, greatSchoolsRating: 6.4, graduationRate: 82, walkScore: 50, transitScore: 38, bikeScore: 70, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 82, diversityIndex: 0.72, medianAge: 35.6 },
	{ name: "San Antonio", stateId: "TX", tier: "major-city", population: 1434625, lat: 29.4241, lng: -98.4936, county: "Bexar", metro: "San Antonio MSA", medianHomePrice: 270000, medianRent2Bed: 1200, unemploymentRate: 3.6, medianHouseholdIncome: 53000, jobGrowthRate: 2.8, avgTempJan: 51, avgTempJul: 95, sunnyDaysPerYear: 220, avgRainfallInches: 32, avgSnowfallInches: 0, airQualityIndex: 50, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 650, propertyCrimeRate: 4100, greatSchoolsRating: 6.0, graduationRate: 81, walkScore: 35, transitScore: 30, bikeScore: 40, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 70, diversityIndex: 0.72, medianAge: 33.5 },
	{ name: "Indianapolis", stateId: "IN", tier: "major-city", population: 887642, lat: 39.7684, lng: -86.1581, county: "Marion", metro: "Indianapolis MSA", medianHomePrice: 245000, medianRent2Bed: 1100, unemploymentRate: 3.2, medianHouseholdIncome: 57000, jobGrowthRate: 2.4, avgTempJan: 26, avgTempJul: 84, sunnyDaysPerYear: 186, avgRainfallInches: 41, avgSnowfallInches: 26, airQualityIndex: 52, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 1050, propertyCrimeRate: 4200, greatSchoolsRating: 6.2, graduationRate: 81, walkScore: 28, transitScore: 22, bikeScore: 35, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 68, diversityIndex: 0.60, medianAge: 33.8 },
	{ name: "Columbus", stateId: "OH", tier: "major-city", population: 905748, lat: 39.9612, lng: -82.9988, county: "Franklin", metro: "Columbus MSA", medianHomePrice: 270000, medianRent2Bed: 1150, unemploymentRate: 2.8, medianHouseholdIncome: 58000, jobGrowthRate: 2.8, avgTempJan: 28, avgTempJul: 83, sunnyDaysPerYear: 178, avgRainfallInches: 39, avgSnowfallInches: 28, airQualityIndex: 45, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 780, propertyCrimeRate: 3600, greatSchoolsRating: 6.5, graduationRate: 84, walkScore: 40, transitScore: 30, bikeScore: 52, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 75, diversityIndex: 0.60, medianAge: 31.8 },
	{ name: "San Jose", stateId: "CA", tier: "major-city", population: 1013240, lat: 37.3382, lng: -121.8863, county: "Santa Clara", metro: "San Jose-Sunnyvale MSA", medianHomePrice: 1200000, medianRent2Bed: 3200, unemploymentRate: 2.4, medianHouseholdIncome: 117000, jobGrowthRate: 1.8, avgTempJan: 52, avgTempJul: 82, sunnyDaysPerYear: 257, avgRainfallInches: 15, avgSnowfallInches: 0, airQualityIndex: 45, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 490, propertyCrimeRate: 3200, greatSchoolsRating: 8.2, graduationRate: 92, walkScore: 56, transitScore: 42, bikeScore: 68, nearOcean: true, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 90, diversityIndex: 0.78, medianAge: 36.4 },
	{ name: "Pittsburgh", stateId: "PA", tier: "mid-size", population: 302971, lat: 40.4406, lng: -79.9959, county: "Allegheny", metro: "Pittsburgh MSA", medianHomePrice: 215000, medianRent2Bed: 1100, unemploymentRate: 3.0, medianHouseholdIncome: 56000, jobGrowthRate: 1.5, avgTempJan: 28, avgTempJul: 82, sunnyDaysPerYear: 160, avgRainfallInches: 38, avgSnowfallInches: 41, airQualityIndex: 55, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 650, propertyCrimeRate: 2800, greatSchoolsRating: 6.8, graduationRate: 85, walkScore: 63, transitScore: 52, bikeScore: 54, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 78, diversityIndex: 0.55, medianAge: 33.5 },
	{ name: "St. Louis", stateId: "MO", tier: "mid-size", population: 286578, lat: 38.6270, lng: -90.1994, county: "St. Louis City", metro: "St. Louis MSA", medianHomePrice: 175000, medianRent2Bed: 980, unemploymentRate: 3.8, medianHouseholdIncome: 50000, jobGrowthRate: 0.8, avgTempJan: 30, avgTempJul: 88, sunnyDaysPerYear: 202, avgRainfallInches: 40, avgSnowfallInches: 20, airQualityIndex: 58, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 2500, propertyCrimeRate: 5500, greatSchoolsRating: 5.8, graduationRate: 79, walkScore: 66, transitScore: 40, bikeScore: 56, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.58, medianAge: 34.8 },
	{ name: "San Francisco", stateId: "CA", tier: "major-city", population: 873965, lat: 37.7749, lng: -122.4194, county: "San Francisco", metro: "San Francisco-Oakland MSA", medianHomePrice: 1350000, medianRent2Bed: 3400, unemploymentRate: 2.8, medianHouseholdIncome: 130696, jobGrowthRate: 1.2, avgTempJan: 55, avgTempJul: 65, sunnyDaysPerYear: 261, avgRainfallInches: 23, avgSnowfallInches: 0, airQualityIndex: 50, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "very-high", violentCrimeRate: 720, propertyCrimeRate: 5800, greatSchoolsRating: 7.8, graduationRate: 91, walkScore: 88, transitScore: 80, bikeScore: 72, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 96, diversityIndex: 0.80, medianAge: 38.2 },
	{ name: "Las Vegas", stateId: "NV", tier: "major-city", population: 641903, lat: 36.1699, lng: -115.1398, county: "Clark", metro: "Las Vegas MSA", medianHomePrice: 380000, medianRent2Bed: 1500, unemploymentRate: 4.5, medianHouseholdIncome: 56000, jobGrowthRate: 3.5, avgTempJan: 47, avgTempJul: 105, sunnyDaysPerYear: 294, avgRainfallInches: 4, avgSnowfallInches: 1, airQualityIndex: 60, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "moderate", violentCrimeRate: 770, propertyCrimeRate: 3800, greatSchoolsRating: 5.8, graduationRate: 79, walkScore: 42, transitScore: 36, bikeScore: 48, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.68, medianAge: 37.5 },
	{ name: "Virginia Beach", stateId: "VA", tier: "major-city", population: 459470, lat: 36.8529, lng: -75.9780, county: "Virginia Beach City", metro: "Virginia Beach-Norfolk MSA", medianHomePrice: 325000, medianRent2Bed: 1450, unemploymentRate: 3.2, medianHouseholdIncome: 72000, jobGrowthRate: 1.8, avgTempJan: 40, avgTempJul: 86, sunnyDaysPerYear: 213, avgRainfallInches: 45, avgSnowfallInches: 5, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "moderate", wildfireRisk: "low", violentCrimeRate: 420, propertyCrimeRate: 2800, greatSchoolsRating: 7.5, graduationRate: 90, walkScore: 26, transitScore: 20, bikeScore: 38, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 68, diversityIndex: 0.55, medianAge: 37.8 },
	{ name: "Cincinnati", stateId: "OH", tier: "mid-size", population: 309317, lat: 39.1031, lng: -84.5120, county: "Hamilton", metro: "Cincinnati MSA", medianHomePrice: 250000, medianRent2Bed: 1100, unemploymentRate: 3.2, medianHouseholdIncome: 54000, jobGrowthRate: 2.0, avgTempJan: 30, avgTempJul: 85, sunnyDaysPerYear: 185, avgRainfallInches: 41, avgSnowfallInches: 23, airQualityIndex: 50, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 780, propertyCrimeRate: 3500, greatSchoolsRating: 6.5, graduationRate: 84, walkScore: 52, transitScore: 38, bikeScore: 48, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 72, diversityIndex: 0.55, medianAge: 32.2 },
	{ name: "Madison", stateId: "WI", tier: "mid-size", population: 269840, lat: 43.0731, lng: -89.4012, county: "Dane", metro: "Madison MSA", medianHomePrice: 335000, medianRent2Bed: 1350, unemploymentRate: 2.1, medianHouseholdIncome: 68000, jobGrowthRate: 2.5, avgTempJan: 17, avgTempJul: 81, sunnyDaysPerYear: 190, avgRainfallInches: 34, avgSnowfallInches: 50, airQualityIndex: 30, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 380, propertyCrimeRate: 2600, greatSchoolsRating: 8.2, graduationRate: 93, walkScore: 52, transitScore: 48, bikeScore: 82, nearOcean: false, nearMountains: false, nearLake: true, lgbtqFriendlyScore: 90, diversityIndex: 0.52, medianAge: 30.8 },
	{ name: "Durham", stateId: "NC", tier: "mid-size", population: 278993, lat: 35.9940, lng: -78.8986, county: "Durham", metro: "Raleigh-Durham MSA", medianHomePrice: 350000, medianRent2Bed: 1500, unemploymentRate: 3.0, medianHouseholdIncome: 65000, jobGrowthRate: 3.8, avgTempJan: 40, avgTempJul: 90, sunnyDaysPerYear: 213, avgRainfallInches: 46, avgSnowfallInches: 6, airQualityIndex: 38, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 680, propertyCrimeRate: 3500, greatSchoolsRating: 7.2, graduationRate: 87, walkScore: 42, transitScore: 32, bikeScore: 50, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 82, diversityIndex: 0.68, medianAge: 32.8 },
	{ name: "Huntsville", stateId: "AL", tier: "mid-size", population: 215006, lat: 34.7304, lng: -86.5861, county: "Madison", metro: "Huntsville MSA", medianHomePrice: 278000, medianRent2Bed: 1100, unemploymentRate: 2.2, medianHouseholdIncome: 68000, jobGrowthRate: 4.5, avgTempJan: 40, avgTempJul: 90, sunnyDaysPerYear: 200, avgRainfallInches: 56, avgSnowfallInches: 3, airQualityIndex: 38, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 380, propertyCrimeRate: 3200, greatSchoolsRating: 7.5, graduationRate: 89, walkScore: 28, transitScore: 16, bikeScore: 32, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 55, diversityIndex: 0.48, medianAge: 36.5 },
	{ name: "Jacksonville", stateId: "FL", tier: "major-city", population: 949611, lat: 30.3322, lng: -81.6557, county: "Duval", metro: "Jacksonville MSA", medianHomePrice: 310000, medianRent2Bed: 1450, unemploymentRate: 3.4, medianHouseholdIncome: 57000, jobGrowthRate: 3.2, avgTempJan: 55, avgTempJul: 91, sunnyDaysPerYear: 233, avgRainfallInches: 52, avgSnowfallInches: 0, airQualityIndex: 40, tornadoRisk: "low", hurricaneRisk: "moderate", wildfireRisk: "low", violentCrimeRate: 780, propertyCrimeRate: 4100, greatSchoolsRating: 6.0, graduationRate: 82, walkScore: 28, transitScore: 20, bikeScore: 30, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 62, diversityIndex: 0.58, medianAge: 36.0 },
	{ name: "Colorado Springs", stateId: "CO", tier: "mid-size", population: 478221, lat: 38.8339, lng: -104.8214, county: "El Paso", metro: "Colorado Springs MSA", medianHomePrice: 400000, medianRent2Bed: 1500, unemploymentRate: 3.0, medianHouseholdIncome: 62000, jobGrowthRate: 3.0, avgTempJan: 28, avgTempJul: 88, sunnyDaysPerYear: 300, avgRainfallInches: 16, avgSnowfallInches: 42, airQualityIndex: 45, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "high", violentCrimeRate: 480, propertyCrimeRate: 3600, greatSchoolsRating: 7.0, graduationRate: 86, walkScore: 32, transitScore: 22, bikeScore: 48, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 65, diversityIndex: 0.45, medianAge: 34.5 },
	{ name: "Fayetteville", stateId: "AR", tier: "mid-size", population: 93949, lat: 36.0626, lng: -94.1574, county: "Washington", metro: "Fayetteville-Springdale MSA", medianHomePrice: 285000, medianRent2Bed: 1100, unemploymentRate: 2.4, medianHouseholdIncome: 55000, jobGrowthRate: 4.2, avgTempJan: 35, avgTempJul: 90, sunnyDaysPerYear: 218, avgRainfallInches: 47, avgSnowfallInches: 10, airQualityIndex: 30, tornadoRisk: "high", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 580, propertyCrimeRate: 3800, greatSchoolsRating: 6.8, graduationRate: 85, walkScore: 28, transitScore: 14, bikeScore: 42, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 58, diversityIndex: 0.45, medianAge: 30.5 },
	{ name: "Greenville", stateId: "SC", tier: "mid-size", population: 70635, lat: 34.8526, lng: -82.3940, county: "Greenville", metro: "Greenville-Spartanburg MSA", medianHomePrice: 295000, medianRent2Bed: 1250, unemploymentRate: 2.8, medianHouseholdIncome: 55000, jobGrowthRate: 3.8, avgTempJan: 43, avgTempJul: 90, sunnyDaysPerYear: 218, avgRainfallInches: 48, avgSnowfallInches: 4, airQualityIndex: 35, tornadoRisk: "low", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 680, propertyCrimeRate: 3800, greatSchoolsRating: 6.8, graduationRate: 84, walkScore: 34, transitScore: 18, bikeScore: 42, nearOcean: false, nearMountains: true, nearLake: false, lgbtqFriendlyScore: 60, diversityIndex: 0.52, medianAge: 33.5 },
	{ name: "Charleston", stateId: "SC", tier: "mid-size", population: 150227, lat: 32.7765, lng: -79.9311, county: "Charleston", metro: "Charleston MSA", medianHomePrice: 420000, medianRent2Bed: 1750, unemploymentRate: 2.6, medianHouseholdIncome: 67000, jobGrowthRate: 4.0, avgTempJan: 49, avgTempJul: 90, sunnyDaysPerYear: 214, avgRainfallInches: 51, avgSnowfallInches: 1, airQualityIndex: 35, tornadoRisk: "low", hurricaneRisk: "moderate", wildfireRisk: "low", violentCrimeRate: 640, propertyCrimeRate: 3200, greatSchoolsRating: 7.2, graduationRate: 87, walkScore: 40, transitScore: 20, bikeScore: 52, nearOcean: true, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 70, diversityIndex: 0.52, medianAge: 36.5 },
	{ name: "Lexington", stateId: "KY", tier: "mid-size", population: 322570, lat: 38.0406, lng: -84.5037, county: "Fayette", metro: "Lexington MSA", medianHomePrice: 270000, medianRent2Bed: 1100, unemploymentRate: 2.8, medianHouseholdIncome: 57000, jobGrowthRate: 2.2, avgTempJan: 32, avgTempJul: 87, sunnyDaysPerYear: 194, avgRainfallInches: 45, avgSnowfallInches: 17, airQualityIndex: 42, tornadoRisk: "moderate", hurricaneRisk: "low", wildfireRisk: "low", violentCrimeRate: 420, propertyCrimeRate: 3200, greatSchoolsRating: 7.0, graduationRate: 86, walkScore: 36, transitScore: 22, bikeScore: 42, nearOcean: false, nearMountains: false, nearLake: false, lgbtqFriendlyScore: 65, diversityIndex: 0.48, medianAge: 33.2 },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------
async function main() {
	console.log("🌱 Seeding states...");
	for (const state of STATE_DATA) {
		await db
			.insert(schema.states)
			.values(state)
			.onConflictDoNothing();
	}
	console.log(`  ✓ ${STATE_DATA.length} states`);

	console.log("🌱 Seeding cities...");
	let cityCount = 0;
	for (const raw of CITIES_RAW) {
		const cityId = createId();
		const slug = `${raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}-${raw.stateId.toLowerCase()}`;

		// Check if exists
		const existing = await db.query.cities.findFirst({ where: (c, { eq }) => eq(c.slug, slug) });
		const resolvedId = existing?.id ?? cityId;

		if (!existing) {
			await db.insert(schema.cities).values({
				id: resolvedId,
				stateId: raw.stateId,
				name: raw.name,
				slug,
				lat: raw.lat,
				lng: raw.lng,
				population: raw.population,
				county: raw.county,
				metro: raw.metro,
				tier: raw.tier,
			});
		}

		// Upsert housing
		await db.insert(schema.cityHousing).values({
			id: createId(),
			cityId: resolvedId,
			medianHomePrice: raw.medianHomePrice,
			medianRent2Bed: raw.medianRent2Bed,
			affordabilityIndex: raw.medianHouseholdIncome / (raw.medianHomePrice / 12),
			dataAsOf: "2024-01-01",
		}).onConflictDoUpdate({ target: schema.cityHousing.cityId, set: { medianHomePrice: raw.medianHomePrice, medianRent2Bed: raw.medianRent2Bed } });

		// Upsert jobs
		await db.insert(schema.cityJobs).values({
			id: createId(),
			cityId: resolvedId,
			unemploymentRate: raw.unemploymentRate,
			medianHouseholdIncome: raw.medianHouseholdIncome,
			jobGrowthRate: raw.jobGrowthRate,
			dataAsOf: "2024-01-01",
		}).onConflictDoUpdate({ target: schema.cityJobs.cityId, set: { unemploymentRate: raw.unemploymentRate, jobGrowthRate: raw.jobGrowthRate } });

		// Upsert climate
		await db.insert(schema.cityClimate).values({
			id: createId(),
			cityId: resolvedId,
			avgTempJan: raw.avgTempJan,
			avgTempJul: raw.avgTempJul,
			sunnyDaysPerYear: raw.sunnyDaysPerYear,
			avgRainfallInches: raw.avgRainfallInches,
			avgSnowfallInches: raw.avgSnowfallInches,
			airQualityIndex: raw.airQualityIndex,
			tornadoRisk: raw.tornadoRisk ?? "low",
			hurricaneRisk: raw.hurricaneRisk ?? "low",
			wildfireRisk: raw.wildfireRisk ?? "low",
			dataAsOf: "2024-01-01",
		}).onConflictDoUpdate({ target: schema.cityClimate.cityId, set: { airQualityIndex: raw.airQualityIndex } });

		// Upsert safety
		await db.insert(schema.citySafety).values({
			id: createId(),
			cityId: resolvedId,
			violentCrimeRate: raw.violentCrimeRate,
			propertyCrimeRate: raw.propertyCrimeRate,
			dataYear: 2023,
		}).onConflictDoUpdate({ target: schema.citySafety.cityId, set: { violentCrimeRate: raw.violentCrimeRate } });

		// Upsert schools
		await db.insert(schema.citySchools).values({
			id: createId(),
			cityId: resolvedId,
			greatSchoolsRating: raw.greatSchoolsRating,
			graduationRate: raw.graduationRate,
		}).onConflictDoUpdate({ target: schema.citySchools.cityId, set: { greatSchoolsRating: raw.greatSchoolsRating } });

		// Upsert walkability
		await db.insert(schema.cityWalkability).values({
			id: createId(),
			cityId: resolvedId,
			walkScore: raw.walkScore,
			transitScore: raw.transitScore,
			bikeScore: raw.bikeScore,
		}).onConflictDoUpdate({ target: schema.cityWalkability.cityId, set: { walkScore: raw.walkScore } });

		// Upsert lifestyle
		await db.insert(schema.cityLifestyle).values({
			id: createId(),
			cityId: resolvedId,
			nearOcean: raw.nearOcean,
			nearMountains: raw.nearMountains,
			nearLake: raw.nearLake,
			lgbtqFriendlyScore: raw.lgbtqFriendlyScore,
			diversityIndex: raw.diversityIndex,
			medianAge: raw.medianAge,
		}).onConflictDoUpdate({ target: schema.cityLifestyle.cityId, set: { nearOcean: raw.nearOcean } });

		// Upsert demographics
		await db.insert(schema.cityDemographics).values({
			id: createId(),
			cityId: resolvedId,
			totalPopulation: raw.population,
			diversityIndex: raw.diversityIndex,
		}).onConflictDoUpdate({ target: schema.cityDemographics.cityId, set: { totalPopulation: raw.population } });

		cityCount++;
	}
	console.log(`  ✓ ${cityCount} cities`);

	console.log("📊 Computing filter scores...");
	await computeAllScores(db as Parameters<typeof computeAllScores>[0]);
	console.log("  ✓ Scores computed");

	console.log("✅ Seed complete!");
	sqlite.close();
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
