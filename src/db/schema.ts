import { relations, sql } from "drizzle-orm";
import {
	integer,
	real,
	sqliteTable,
	text,
	index,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Timestamps helper
// ---------------------------------------------------------------------------
const timestamps = {
	createdAt: text("created_at")
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

// ---------------------------------------------------------------------------
// 1. Geographic Foundation
// ---------------------------------------------------------------------------

export const states = sqliteTable("states", {
	id: text("id").primaryKey(), // "CA", "TX", etc.
	name: text("name").notNull(),
	abbreviation: text("abbreviation").notNull().unique(),
	region: text("region").notNull(), // "West" | "South" | "Midwest" | "Northeast"
	timezone: text("timezone").notNull(),
	costIndex: real("cost_index"),
	taxBurden: real("tax_burden"),
	incomeTaxRate: real("income_tax_rate"),
	noIncomeTax: integer("no_income_tax", { mode: "boolean" }).default(false),
	rightToWork: integer("right_to_work", { mode: "boolean" }).default(false),
	medicaidExpanded: integer("medicaid_expanded", { mode: "boolean" }).default(
		false,
	),
	salesTaxRate: real("sales_tax_rate"),
	...timestamps,
});

export const cities = sqliteTable(
	"cities",
	{
		id: text("id").primaryKey(), // cuid2
		stateId: text("state_id")
			.notNull()
			.references(() => states.id),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(), // "austin-tx"
		fipsCode: text("fips_code").unique(),
		lat: real("lat"),
		lng: real("lng"),
		population: integer("population"),
		populationGrowthPct: real("population_growth_pct"),
		county: text("county"),
		metro: text("metro"),
		isMetroArea: integer("is_metro_area", { mode: "boolean" }).default(false),
		tier: text("tier").notNull().default("small-city"), // "major-city"|"mid-size"|"small-city"|"town"
		heroImageUrl: text("hero_image_url"),
		thumbnailUrl: text("thumbnail_url"),
		unsplashPhotoId: text("unsplash_photo_id"),
		overallScore: real("overall_score"),
		viewCount: integer("view_count").notNull().default(0),
		...timestamps,
	},
	(t) => [
		index("cities_state_idx").on(t.stateId),
		index("cities_tier_idx").on(t.tier),
	],
);

export const cityPhotos = sqliteTable("city_photos", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.references(() => cities.id),
	url: text("url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	credit: text("credit"),
	source: text("source").notNull().default("unsplash"), // "unsplash"|"pexels"
	sourceId: text("source_id"),
	width: integer("width"),
	height: integer("height"),
	isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
});

export const neighborhoods = sqliteTable("neighborhoods", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.references(() => cities.id),
	name: text("name").notNull(),
	description: text("description"),
	lat: real("lat"),
	lng: real("lng"),
	vibeKeywords: text("vibe_keywords"), // JSON string array
	medianRent: integer("median_rent"),
	medianHomePrice: integer("median_home_price"),
	walkScore: integer("walk_score"),
	...timestamps,
});

// ---------------------------------------------------------------------------
// 2. Data Domain Tables (1:1 with cities)
// ---------------------------------------------------------------------------

export const cityHousing = sqliteTable("city_housing", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	medianHomePrice: integer("median_home_price"),
	medianRent1Bed: integer("median_rent_1bed"),
	medianRent2Bed: integer("median_rent_2bed"),
	medianRent3Bed: integer("median_rent_3bed"),
	priceToRentRatio: real("price_to_rent_ratio"),
	homeValueGrowth1yr: real("home_value_growth_1yr"),
	homeValueGrowth5yr: real("home_value_growth_5yr"),
	inventoryCount: integer("inventory_count"),
	daysOnMarket: integer("days_on_market"),
	hotMarket: integer("hot_market", { mode: "boolean" }).default(false),
	affordabilityIndex: real("affordability_index"),
	dataAsOf: text("data_as_of"),
	source: text("source").default("zillow"),
});

export const cityJobs = sqliteTable("city_jobs", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	unemploymentRate: real("unemployment_rate"),
	medianHouseholdIncome: integer("median_household_income"),
	medianIndividualIncome: integer("median_individual_income"),
	povertyRate: real("poverty_rate"),
	techJobShare: real("tech_job_share"),
	gdpPerCapita: integer("gdp_per_capita"),
	topEmployers: text("top_employers"), // JSON
	jobGrowthRate: real("job_growth_rate"),
	wageGrowthRate: real("wage_growth_rate"),
	laborForceParticipation: real("labor_force_participation"),
	dataAsOf: text("data_as_of"),
	source: text("source").default("bls-census"),
});

