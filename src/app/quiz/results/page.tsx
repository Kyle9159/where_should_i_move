import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { decodeWeights, computeMatchPct, computeCategoryScores } from "@/lib/ranking";
import type { CityFilterScores } from "@/db/schema";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { AuthNav } from "@/components/layout/AuthNav";
import { CompareButton } from "@/components/shared/CompareBar";

export const metadata: Metadata = {
	title: "Your City Matches | Where Should I Move",
};

// ── Personality engine ────────────────────────────────────────────────────────

const PERSONALITY_ARCHETYPES = [
	{
		name: "Outdoor Adventurer",
		emoji: "🏔️",
		match: ["scoreTrails", "scoreNearMountains", "scoreNationalPark", "scoreGreenSpace", "scoreNearLake"],
		tagline: "You're happiest when there's a trailhead around the corner and a national park on the weekend.",
	},
	{
		name: "Beach Lover",
		emoji: "🏖️",
		match: ["scoreNearOcean", "scoreWarmClimate", "scoreSunnyDays"],
		tagline: "Salt air and sunshine aren't perks for you — they're requirements.",
	},
	{
		name: "Career Builder",
		emoji: "🚀",
		match: ["scoreTechHub", "scoreJobMarket", "scoreIncomeGrowth", "scoreMedianIncome"],
		tagline: "You're building something big, and you need a city that matches your ambition.",
	},
	{
		name: "Family-First Mover",
		emoji: "👨‍👩‍👧",
		match: ["scoreSchoolQuality", "scoreViolentCrime", "scorePropertyCrime", "scoreChildcare", "scoreGraduationRate"],
		tagline: "You're making a move for your family — safe streets, great schools, room to grow.",
	},
	{
		name: "Urban Explorer",
		emoji: "🌆",
		match: ["scoreWalkability", "scoreNightlife", "scoreRestaurants", "scoreTransit", "scoreArtsAndCulture"],
		tagline: "You want everything within walking distance — culture, coffee, and a killer food scene.",
	},
	{
		name: "Budget-Smart Mover",
		emoji: "💰",
		match: ["scoreCostOfLiving", "scoreMedianRent", "scoreTaxBurden", "scoreMedianHomePrice", "scoreAffordabilityIndex"],
		tagline: "You know that a lower cost of living means more freedom — and you're right.",
	},
	{
		name: "Sun Seeker",
		emoji: "☀️",
		match: ["scoreWarmClimate", "scoreSunnyDays", "scoreAirQuality", "scoreNearOcean"],
		tagline: "Life's too short for grey winters. You want warmth, sunshine, and a slower pace.",
	},
	{
		name: "Remote Work Pro",
		emoji: "💻",
		match: ["scoreBroadband", "scoreCostOfLiving", "scoreWalkability", "scoreDiversity", "scoreTechHub"],
		tagline: "Location-independent and proud of it — you want value, vibes, and fast Wi-Fi.",
	},
	{
		name: "Wellness Focused",
		emoji: "🌿",
		match: ["scoreHealthcare", "scoreAirQuality", "scoreNaturalDisasterRisk", "scoreGreenSpace"],
		tagline: "Your environment directly impacts your wellbeing — you're choosing a place that supports the life you want.",
	},
	{
		name: "Culture Seeker",
		emoji: "🎭",
		match: ["scoreArtsAndCulture", "scoreDiversity", "scoreCollegeTown", "scoreCollegeEducated", "scoreRestaurants"],
		tagline: "You thrive in places that are alive with ideas, art, and people who think differently.",
	},
] as const;

function getPersonality(weights: Record<string, number>) {
	let bestArchetype = PERSONALITY_ARCHETYPES[0] as (typeof PERSONALITY_ARCHETYPES)[number];
	let bestScore = -1;

	for (const archetype of PERSONALITY_ARCHETYPES) {
		const score = archetype.match.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
		if (score > bestScore) {
			bestScore = score;
			bestArchetype = archetype;
		}
	}
	return bestArchetype;
}

function getTopFactors(weights: Record<string, number>): string[] {
	const LABELS: Record<string, string> = {
		scoreTrails: "Trails & Hiking", scoreNearMountains: "Mountains", scoreNationalPark: "National Parks",
		scoreNearOcean: "Ocean Access", scoreWarmClimate: "Warm Weather", scoreSunnyDays: "Sunshine",
		scoreTechHub: "Tech Industry", scoreJobMarket: "Job Market", scoreIncomeGrowth: "Income Growth",
		scoreSchoolQuality: "School Quality", scoreViolentCrime: "Low Crime", scorePropertyCrime: "Safety",
		scoreWalkability: "Walkability", scoreNightlife: "Nightlife", scoreRestaurants: "Food Scene",
		scoreCostOfLiving: "Cost of Living", scoreMedianRent: "Affordable Rent", scoreTaxBurden: "Low Taxes",
		scoreHealthcare: "Healthcare", scoreAirQuality: "Air Quality", scoreDiversity: "Diversity",
		scoreArtsAndCulture: "Arts & Culture", scoreBroadband: "Fast Internet", scoreTransit: "Transit",
		scoreMedianHomePrice: "Home Prices", scoreGreenSpace: "Green Space", scoreNearLake: "Lakes",
		scoreChildcare: "Childcare", scoreGraduationRate: "Education", scoreCollegeTown: "College Town",
	};
	return Object.entries(weights)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 4)
		.map(([k]) => LABELS[k] ?? k)
		.filter(Boolean);
}

