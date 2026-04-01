import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { computeMatchPct, computeCategoryScores, normalizeWeights } from "@/lib/ranking";
import type { CityFilterScores } from "@/db/schema";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { CompareButton } from "@/components/shared/CompareBar";
import { AuthNav } from "@/components/layout/AuthNav";
import { PERSONAS, getPersona } from "../personas";

interface Props {
	params: Promise<{ persona: string }>;
}

export async function generateStaticParams() {
	return PERSONAS.map((p) => ({ persona: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { persona: slug } = await params;
	const persona = getPersona(slug);
	if (!persona) return {};
	return {
		title: `${persona.title} — Best US Cities | Where Should I Move`,
		description: persona.description,
		openGraph: {
			title: `${persona.emoji} ${persona.title}: Best US Cities`,
			description: persona.description,
		},
	};
}

const CITY_TIERS: Record<string, string> = {
	"major-city": "Major City",
	"mid-size": "Mid-Size",
	"small-city": "Small City",
	suburb: "Suburb",
	neighborhood: "Neighborhood",
};

export default async function PersonaPage({ params }: Props) {
	const { persona: slug } = await params;
	const persona = getPersona(slug);
	if (!persona) notFound();

	const weights = normalizeWeights(persona.weights);

	// Fetch cities with filter scores
	const allCities = await db.query.cities.findMany({
		with: { filterScores: true },
	});

	// Compute match % and sort
	const ranked = allCities
		.filter((c) => c.filterScores != null)
		.map((c) => {
			const fs = c.filterScores as CityFilterScores;
			return {
				id: c.id,
				slug: c.slug,
				name: c.name,
				stateId: c.stateId,
				tier: c.tier,
				population: c.population,
				heroImageUrl: c.heroImageUrl,
				matchPct: computeMatchPct(fs, weights),
				categoryScores: computeCategoryScores(fs, weights),
			};
		})
		.sort((a, b) => b.matchPct - a.matchPct)
		.slice(0, 12);

	// Top factors for this persona (highest weighted keys, human labels)
	const SCORE_LABELS: Record<string, string> = {
		scoreTrails: "Trails", scoreNearMountains: "Mountains", scoreNationalPark: "National Parks",
		scoreAirQuality: "Air Quality", scoreGreenSpace: "Green Space", scoreNearOcean: "Ocean Access",
		scoreWalkability: "Walkability", scoreTransit: "Transit", scoreBikeability: "Biking",
		scoreRestaurants: "Food Scene", scoreNightlife: "Nightlife", scoreArtsAndCulture: "Arts & Culture",
		scoreDiversity: "Diversity", scoreTechHub: "Tech Hub", scoreCollegeTown: "College Town",
		scoreJobMarket: "Job Market", scoreMedianIncome: "Income", scoreIncomeGrowth: "Income Growth",
		scoreCostOfLiving: "Cost of Living", scoreMedianRent: "Rent", scoreMedianHomePrice: "Home Prices",
		scoreTaxBurden: "Low Taxes", scoreAffordabilityIndex: "Affordability",
		scoreViolentCrime: "Safety", scorePropertyCrime: "Property Safety",
		scoreHealthcare: "Healthcare", scoreBroadband: "Internet",
		scoreSchoolQuality: "Schools", scoreGraduationRate: "Graduation Rate",
		scoreChildcare: "Childcare", scoreWarmClimate: "Warm Weather", scoreSunnyDays: "Sunny Days",
	};

	const topFactors = Object.entries(weights)
		.sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
		.slice(0, 5)
		.map(([key]) => SCORE_LABELS[key] ?? key);

	return (
		<main className="min-h-screen" style={{ paddingTop: "80px" }}>
			<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-[var(--color-border)]">
				<Link href="/" className="font-bold text-lg tracking-tight">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</Link>
				<div className="flex items-center gap-3">
					<Link href="/explore" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Explore</Link>
					<Link href="/map" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Map</Link>
					<Link href="/best" className="text-sm transition-colors hover:text-white hidden sm:inline font-medium" style={{ color: "var(--color-accent)" }}>Best Cities</Link>
					<AuthNav />
					<Link href="/quiz" className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110" style={{ background: "var(--color-accent)", color: "#000" }}>
						Take Quiz
					</Link>
				</div>
			</nav>

			{/* Breadcrumb */}
			<div className="max-w-6xl mx-auto px-6 pt-6">
				<Link href="/best" className="text-sm hover:underline" style={{ color: "var(--color-muted)" }}>
					← All Collections
				</Link>
			</div>

			{/* Hero */}
			<section className="max-w-6xl mx-auto px-6 py-10">
				<div className="flex flex-col md:flex-row md:items-end gap-6">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-3">
							<span className="text-5xl">{persona.emoji}</span>
							<div>
								<p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>
									Best Cities For
								</p>
								<h1 className="text-3xl md:text-4xl font-bold">{persona.title}</h1>
							</div>
						</div>
						<p className="text-lg max-w-2xl" style={{ color: "oklch(80% 0 0)" }}>
							{persona.description}
						</p>
						<div className="flex flex-wrap gap-2 mt-4">
							{topFactors.map((f) => (
								<span
									key={f}
									className="text-xs px-3 py-1 rounded-full font-medium"
									style={{ background: "oklch(20% 0.05 220)", color: "var(--color-accent)", border: "1px solid oklch(28% 0.05 220)" }}
								>
									✓ {f}
								</span>
							))}
						</div>
					</div>
					<div
						className="rounded-2xl p-4 text-sm max-w-xs"
						style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)", color: "oklch(75% 0 0)" }}
					>
						<span className="text-lg">💬</span>
						<p className="mt-1 italic">&ldquo;{persona.personalitySummary}&rdquo;</p>
					</div>
				</div>
			</section>

			{/* City grid */}
			<section className="max-w-6xl mx-auto px-6 pb-10">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-xl font-semibold">Top 12 Cities</h2>
					<Link
						href={`/explore?weights=${encodeURIComponent(Buffer.from(JSON.stringify(weights)).toString("base64url"))}`}
						className="text-sm font-medium hover:underline"
						style={{ color: "var(--color-accent)" }}
					>
						See all results →
					</Link>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
					{ranked.map((city, i) => (
						<div key={city.id} className="group glass rounded-2xl overflow-hidden flex flex-col hover:border-[var(--color-accent)] transition-colors relative">
							{/* Rank badge */}
							<div
								className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
								style={{ background: "rgba(0,0,0,0.7)", color: i < 3 ? "var(--color-accent)" : "oklch(80% 0 0)", border: i < 3 ? "1px solid var(--color-accent)" : "none" }}
							>
								{i + 1}
							</div>
							<Link href={`/city/${city.slug}`}>
								<div
									className="h-40 relative flex items-end p-4"
									style={{
										background: city.heroImageUrl
											? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65)), url(${city.heroImageUrl}) center/cover no-repeat`
											: "linear-gradient(135deg, oklch(20% 0.05 220), oklch(14% 0.02 200))",
									}}
								>
									<MatchScoreBadge score={city.matchPct} size="md" className="absolute top-3 right-3" />
									<div>
										<p className="font-bold text-base leading-tight">{city.name}</p>
										<p className="text-sm" style={{ color: "oklch(80% 0 0)" }}>
											{city.stateId} · {CITY_TIERS[city.tier]?.split(" ")[0] ?? city.tier}
										</p>
									</div>
								</div>
							</Link>
							<div className="p-3 flex items-center justify-between gap-2">
								<div className="flex gap-3">
									{[
										{ label: "Match", value: `${city.matchPct}%`, accent: true },
										{ label: "Safety", value: `${city.categoryScores?.practical ?? "—"}` },
										{ label: "Climate", value: `${city.categoryScores?.nature ?? "—"}` },
									].map((stat) => (
										<div key={stat.label} className="flex flex-col items-center gap-0.5">
											<span className="text-xs" style={{ color: stat.accent ? "var(--color-accent)" : "var(--color-muted)" }}>
												{stat.label}
											</span>
											<span className="text-sm font-semibold">{stat.value}</span>
										</div>
									))}
								</div>
								<CompareButton entry={{ id: city.id, slug: city.slug, name: city.name, stateId: city.stateId }} />
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Explore more + quiz CTA */}
			<section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-5">
				<div
					className="rounded-2xl p-6"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<p className="font-bold text-lg mb-1">Browse all results</p>
					<p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
						See the full ranked list with filters, maps, and more.
					</p>
					<Link
						href={`/explore?weights=${encodeURIComponent(Buffer.from(JSON.stringify(weights)).toString("base64url"))}`}
						className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
						style={{ background: "oklch(25% 0.05 220)", color: "var(--color-text)", border: "1px solid oklch(32% 0.05 220)" }}
					>
						Open in Explore →
					</Link>
				</div>
				<div
					className="rounded-2xl p-6"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<p className="font-bold text-lg mb-1">Get a fully personalized list</p>
					<p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
						Answer 11 questions and we'll rank all 2,700+ cities just for you.
					</p>
					<Link
						href="/quiz"
						className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Take the AI Quiz →
					</Link>
				</div>
			</section>

			{/* Other personas */}
			<section className="max-w-6xl mx-auto px-6 pb-20">
				<h2 className="text-xl font-semibold mb-5">Other Collections</h2>
				<div className="flex flex-wrap gap-3">
					{PERSONAS.filter((p) => p.slug !== slug).map((p) => (
						<Link
							key={p.slug}
							href={`/best/${p.slug}`}
							className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:border-[var(--color-accent)] transition-colors"
							style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
						>
							<span>{p.emoji}</span>
							<span>{p.title}</span>
						</Link>
					))}
				</div>
			</section>
		</main>
	);
}