export const cityClimate = sqliteTable("city_climate", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	avgTempJan: real("avg_temp_jan"),
	avgTempJul: real("avg_temp_jul"),
	avgTempAnnual: real("avg_temp_annual"),
	avgRainfallInches: real("avg_rainfall_inches"),
	avgSnowfallInches: real("avg_snowfall_inches"),
	sunnyDaysPerYear: integer("sunny_days_per_year"),
	humidityAvg: real("humidity_avg"),
	tornadoRisk: text("tornado_risk").default("low"), // "low"|"moderate"|"high"|"very-high"
	hurricaneRisk: text("hurricane_risk").default("low"),
	wildfireRisk: text("wildfire_risk").default("low"),
	floodRisk: text("flood_risk").default("low"),
	earthquakeRisk: text("earthquake_risk").default("low"),
	extremeHeatDays: integer("extreme_heat_days"),
	freezeDays: integer("freeze_days"),
	airQualityIndex: integer("air_quality_index"),
	airQualityGrade: text("air_quality_grade"),
	pm25Annual: real("pm25_annual"),
	ozoneAnnual: real("ozone_annual"),
	dataAsOf: text("data_as_of"),
});

export const citySafety = sqliteTable("city_safety", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	violentCrimeRate: real("violent_crime_rate"),
	propertyCrimeRate: real("property_crime_rate"),
	murderRate: real("murder_rate"),
	assaultRate: real("assault_rate"),
	burglaryRate: real("burglary_rate"),
	vehicleTheftRate: real("vehicle_theft_rate"),
	safetyScore: integer("safety_score"),
	crimeGrade: text("crime_grade"), // "A" through "F"
	nationalRankSafety: integer("national_rank_safety"),
	dataYear: integer("data_year"),
	dataAsOf: text("data_as_of"),
});

export const citySchools = sqliteTable("city_schools", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	greatSchoolsRating: real("great_schools_rating"),
	elementaryRating: real("elementary_rating"),
	middleSchoolRating: real("middle_school_rating"),
	highSchoolRating: real("high_school_rating"),
	publicSchoolCount: integer("public_school_count"),
	privateSchoolCount: integer("private_school_count"),
	charterSchoolCount: integer("charter_school_count"),
	graduationRate: real("graduation_rate"),
	mathProficiency: real("math_proficiency"),
	readingProficiency: real("reading_proficiency"),
	pupilTeacherRatio: real("pupil_teacher_ratio"),
	perPupilSpending: integer("per_pupil_spending"),
	collegeProximity: integer("college_proximity", { mode: "boolean" }).default(
		false,
	),
	dataAsOf: text("data_as_of"),
});

export const cityWalkability = sqliteTable("city_walkability", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	walkScore: integer("walk_score"),
	transitScore: integer("transit_score"),
	bikeScore: integer("bike_score"),
	walkScoreLabel: text("walk_score_label"),
	transitLabel: text("transit_label"),
	bikeLabel: text("bike_label"),
	hasPublicTransit: integer("has_public_transit", { mode: "boolean" }).default(
		false,
	),
	hasLightRail: integer("has_light_rail", { mode: "boolean" }).default(false),
	hasMetro: integer("has_metro", { mode: "boolean" }).default(false),
	dataAsOf: text("data_as_of"),
});

export const cityDemographics = sqliteTable("city_demographics", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	totalPopulation: integer("total_population"),
	populationDensity: integer("population_density"),
	pctWhite: real("pct_white"),
	pctBlack: real("pct_black"),
	pctHispanic: real("pct_hispanic"),
	pctAsian: real("pct_asian"),
	pctOther: real("pct_other"),
	pctForeignBorn: real("pct_foreign_born"),
	pctCollegeEducated: real("pct_college_educated"),
	pctUnder18: real("pct_under_18"),
	pctOver65: real("pct_over_65"),
	pctMarried: real("pct_married"),
	avgHouseholdSize: real("avg_household_size"),
	homeownershipRate: real("homeownership_rate"),
	diversityIndex: real("diversity_index"),
	dataAsOf: text("data_as_of"),
	source: text("source").default("census-acs"),
});

