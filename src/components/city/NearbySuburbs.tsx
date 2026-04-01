/**
 * NearbySuburbs — shows small cities / towns within ~30 miles of a major city.
 * Pros and cons are derived from existing filter score data; no AI calls needed.
 * Only rendered on major-city detail pages.
 */
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";

type ScoreMap = Partial<Record<string, number | null>>;

export type NearbySuburb = {
	id: string;
	name: string;
	slug: string;
	stateId: string;
	population: number | null;
	overallScore: number | null;
	tier: string;
	heroImageUrl: string | null;
	distMiles: number;
	filterScores: ScoreMap | null;
};

interface Props {
	suburbs: NearbySuburb[];
	majorCityName: string;
}

// ── Insight derivation ────────────────────────────────────────────────────────

function deriveInsights(
	fs: ScoreMap | null | undefined,
	distMiles: number,
	majorCityName: string,
	pop: number | null,
): { pros: string[]; cons: string[] } {
	const pros: string[] = [];
	const cons: string[] = [];

	const get = (key: string) => (fs?.[key] as number | null | undefined) ?? 50;

	// Distance is always a pro if close
	if (distMiles <= 20) pros.push(`~${distMiles} mi to ${majorCityName}`);

	// Pros
	if (get("scoreCostOfLiving") >= 63) pros.push("Lower cost of living");
	if (get("scoreSchoolQuality") >= 65) pros.push("Highly rated schools");
	if (get("scoreGreenSpace") >= 62) pros.push("Parks & green space");
	if (get("scorePropertyCrime") >= 65) pros.push("Low crime");
	if (get("scoreViolentCrime") >= 65 && !pros.includes("Low crime")) pros.push("Safe streets");
	if (get("scoreWalkability") >= 63) pros.push("Walkable streets");
	if (get("scoreNearOcean") >= 70) pros.push("Beach access");
	if (get("scoreNearMountains") >= 70) pros.push("Near mountains");
	if (get("scoreNearLake") >= 70) pros.push("Near lake");
	if (get("scoreWeather") >= 65) pros.push("Pleasant weather");
	if (get("scoreTrails") >= 65) pros.push("Great trails nearby");
	if (get("scoreAirQuality") >= 70) pros.push("Clean air");
	if (pop && pop < 80_000) pros.push("Quiet, community feel");

	// Cons
	if (get("scoreJobMarket") < 42) cons.push("Limited local jobs");
	if (get("scoreWalkability") < 38) cons.push("Car-dependent");
	if (get("scoreTransit") < 38) cons.push("Poor transit options");
	if (get("scoreRestaurants") < 38) cons.push("Fewer dining options");
	if (get("scoreNightlife") < 35) cons.push("Quiet nightlife scene");
	if (get("scorePropertyCrime") < 40) cons.push("Higher property crime");
	if (get("scoreCostOfLiving") < 38) cons.push("Higher cost of living");
	if (distMiles > 22) cons.push(`${distMiles} mi commute to city`);

	// Guarantee at least 1 con
	if (cons.length === 0) cons.push("Less urban amenities");

	return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
}

function tierLabel(tier: string): string {
	if (tier === "mid-size") return "Mid-size city";
	if (tier === "small-city") return "Small city";
	return "Town";
}

function scoreColor(score: number): string {
	if (score >= 70) return "#4ade80";
	if (score >= 50) return "#facc15";
	return "#f87171";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NearbySuburbs({ suburbs, majorCityName }: Props) {
	if (suburbs.length === 0) return null;

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-bold text-lg">🏡 Nearby Suburbs</h2>
				<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
					Smaller communities within 30 miles of {majorCityName} — often easier on the wallet with a short commute.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{suburbs.map((suburb) => {
					const { pros, cons } = deriveInsights(suburb.filterScores, suburb.distMiles, majorCityName, suburb.population);
					const score = Math.round(suburb.overallScore ?? 50);

					return (
						<Link
							key={suburb.id}
							href={`/city/${suburb.slug}`}
							className="glass rounded-2xl p-5 flex flex-col gap-3 group transition-all hover:ring-1"
							style={{ textDecoration: "none", "--tw-ring-color": "var(--color-accent)" } as React.CSSProperties}
						>
							{/* Header */}
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<h3 className="font-semibold truncate group-hover:text-[var(--color-accent)] transition-colors">
										{suburb.name}, {suburb.stateId}
									</h3>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-xs flex items-center gap-0.5" style={{ color: "var(--color-muted)" }}>
											<MapPin size={10} /> {suburb.distMiles} mi away
										</span>
										<span className="text-xs" style={{ color: "var(--color-muted)" }}>
											· {tierLabel(suburb.tier)}
										</span>
										{suburb.population && (
											<span className="text-xs" style={{ color: "var(--color-muted)" }}>
												· {Math.round(suburb.population / 1000)}k pop
											</span>
										)}
									</div>
								</div>
								<div className="flex flex-col items-center shrink-0">
									<span className="text-xl font-black tabular-nums" style={{ color: scoreColor(score) }}>
										{score}
									</span>
									<ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-accent)" }} />
								</div>
							</div>

							{/* Pros */}
							{pros.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{pros.map((p) => (
										<span
											key={p}
											className="text-xs px-2 py-0.5 rounded-full"
											style={{ background: "rgba(74,222,128,0.12)", color: "#86efac" }}
										>
											✓ {p}
										</span>
									))}
								</div>
							)}

							{/* Cons */}
							{cons.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{cons.map((c) => (
										<span
											key={c}
											className="text-xs px-2 py-0.5 rounded-full"
											style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5" }}
										>
											✗ {c}
										</span>
									))}
								</div>
							)}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
