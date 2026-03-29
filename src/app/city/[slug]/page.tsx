import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Users, Home, TrendingUp, Shield, GraduationCap, CloudSun, Footprints } from "lucide-react";
import { db } from "@/db";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { AISummary } from "@/components/city/AISummary";
import { SaveCityButton } from "@/components/shared/SaveCityButton";
import { NeighborhoodCards } from "@/components/city/NeighborhoodCards";
import { ReviewsList } from "@/components/city/ReviewsList";
import { ReviewForm } from "@/components/city/ReviewForm";
import { DownloadReportButton } from "@/components/city/DownloadReportButton";
import { RedditSentiment } from "@/components/city/RedditSentiment";
import { ScoreRadarChart, CostBreakdownChart, ClimateLineChart, DemographicsDonut } from "@/components/city/CityCharts";
import { ShareButtons } from "@/components/city/ShareButtons";
import { formatCurrency, formatNumber, formatPct, scoreToGrade, scoreToColor } from "@/lib/utils";

interface Props {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: { state: true, housing: true, jobs: true, climate: true },
	});
	if (!city) return { title: "City Not Found — Where Should I Move" };

	const price = city.housing?.medianHomePrice
		? `Median home $${Math.round(city.housing.medianHomePrice / 1000)}k.`
		: "";
	const income = city.jobs?.medianHouseholdIncome
		? `Median income $${Math.round(city.jobs.medianHouseholdIncome / 1000)}k.`
		: "";
	const sunny = city.climate?.sunnyDaysPerYear
		? `${city.climate.sunnyDaysPerYear} sunny days/year.`
		: "";

	const description = `Thinking of moving to ${city.name}, ${city.state?.name}? ${price} ${income} ${sunny} Full relocation guide with schools, safety, jobs, and more.`.trim();

	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
	const ogImage = city.heroImageUrl ?? `${appUrl}/og-default.png`;

	return {
		title: `${city.name}, ${city.state?.abbreviation ?? city.stateId} — Relocation Guide | Where Should I Move`,
		description,
		openGraph: {
			title: `Move to ${city.name}, ${city.state?.abbreviation ?? city.stateId}?`,
			description,
			url: `${appUrl}/city/${slug}`,
			images: [{ url: ogImage, width: 1200, height: 630, alt: `${city.name} skyline` }],
			type: "article",
		},
		twitter: {
			card: "summary_large_image",
			title: `${city.name}, ${city.state?.abbreviation ?? city.stateId} — Relocation Guide`,
			description,
			images: [ogImage],
		},
		alternates: { canonical: `${appUrl}/city/${slug}` },
	};
}

async function getCity(slug: string) {
	return db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: {
			state: true,
			housing: true,
			jobs: true,
			climate: true,
			safety: true,
			schools: true,
			walkability: true,
			demographics: true,
			lifestyle: true,
			filterScores: true,
			neighborhoods: true,
		},
	});
}