export const cityLifestyle = sqliteTable("city_lifestyle", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	restaurantsPerCapita: real("restaurants_per_capita"),
	barsNightlifePerCapita: real("bars_nightlife_per_capita"),
	parksAcresPerCapita: real("parks_acres_per_capita"),
	trailsMilesNearby: integer("trails_miles_nearby"),
	nearOcean: integer("near_ocean", { mode: "boolean" }).default(false),
	nearMountains: integer("near_mountains", { mode: "boolean" }).default(false),
	nearLake: integer("near_lake", { mode: "boolean" }).default(false),
	nearNationalPark: integer("near_national_park", { mode: "boolean" }).default(
		false,
	),
	distanceToNationalPark: integer("distance_to_national_park"),
	artMuseumCount: integer("art_museum_count"),
	theaterCount: integer("theater_count"),
	mlsSportsTeam: integer("mls_sports_team", { mode: "boolean" }).default(false),
	nflSportsTeam: integer("nfl_sports_team", { mode: "boolean" }).default(false),
	nbaSportsTeam: integer("nba_sports_team", { mode: "boolean" }).default(false),
	mlbSportsTeam: integer("mlb_sports_team", { mode: "boolean" }).default(false),
	majorAirportNearby: integer("major_airport_nearby", {
		mode: "boolean",
	}).default(false),
	closestAirportCode: text("closest_airport_code"),
	airportDriveMins: integer("airport_drive_mins"),
	lgbtqFriendlyScore: integer("lgbtq_friendly_score"),
	diversityIndex: real("diversity_index"),
	medianAge: real("median_age"),
	dataAsOf: text("data_as_of"),
});

// ---------------------------------------------------------------------------
// 3. Scoring & Computed Data
// ---------------------------------------------------------------------------

export const cityFilterScores = sqliteTable("city_filter_scores", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.unique()
		.references(() => cities.id),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),

	// Essentials
	scoreMedianHomePrice: integer("score_median_home_price"),
	scoreMedianRent: integer("score_median_rent"),
	scorePriceToRent: integer("score_price_to_rent"),
	scoreCostOfLiving: integer("score_cost_of_living"),
	scoreJobMarket: integer("score_job_market"),
	scoreUnemployment: integer("score_unemployment"),
	scoreIncomeGrowth: integer("score_income_growth"),
	scoreMedianIncome: integer("score_median_income"),
	scoreTaxBurden: integer("score_tax_burden"),
	scoreAffordabilityIndex: integer("score_affordability_index"),

	// Lifestyle
	scoreWalkability: integer("score_walkability"),
	scoreTransit: integer("score_transit"),
	scoreBikeability: integer("score_bikeability"),
	scoreRestaurants: integer("score_restaurants"),
	scoreNightlife: integer("score_nightlife"),
	scoreArtsAndCulture: integer("score_arts_and_culture"),
	scoreDiversity: integer("score_diversity"),
	scoreLgbtqFriendly: integer("score_lgbtq_friendly"),
	scoreMedAge: integer("score_med_age"),
	scoreCollegeTown: integer("score_college_town"),
	scoreTechHub: integer("score_tech_hub"),

	// Practical / Safety
	scoreViolentCrime: integer("score_violent_crime"),
	scorePropertyCrime: integer("score_property_crime"),
	scoreHealthcare: integer("score_healthcare"),
	scoreBroadband: integer("score_broadband"),
	scorePopulationGrowth: integer("score_population_growth"),

	// Family
	scoreSchoolQuality: integer("score_school_quality"),
	scoreHighSchool: integer("score_high_school"),
	scoreGraduationRate: integer("score_graduation_rate"),
	scoreChildcare: integer("score_childcare"),
	scorePupilSpending: integer("score_pupil_spending"),

	// Nature & Climate
	scoreWeather: integer("score_weather"),
	scoreWarmClimate: integer("score_warm_climate"),
	scoreAirQuality: integer("score_air_quality"),
	scoreSunnyDays: integer("score_sunny_days"),
	scoreNaturalDisasterRisk: integer("score_natural_disaster_risk"),
	scoreNearOcean: integer("score_near_ocean"),
	scoreNearMountains: integer("score_near_mountains"),
	scoreNearLake: integer("score_near_lake"),
	scoreTrails: integer("score_trails"),
	scoreNationalPark: integer("score_national_park"),
	scoreGreenSpace: integer("score_green_space"),
	scoreLowHumidity: integer("score_low_humidity"),
});