const CITY_TIERS: Record<string, string> = {
	"major-city": "Major City", "mid-size": "Mid-Size", "small-city": "Small City", suburb: "Suburb",
};

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
	searchParams: Promise<{ weights?: string }>;
}

export default async function QuizResultsPage({ searchParams }: Props) {
	const { weights: encoded } = await searchParams;
	if (!encoded) notFound();

	const weights = decodeWeights(encoded);
	const personality = getPersonality(weights as Record<string, number>);
	const topFactors = getTopFactors(weights as Record<string, number>);

	// Fetch top 5 cities
	const allCities = await db.query.cities.findMany({ with: { filterScores: true } });
	const top5 = allCities
		.filter((c) => c.filterScores != null)
		.map((c) => ({
			id: c.id,
			slug: c.slug,
			name: c.name,
			stateId: c.stateId,
			tier: c.tier,
			population: c.population,
			heroImageUrl: c.heroImageUrl,
			matchPct: computeMatchPct(c.filterScores as CityFilterScores, weights),
			categoryScores: computeCategoryScores(c.filterScores as CityFilterScores, weights),
		}))
		.sort((a, b) => b.matchPct - a.matchPct)
		.slice(0, 5);

	const exploreUrl = `/explore?weights=${encodeURIComponent(encoded)}`;

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)", paddingTop: "80px" }}>
			{/* Nav */}
			<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-[var(--color-border)]">
				<Link href="/" className="font-bold text-lg tracking-tight">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</Link>
				<div className="flex items-center gap-3">
					<Link href="/explore" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Explore</Link>
					<Link href="/best" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Best Cities</Link>
					<AuthNav />
					<Link href="/quiz" className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110" style={{ background: "var(--color-accent)", color: "#000" }}>
						Retake Quiz
					</Link>
				</div>
			</nav>

			{/* Personality reveal */}
			<section className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
				<p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--color-accent)" }}>
					Your Mover Profile
				</p>
				<div className="text-6xl mb-4">{personality.emoji}</div>
				<h1 className="text-3xl md:text-4xl font-bold mb-3">You&rsquo;re a {personality.name}</h1>
				<p className="text-lg max-w-xl mx-auto" style={{ color: "oklch(75% 0 0)" }}>
					{personality.tagline}
				</p>

				{/* Top factors */}
				<div className="flex flex-wrap justify-center gap-2 mt-5">
					{topFactors.map((f) => (
						<span
							key={f}
							className="text-xs px-3 py-1.5 rounded-full font-medium"
							style={{ background: "oklch(20% 0.05 220)", color: "var(--color-accent)", border: "1px solid oklch(28% 0.05 220)" }}
						>
							✓ {f}
						</span>
					))}
				</div>
			</section>

			{/* Top 5 cities */}
			<section className="max-w-3xl mx-auto px-6 pb-10">
				<h2 className="text-xl font-semibold mb-1">Your Top 5 Matches</h2>
				<p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
					Based on your answers — ranked by what matters most to you.
				</p>

				<div className="space-y-3">
					{top5.map((city, i) => (
						<Link
							key={city.id}
							href={`/city/${city.slug}`}
							className="group flex items-center gap-4 glass rounded-2xl p-4 hover:border-[var(--color-accent)] transition-colors"
						>
							{/* Rank */}
							<div
								className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
								style={{
									background: i === 0 ? "var(--color-accent)" : "oklch(20% 0.04 220)",
									color: i === 0 ? "#000" : "oklch(80% 0 0)",
								}}
							>
								{i + 1}
							</div>

							{/* Thumbnail */}
							{city.heroImageUrl ? (
								<div
									className="w-14 h-14 shrink-0 rounded-xl overflow-hidden"
									style={{ background: `url(${city.heroImageUrl}) center/cover no-repeat` }}
								/>
							) : (
								<div className="w-14 h-14 shrink-0 rounded-xl" style={{ background: "oklch(18% 0.04 220)" }} />
							)}

							{/* Info */}
							<div className="flex-1 min-w-0">
								<p className="font-semibold truncate">{city.name}</p>
								<p className="text-sm" style={{ color: "var(--color-muted)" }}>
									{city.stateId} · {CITY_TIERS[city.tier] ?? city.tier}
								</p>
							</div>

							{/* Score */}
							<MatchScoreBadge score={city.matchPct} size="md" className="shrink-0" />
						</Link>
					))}
				</div>
			</section>

			{/* CTAs */}
			<section className="max-w-3xl mx-auto px-6 pb-20 grid sm:grid-cols-2 gap-4">
				<Link
					href={exploreUrl}
					className="rounded-2xl p-6 flex flex-col gap-2 transition-all hover:border-[var(--color-accent)]"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<span className="text-2xl">🔍</span>
					<p className="font-bold">See all 2,700+ results</p>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>
						Browse the full ranked list with filters, map view, and side-by-side comparison.
					</p>
					<span className="text-sm font-semibold mt-1" style={{ color: "var(--color-accent)" }}>Open Explore →</span>
				</Link>
				<Link
					href="/quiz"
					className="rounded-2xl p-6 flex flex-col gap-2 transition-all hover:border-[var(--color-muted)]"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<span className="text-2xl">🔄</span>
					<p className="font-bold">Retake the quiz</p>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>
						Change your priorities and see how the rankings shift.
					</p>
					<span className="text-sm font-semibold mt-1" style={{ color: "var(--color-muted)" }}>Start over →</span>
				</Link>
			</section>
		</main>
	);
}