export default async function CityPage({ params }: Props) {
	const { slug } = await params;
	const city = await getCity(slug);

	if (!city) notFound();

	const h = city.housing;
	const j = city.jobs;
	const c = city.climate;
	const s = city.safety;
	const sc = city.schools;
	const w = city.walkability;
	const l = city.lifestyle;
	const fs = city.filterScores;

	// Category averages — mirrors computeCategoryScores() in ranking.ts so tile and detail match
	function avg(...vals: (number | null | undefined)[]): number {
		const valid = vals.filter((v): v is number => v != null);
		if (valid.length === 0) return 50;
		return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
	}
	const catEssentials = avg(fs?.scoreMedianHomePrice, fs?.scoreMedianRent, fs?.scoreJobMarket, fs?.scoreUnemployment, fs?.scoreMedianIncome);
	const catLifestyle = avg(fs?.scoreWalkability, fs?.scoreTransit, fs?.scoreBikeability, fs?.scoreRestaurants, fs?.scoreDiversity);
	const catSafety = avg(fs?.scoreViolentCrime, fs?.scorePropertyCrime);
	const catSchools = avg(fs?.scoreSchoolQuality, fs?.scoreGraduationRate);
	const catClimate = avg(fs?.scoreWeather, fs?.scoreAirQuality, fs?.scoreSunnyDays, fs?.scoreNaturalDisasterRisk);

	const score = Math.round(city.overallScore ?? 50);
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://whereshouldimove.us";

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Place",
		name: `${city.name}, ${city.state?.abbreviation ?? city.stateId}`,
		description: `Relocation guide for ${city.name}, ${city.state?.name}. Population ${city.population?.toLocaleString() ?? "N/A"}.`,
		url: `${appUrl}/city/${city.slug}`,
		...(city.lat && city.lng && {
			geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lng },
		}),
		containedInPlace: {
			"@type": "AdministrativeArea",
			name: city.state?.name,
			containedInPlace: { "@type": "Country", name: "United States" },
		},
	};

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			{/* Hero */}
			<div
				className="relative h-72 sm:h-96 flex items-end"
				style={{ background: "linear-gradient(160deg, oklch(18% 0.06 220) 0%, oklch(10% 0.02 200) 100%)" }}
			>
				{/* Overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

				{/* Back button */}
				{/* Nav overlay */}
				<div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
					<Link
						href="/explore"
						className="flex items-center gap-2 text-sm glass px-3 py-2 rounded-xl transition-colors hover:border-[var(--color-accent)]"
					>
						<ArrowLeft size={14} /> Explore
					</Link>
					<div className="flex items-center gap-2">
						<ShareButtons slug={city.slug} cityName={city.name} stateId={city.stateId} score={score} />
						<DownloadReportButton slug={city.slug} cityName={city.name} />
						<SaveCityButton cityId={city.id} cityName={city.name} />
						<MatchScoreBadge score={score} size="md" />
					</div>
				</div>

				<div className="relative p-8">
					<div className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--color-muted)" }}>
						<MapPin size={14} />
						<span>{city.county} County, {city.state?.name}</span>
					</div>
					<h1 className="text-4xl sm:text-5xl font-bold">{city.name}</h1>
					{city.metro && (
						<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>{city.metro}</p>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
				{/* Key stats grid */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<StatCard icon={Users} label="Population" value={formatNumber(city.population)} />
					<StatCard icon={Home} label="Median Home" value={formatCurrency(h?.medianHomePrice, { compact: true })} />
					<StatCard icon={TrendingUp} label="Median Income" value={formatCurrency(j?.medianHouseholdIncome, { compact: true })} />
					<StatCard icon={CloudSun} label="Sunny Days" value={c?.sunnyDaysPerYear ? `${c.sunnyDaysPerYear}/yr` : "N/A"} />
				</div>

				{/* Score breakdown + radar */}
				<div className="glass rounded-2xl p-6">
					<h2 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "var(--color-muted)" }}>
						Score Breakdown
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
						<div className="grid grid-cols-5 gap-2">
							{[
								{ label: "Essentials", score: catEssentials, icon: "💰" },
								{ label: "Lifestyle", score: catLifestyle, icon: "🎭" },
								{ label: "Safety", score: catSafety, icon: "🛡️" },
								{ label: "Schools", score: catSchools, icon: "🎓" },
								{ label: "Climate", score: catClimate, icon: "☀️" },
							].map((cat) => (
								<div key={cat.label} className="flex flex-col items-center gap-2 text-center">
									<span className="text-xl">{cat.icon}</span>
									<span className="text-xs" style={{ color: "var(--color-muted)" }}>{cat.label}</span>
									<span className={`text-lg font-bold ${scoreToColor(cat.score)}`}>
										{cat.score ?? "—"}
									</span>
								</div>
							))}
						</div>
						{fs && (
							<ScoreRadarChart
								essentials={catEssentials}
								lifestyle={catLifestyle}
								practical={catSafety}
								family={catSchools}
								nature={catClimate}
							/>
						)}
					</div>
				</div>

				{/* Cost + Climate charts */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{(h?.medianHomePrice || h?.medianRent2Bed || j?.medianHouseholdIncome) && (
						<div className="glass rounded-2xl p-6">
							<h2 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "var(--color-muted)" }}>
								Cost vs National Average
							</h2>
							<CostBreakdownChart
								medianHomePrice={h?.medianHomePrice ?? null}
								medianRent={h?.medianRent2Bed ?? null}
								medianIncome={j?.medianHouseholdIncome ?? null}
							/>
						</div>
					)}
					{(c?.avgTempJan && c?.avgTempJul) && (
						<div className="glass rounded-2xl p-6">
							<h2 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "var(--color-muted)" }}>
								Climate Overview
							</h2>
							<ClimateLineChart
								avgTempJan={c.avgTempJan}
								avgTempJul={c.avgTempJul}
								sunnyDaysPerYear={c.sunnyDaysPerYear ?? null}
								avgRainfallInches={c.avgRainfallInches ?? null}
							/>
						</div>
					)}
				</div>
				{/* AI Summary */}
				<AISummary slug={city.slug} cityName={city.name} />

				{/* Two-column layout */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Housing */}
					<Section title="🏡 Housing" icon={Home}>
						<DataRow label="Median Home Price" value={formatCurrency(h?.medianHomePrice)} />
						<DataRow label="Median 2BR Rent" value={formatCurrency(h?.medianRent2Bed)} />
						<DataRow label="Affordability Index" value={h?.affordabilityIndex?.toFixed(2)} />
						<DataRow label="Home Value Growth (1yr)" value={formatPct(h?.homeValueGrowth1yr)} />
						{h?.hotMarket && (
							<div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: "oklch(20% 0.08 30)", color: "oklch(75% 0.12 30)" }}>
								🔥 Hot Market
							</div>
						)}
					</Section>

					{/* Jobs */}
					<Section title="💼 Jobs & Economy" icon={TrendingUp}>
						<DataRow label="Unemployment Rate" value={formatPct(j?.unemploymentRate)} />
						<DataRow label="Median Household Income" value={formatCurrency(j?.medianHouseholdIncome)} />
						<DataRow label="Job Growth Rate (1yr)" value={formatPct(j?.jobGrowthRate)} />
					</Section>

					{/* Climate */}
					<Section title="☀️ Climate" icon={CloudSun}>
						<DataRow label="Avg Jan Temp" value={c?.avgTempJan ? `${c.avgTempJan}°F` : "N/A"} />
						<DataRow label="Avg Jul Temp" value={c?.avgTempJul ? `${c.avgTempJul}°F` : "N/A"} />
						<DataRow label="Sunny Days / Year" value={c?.sunnyDaysPerYear?.toString()} />
						<DataRow label="Annual Rainfall" value={c?.avgRainfallInches ? `${c.avgRainfallInches}"` : "N/A"} />
						<DataRow label="Annual Snowfall" value={c?.avgSnowfallInches ? `${c.avgSnowfallInches}"` : "N/A"} />
						<DataRow label="Air Quality Index" value={c?.airQualityIndex?.toString()} />
						<div className="mt-2 flex flex-wrap gap-2">
							{(["tornadoRisk", "hurricaneRisk", "wildfireRisk"] as const).map((riskKey) => {
								const risk = c?.[riskKey] ?? "low";
								const colorMap: Record<string, string> = { low: "text-emerald-400", moderate: "text-yellow-400", high: "text-orange-400", "very-high": "text-red-400" };
								const labelMap: Record<string, string> = { tornadoRisk: "Tornado", hurricaneRisk: "Hurricane", wildfireRisk: "Wildfire" };
								return (
									<span key={riskKey} className={`text-xs px-2 py-0.5 rounded-full ${colorMap[risk ?? "low"]}`} style={{ background: "var(--color-surface-2)" }}>
										{labelMap[riskKey]}: {risk}
									</span>
								);
							})}
						</div>
					</Section>

					{/* Safety */}
					<Section title="🛡️ Safety" icon={Shield}>
						<DataRow label="Violent Crime Rate" value={s?.violentCrimeRate ? `${s.violentCrimeRate} / 100k` : "N/A"} />
						<DataRow label="Property Crime Rate" value={s?.propertyCrimeRate ? `${s.propertyCrimeRate} / 100k` : "N/A"} />
						{s?.crimeGrade && (
							<DataRow label="Crime Grade" value={s.crimeGrade} />
						)}
						{s?.dataYear && (
							<p className="text-xs mt-2" style={{ color: "var(--color-muted)" }}>Data: FBI UCR {s.dataYear}</p>
						)}
					</Section>

					{/* Schools */}
					<Section title="🎓 Schools" icon={GraduationCap}>
						<DataRow label="GreatSchools Rating" value={sc?.greatSchoolsRating ? `${sc.greatSchoolsRating} / 10` : "N/A"} />
						<DataRow label="Graduation Rate" value={formatPct(sc?.graduationRate)} />
						<DataRow label="Pupil-Teacher Ratio" value={sc?.pupilTeacherRatio?.toFixed(1)} />
						<DataRow label="Per-Pupil Spending" value={formatCurrency(sc?.perPupilSpending)} />
					</Section>

					{/* Walkability */}
					<Section title="🚶 Walkability" icon={Footprints}>
						<DataRow label="Walk Score" value={w?.walkScore?.toString()} />
						<DataRow label="Transit Score" value={w?.transitScore?.toString()} />
						<DataRow label="Bike Score" value={w?.bikeScore?.toString()} />
						{w?.walkScoreLabel && <DataRow label="Walk Grade" value={w.walkScoreLabel} />}
					</Section>
				</div>

				{/* Nature & Location */}
				{l && (
					<div className="glass rounded-2xl p-6">
						<h2 className="font-bold mb-4">🌿 Nature & Location</h2>
						<div className="flex flex-wrap gap-3">
							{l.nearOcean && <Chip label="Near Ocean 🌊" />}
							{l.nearMountains && <Chip label="Near Mountains ⛰️" />}
							{l.nearLake && <Chip label="Near Lake 🏞️" />}
							{l.nearNationalPark && <Chip label="National Park nearby 🦌" />}
							{l.majorAirportNearby && (
								<Chip label={l.closestAirportCode ? `Airport: ${l.closestAirportCode} ✈️` : "Major Airport nearby ✈️"} />
							)}
						</div>
						{l.lgbtqFriendlyScore && (
							<div className="mt-4">
								<DataRow label="LGBTQ+ Friendliness" value={`${l.lgbtqFriendlyScore} / 100`} />
							</div>
						)}
					</div>
				)}

				{/* Demographics */}
				{city.demographics && (city.demographics.pctWhite || city.demographics.pctBlack || city.demographics.pctHispanic) && (
					<div className="glass rounded-2xl p-6 space-y-5">
						<h2 className="font-bold text-lg">Demographics</h2>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
							<DemographicsDonut
								pctWhite={city.demographics.pctWhite ?? null}
								pctBlack={city.demographics.pctBlack ?? null}
								pctHispanic={city.demographics.pctHispanic ?? null}
								pctAsian={city.demographics.pctAsian ?? null}
								pctOther={city.demographics.pctOther ?? null}
							/>
							<div className="space-y-2">
								{city.demographics.pctCollegeEducated && (
									<DataRow label="College Educated" value={`${city.demographics.pctCollegeEducated.toFixed(0)}%`} />
								)}
								{city.demographics.pctUnder18 && (
									<DataRow label="Under 18" value={`${city.demographics.pctUnder18.toFixed(0)}%`} />
								)}
								{city.demographics.pctOver65 && (
									<DataRow label="Over 65" value={`${city.demographics.pctOver65.toFixed(0)}%`} />
								)}
								{city.demographics.homeownershipRate && (
									<DataRow label="Homeownership" value={`${city.demographics.homeownershipRate.toFixed(0)}%`} />
								)}
								{city.demographics.pctMarried && (
									<DataRow label="Married Households" value={`${city.demographics.pctMarried.toFixed(0)}%`} />
								)}
								{city.demographics.pctForeignBorn && (
									<DataRow label="Foreign Born" value={`${city.demographics.pctForeignBorn.toFixed(0)}%`} />
								)}
								{city.demographics.diversityIndex && (
									<DataRow label="Diversity Index" value={city.demographics.diversityIndex.toFixed(2)} />
								)}
							</div>
						</div>
					</div>
				)}

				{/* Neighborhoods */}
				<NeighborhoodCards neighborhoods={city.neighborhoods ?? []} cityName={city.name} />

				{/* Resident Reviews */}
				<div className="glass rounded-2xl p-6 space-y-6">
					<h2 className="font-bold text-lg">Resident Reviews</h2>
					<ReviewsList slug={city.slug} />
					<div>
						<h3 className="font-semibold text-sm mb-4" style={{ color: "var(--color-muted)" }}>
							Write a Review
						</h3>
						<ReviewForm slug={city.slug} />
					</div>
				</div>

				{/* Reddit Community Sentiment */}
				<div className="glass rounded-2xl p-6 space-y-4">
					<div className="flex items-center gap-2">
						<h2 className="font-bold text-lg">Community Buzz</h2>
						<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,69,0,0.15)", color: "#ff4500" }}>Reddit</span>
					</div>
					<RedditSentiment slug={city.slug} cityName={city.name} />
				</div>
			</div>
		</main>
	);
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
	return (
		<div className="glass rounded-xl p-4 flex flex-col gap-1">
			<div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
				<Icon size={12} />
				{label}
			</div>
			<span className="text-lg font-bold">{value}</span>
		</div>
	);
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
	return (
		<div className="glass rounded-2xl p-6">
			<h2 className="font-bold mb-4">{title}</h2>
			<div className="space-y-2">{children}</div>
		</div>
	);
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span style={{ color: "var(--color-muted)" }}>{label}</span>
			<span className="font-medium">{value ?? "N/A"}</span>
		</div>
	);
}

function Chip({ label }: { label: string }) {
	return (
		<span
			className="text-xs px-3 py-1.5 rounded-full font-medium"
			style={{ background: "oklch(18% 0.04 220)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
		>
			{label}
		</span>
	);
}

export async function generateStaticParams() {
	const cities = await db.query.cities.findMany({ columns: { slug: true } });
	return cities.map((c) => ({ slug: c.slug }));
}