export const cityCompositeScores = sqliteTable("city_composite_scores", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.references(() => cities.id),
	presetName: text("preset_name").notNull(), // "balanced"|"remote-worker"|"retiree"|"young-family"
	matchPct: integer("match_pct"),
	scoreBreakdown: text("score_breakdown"), // JSON
	rankedAt: text("ranked_at"),
});

// ---------------------------------------------------------------------------
// 4. Users & Saved Data (Phase 3)
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	email: text("email").unique(),
	name: text("name"),
	avatarUrl: text("avatar_url"),
	tier: text("tier").notNull().default("free"), // "free"|"premium"
	stripeCustomerId: text("stripe_customer_id"),
	stripePriceId: text("stripe_price_id"),
	subscriptionStatus: text("subscription_status"),
	subscriptionEndsAt: text("subscription_ends_at"),
	...timestamps,
});

export const quizResponses = sqliteTable("quiz_responses", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => users.id),
	sessionId: text("session_id").notNull(),
	answers: text("answers").notNull(), // JSON
	filterWeights: text("filter_weights").notNull(), // JSON
	rawGrokResponse: text("raw_grok_response"),
	completedAt: text("completed_at"),
});

export const savedCities = sqliteTable(
	"saved_cities",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		cityId: text("city_id")
			.notNull()
			.references(() => cities.id),
		notes: text("notes"),
		addedAt: text("added_at")
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(t) => [uniqueIndex("saved_cities_user_city").on(t.userId, t.cityId)],
);

export const savedSearches = sqliteTable("saved_searches", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	name: text("name"),
	filterState: text("filter_state").notNull(), // JSON
	resultCount: integer("result_count"),
	lastRunAt: text("last_run_at"),
	...timestamps,
});

export const savedComparisons = sqliteTable("saved_comparisons", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	name: text("name"),
	cityIds: text("city_ids").notNull(), // JSON array
	...timestamps,
});

export const cityReviews = sqliteTable("city_reviews", {
	id: text("id").primaryKey(),
	cityId: text("city_id")
		.notNull()
		.references(() => cities.id),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	rating: integer("rating"),
	body: text("body").notNull(),
	yearsLivedThere: integer("years_lived_there"),
	livedFrom: integer("lived_from"),
	livedTo: integer("lived_to"),
	pros: text("pros"), // JSON array
	cons: text("cons"), // JSON array
	status: text("status").notNull().default("pending"), // "pending"|"approved"|"rejected"
	...timestamps,
});

// ---------------------------------------------------------------------------
// 5. API Cache & Infrastructure
// ---------------------------------------------------------------------------

export const apiCache = sqliteTable(
	"api_cache",
	{
		id: text("id").primaryKey(),
		cacheKey: text("cache_key").notNull().unique(),
		source: text("source").notNull(),
		cityId: text("city_id").references(() => cities.id),
		responseBody: text("response_body").notNull(), // JSON
		fetchedAt: text("fetched_at")
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		expiresAt: text("expires_at").notNull(),
		httpStatus: integer("http_status"),
	},
	(t) => [index("api_cache_expires_idx").on(t.expiresAt)],
);

export const dataRefreshLog = sqliteTable("data_refresh_log", {
	id: text("id").primaryKey(),
	source: text("source").notNull(),
	jobType: text("job_type").notNull(),
	citiesUpdated: integer("cities_updated"),
	errorsCount: integer("errors_count"),
	durationMs: integer("duration_ms"),
	startedAt: text("started_at")
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	completedAt: text("completed_at"),
	error: text("error"),
});

