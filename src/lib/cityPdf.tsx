/**
 * City report PDF template using @react-pdf/renderer.
 * Generates a printable relocation report for a city.
 */
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Font,
} from "@react-pdf/renderer";

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	page: {
		backgroundColor: "#0f0f0f",
		color: "#f0f0f0",
		fontFamily: "Helvetica",
		padding: 40,
	},
	// Header
	header: { marginBottom: 24 },
	brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
	brand: { fontSize: 10, color: "#00d4ff", fontFamily: "Helvetica-Bold" },
	brandSub: { fontSize: 10, color: "#888", marginLeft: 4 },
	cityName: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#f0f0f0", marginBottom: 4 },
	cityMeta: { fontSize: 11, color: "#888" },
	divider: { height: 1, backgroundColor: "#2a2a2a", marginVertical: 16 },
	// Score badge
	scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
	scoreBadge: {
		backgroundColor: "#00d4ff",
		color: "#000",
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 20,
		marginRight: 12,
	},
	scoreLabel: { fontSize: 11, color: "#888" },
	// Sections
	section: { marginBottom: 20 },
	sectionTitle: {
		fontSize: 13,
		fontFamily: "Helvetica-Bold",
		color: "#00d4ff",
		marginBottom: 10,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	grid2: { flexDirection: "row", flexWrap: "wrap" },
	stat: { width: "50%", marginBottom: 8 },
	statLabel: { fontSize: 9, color: "#888", marginBottom: 2 },
	statValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#f0f0f0" },
	// Risk badges
	badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
		fontSize: 9,
	},
	badgeLow: { backgroundColor: "#14532d", color: "#4ade80" },
	badgeMod: { backgroundColor: "#7c2d12", color: "#fdba74" },
	badgeHigh: { backgroundColor: "#7f1d1d", color: "#fca5a5" },
	// Footer
	footer: {
		position: "absolute",
		bottom: 24,
		left: 40,
		right: 40,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#2a2a2a",
		paddingTop: 10,
	},
	footerText: { fontSize: 8, color: "#555" },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number | null | undefined, compact = false): string {
	if (n == null) return "N/A";
	if (compact && n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (compact && n >= 1_000) return `$${Math.round(n / 1_000)}K`;
	return `$${n.toLocaleString()}`;
}
function fmt(n: number | null | undefined, suffix = ""): string {
	if (n == null) return "N/A";
	return `${n}${suffix}`;
}

function riskBadge(risk: string | null | undefined, label: string) {
	const style =
		risk === "very-high" || risk === "high"
			? styles.badgeHigh
			: risk === "moderate"
				? styles.badgeMod
				: styles.badgeLow;
	const val = risk ?? "low";
	return (
		<View key={label} style={[styles.badge, style]}>
			<Text>{label}: {val}</Text>
		</View>
	);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CityData {
	name: string;
	stateId: string;
	population: number | null;
	county: string | null;
	overallScore: number | null;
	housing: { medianHomePrice?: number | null; medianRent2Bed?: number | null; affordabilityIndex?: number | null; homeValueGrowth1yr?: number | null } | null;
	jobs: { unemploymentRate?: number | null; medianHouseholdIncome?: number | null; jobGrowthRate?: number | null } | null;
	climate: { avgTempJan?: number | null; avgTempJul?: number | null; sunnyDaysPerYear?: number | null; avgRainfallInches?: number | null; avgSnowfallInches?: number | null; airQualityIndex?: number | null; tornadoRisk?: string | null; hurricaneRisk?: string | null; wildfireRisk?: string | null } | null;
	safety: { violentCrimeRate?: number | null; propertyCrimeRate?: number | null; crimeGrade?: string | null } | null;
	schools: { greatSchoolsRating?: number | null; graduationRate?: number | null; pupilTeacherRatio?: number | null; perPupilSpending?: number | null } | null;
	walkability: { walkScore?: number | null; transitScore?: number | null; bikeScore?: number | null } | null;
}

// ── PDF Document ─────────────────────────────────────────────────────────────

export function CityReportPdf({ city, generatedAt }: { city: CityData; generatedAt: string }) {
	const score = Math.round(city.overallScore ?? 50);

	return (
		<Document title={`${city.name} Relocation Report — NextHome USA`} author="NextHome USA">
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.brandRow}>
						<Text style={styles.brand}>NextHome USA</Text>
						<Text style={styles.brandSub}> · Relocation Research Platform</Text>
					</View>
					<Text style={styles.cityName}>{city.name}, {city.stateId}</Text>
					<Text style={styles.cityMeta}>
						{city.county ? `${city.county} County  ·  ` : ""}
						{city.population ? `Pop. ${city.population.toLocaleString()}` : ""}
					</Text>
				</View>

				<View style={styles.scoreRow}>
					<Text style={styles.scoreBadge}>{score}</Text>
					<Text style={styles.scoreLabel}>Overall Score  ·  Generated {new Date(generatedAt).toLocaleDateString()}</Text>
				</View>

				<View style={styles.divider} />

				{/* Housing */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Housing & Cost</Text>
					<View style={styles.grid2}>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Median Home Price</Text>
							<Text style={styles.statValue}>{fmt$(city.housing?.medianHomePrice, true)}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Median 2BR Rent</Text>
							<Text style={styles.statValue}>{fmt$(city.housing?.medianRent2Bed)}/mo</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Affordability Index</Text>
							<Text style={styles.statValue}>{city.housing?.affordabilityIndex?.toFixed(2) ?? "N/A"}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Home Value Growth (1yr)</Text>
							<Text style={styles.statValue}>{fmt(city.housing?.homeValueGrowth1yr, "%")}</Text>
						</View>
					</View>
				</View>

				{/* Jobs */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Jobs & Economy</Text>
					<View style={styles.grid2}>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Median Household Income</Text>
							<Text style={styles.statValue}>{fmt$(city.jobs?.medianHouseholdIncome, true)}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Unemployment Rate</Text>
							<Text style={styles.statValue}>{fmt(city.jobs?.unemploymentRate, "%")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Job Growth Rate (1yr)</Text>
							<Text style={styles.statValue}>{fmt(city.jobs?.jobGrowthRate, "%")}</Text>
						</View>
					</View>
				</View>

				{/* Climate */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Climate</Text>
					<View style={styles.grid2}>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Avg January Temp</Text>
							<Text style={styles.statValue}>{fmt(city.climate?.avgTempJan, "°F")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Avg July Temp</Text>
							<Text style={styles.statValue}>{fmt(city.climate?.avgTempJul, "°F")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Sunny Days / Year</Text>
							<Text style={styles.statValue}>{fmt(city.climate?.sunnyDaysPerYear)}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Air Quality Index</Text>
							<Text style={styles.statValue}>{fmt(city.climate?.airQualityIndex)}</Text>
						</View>
					</View>
					<View style={styles.badgeRow}>
						{riskBadge(city.climate?.tornadoRisk, "Tornado")}
						{riskBadge(city.climate?.hurricaneRisk, "Hurricane")}
						{riskBadge(city.climate?.wildfireRisk, "Wildfire")}
					</View>
				</View>

				{/* Safety */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Safety</Text>
					<View style={styles.grid2}>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Violent Crime Rate (per 100k)</Text>
							<Text style={styles.statValue}>{fmt(city.safety?.violentCrimeRate)}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Property Crime Rate (per 100k)</Text>
							<Text style={styles.statValue}>{fmt(city.safety?.propertyCrimeRate)}</Text>
						</View>
						{city.safety?.crimeGrade && (
							<View style={styles.stat}>
								<Text style={styles.statLabel}>Crime Grade</Text>
								<Text style={styles.statValue}>{city.safety.crimeGrade}</Text>
							</View>
						)}
					</View>
				</View>

				{/* Schools + Walkability side by side */}
				<View style={{ flexDirection: "row", gap: 20 }}>
					<View style={[styles.section, { flex: 1 }]}>
						<Text style={styles.sectionTitle}>Education</Text>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>GreatSchools Rating</Text>
							<Text style={styles.statValue}>{fmt(city.schools?.greatSchoolsRating, " / 10")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Graduation Rate</Text>
							<Text style={styles.statValue}>{fmt(city.schools?.graduationRate, "%")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Per-Pupil Spending</Text>
							<Text style={styles.statValue}>{fmt$(city.schools?.perPupilSpending)}</Text>
						</View>
					</View>
					<View style={[styles.section, { flex: 1 }]}>
						<Text style={styles.sectionTitle}>Walkability</Text>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Walk Score</Text>
							<Text style={styles.statValue}>{fmt(city.walkability?.walkScore, " / 100")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Transit Score</Text>
							<Text style={styles.statValue}>{fmt(city.walkability?.transitScore, " / 100")}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Bike Score</Text>
							<Text style={styles.statValue}>{fmt(city.walkability?.bikeScore, " / 100")}</Text>
						</View>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>NextHome USA — nexthomeusa.com</Text>
					<Text style={styles.footerText}>Data sourced from Census, BLS, NOAA, GreatSchools, FBI UCR</Text>
					<Text style={styles.footerText}>{new Date(generatedAt).toLocaleDateString()}</Text>
				</View>
			</Page>
		</Document>
	);
}