export const aiSummaries = sqliteTable(
	"ai_summaries",
	{
		id: text("id").primaryKey(),
		cityId: text("city_id")
			.notNull()
			.references(() => cities.id),
		summaryType: text("summary_type").notNull(), // "overview"|"pros-cons"|"surprise-me"
		content: text("content").notNull(),
		model: text("model").notNull(),
		promptVersion: text("prompt_version").notNull().default("v1"),
		generatedAt: text("generated_at")
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		expiresAt: text("expires_at").notNull(),
	},
	(t) => [
		uniqueIndex("ai_summaries_city_type").on(t.cityId, t.summaryType),
	],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const citiesRelations = relations(cities, ({ one, many }) => ({
	state: one(states, { fields: [cities.stateId], references: [states.id] }),
	housing: one(cityHousing, { fields: [cities.id], references: [cityHousing.cityId] }),
	jobs: one(cityJobs, { fields: [cities.id], references: [cityJobs.cityId] }),
	climate: one(cityClimate, { fields: [cities.id], references: [cityClimate.cityId] }),
	safety: one(citySafety, { fields: [cities.id], references: [citySafety.cityId] }),
	schools: one(citySchools, { fields: [cities.id], references: [citySchools.cityId] }),
	walkability: one(cityWalkability, { fields: [cities.id], references: [cityWalkability.cityId] }),
	demographics: one(cityDemographics, { fields: [cities.id], references: [cityDemographics.cityId] }),
	lifestyle: one(cityLifestyle, { fields: [cities.id], references: [cityLifestyle.cityId] }),
	filterScores: one(cityFilterScores, { fields: [cities.id], references: [cityFilterScores.cityId] }),
	photos: many(cityPhotos),
	neighborhoods: many(neighborhoods),
	aiSummaries: many(aiSummaries),
}));

export const statesRelations = relations(states, ({ many }) => ({
	cities: many(cities),
}));

export const cityPhotosRelations = relations(cityPhotos, ({ one }) => ({
	city: one(cities, { fields: [cityPhotos.cityId], references: [cities.id] }),
}));

export const neighborhoodsRelations = relations(neighborhoods, ({ one }) => ({
	city: one(cities, { fields: [neighborhoods.cityId], references: [cities.id] }),
}));

export const cityHousingRelations = relations(cityHousing, ({ one }) => ({
	city: one(cities, { fields: [cityHousing.cityId], references: [cities.id] }),
}));

export const cityJobsRelations = relations(cityJobs, ({ one }) => ({
	city: one(cities, { fields: [cityJobs.cityId], references: [cities.id] }),
}));

export const cityClimateRelations = relations(cityClimate, ({ one }) => ({
	city: one(cities, { fields: [cityClimate.cityId], references: [cities.id] }),
}));

export const citySafetyRelations = relations(citySafety, ({ one }) => ({
	city: one(cities, { fields: [citySafety.cityId], references: [cities.id] }),
}));

export const citySchoolsRelations = relations(citySchools, ({ one }) => ({
	city: one(cities, { fields: [citySchools.cityId], references: [cities.id] }),
}));

export const cityWalkabilityRelations = relations(cityWalkability, ({ one }) => ({
	city: one(cities, { fields: [cityWalkability.cityId], references: [cities.id] }),
}));

export const cityDemographicsRelations = relations(cityDemographics, ({ one }) => ({
	city: one(cities, { fields: [cityDemographics.cityId], references: [cities.id] }),
}));

export const cityLifestyleRelations = relations(cityLifestyle, ({ one }) => ({
	city: one(cities, { fields: [cityLifestyle.cityId], references: [cities.id] }),
}));

export const cityFilterScoresRelations = relations(cityFilterScores, ({ one }) => ({
	city: one(cities, { fields: [cityFilterScores.cityId], references: [cities.id] }),
}));

export const aiSummariesRelations = relations(aiSummaries, ({ one }) => ({
	city: one(cities, { fields: [aiSummaries.cityId], references: [cities.id] }),
}));

// ---------------------------------------------------------------------------
// Types (inferred)
// ---------------------------------------------------------------------------
export type State = typeof states.$inferSelect;
export type City = typeof cities.$inferSelect;
export type CityHousing = typeof cityHousing.$inferSelect;
export type CityJobs = typeof cityJobs.$inferSelect;
export type CityClimate = typeof cityClimate.$inferSelect;
export type CitySafety = typeof citySafety.$inferSelect;
export type CitySchools = typeof citySchools.$inferSelect;
export type CityWalkability = typeof cityWalkability.$inferSelect;
export type CityDemographics = typeof cityDemographics.$inferSelect;
export type CityLifestyle = typeof cityLifestyle.$inferSelect;
export type CityFilterScores = typeof cityFilterScores.$inferSelect;
export type User = typeof users.$inferSelect;
export type QuizResponse = typeof quizResponses.$inferSelect;
