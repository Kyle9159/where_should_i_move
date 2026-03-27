/**
 * City comparison PDF template using @react-pdf/renderer.
 * Shows 2–4 cities side by side for easy comparison.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface CityData {
	name: string;
	stateId: string;
	population: number | null;
	overallScore: number | null;
	housing: { medianHomePrice?: number | null; medianRent2Bed?: number | null; affordabilityIndex?: number | null } | null;
	jobs: { unemploymentRate?: number | null; medianHouseholdIncome?: number | null; jobGrowthRate?: number | null } | null;
	climate: { avgTempJan?: number | null; avgTempJul?: number | null; sunnyDaysPerYear?: number | null; airQualityIndex?: number | null } | null;
	safety: { violentCrimeRate?: number | null; propertyCrimeRate?: number | null } | null;
	schools: { greatSchoolsRating?: number | null; graduationRate?: number | null } | null;
	walkability: { walkScore?: number | null; transitScore?: number | null } | null;
}

const CYAN = "#00d4ff";
const DARK = "#0f0f0f";
const MID = "#888";
const LIGHT = "#f0f0f0";
const BORDER = "#2a2a2a";

const styles = StyleSheet.create({
	page: {
		backgroundColor: DARK,
		color: LIGHT,
		fontFamily: "Helvetica",
		padding: 32,
		fontSize: 9,
	},
	header: {
		marginBottom: 16,
		borderBottom: "1pt solid #2a2a2a",
		paddingBottom: 12,
	},
	brand: { fontSize: 10, color: "#00d4ff", fontFamily: "Helvetica-Bold", marginBottom: 4 },
	title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#f0f0f0", marginBottom: 2 },
	subtitle: { fontSize: 9, color: "#888" },
	table: { flexDirection: "column" },
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#1a1a1a",
		borderBottom: "1pt solid #2a2a2a",
		paddingVertical: 6,
		paddingHorizontal: 8,
	},
	tableRow: {
		flexDirection: "row",
		borderBottom: "0.5pt solid #2a2a2a",
		paddingVertical: 5,
		paddingHorizontal: 8,
	},
	tableRowAlt: {
		flexDirection: "row",
		borderBottom: "0.5pt solid #2a2a2a",
		paddingVertical: 5,
		paddingHorizontal: 8,
		backgroundColor: "#131313",
	},
	metricCol: { width: "28%", color: "#888" },
	cityCol: { flex: 1, textAlign: "center" },
	cityHeader: { fontFamily: "Helvetica-Bold", color: "#00d4ff", fontSize: 10 },
	citySubheader: { color: "#888", fontSize: 8 },
	winnerCell: { fontFamily: "Helvetica-Bold", color: "#00d4ff" },
	normalCell: { color: "#f0f0f0" },
	sectionLabel: {
		backgroundColor: "#1e1e1e",
		paddingVertical: 5,
		paddingHorizontal: 8,
		color: "#00d4ff",
		fontFamily: "Helvetica-Bold",
		fontSize: 9,
		textTransform: "uppercase",
	},
	footer: {
		position: "absolute",
		bottom: 20,
		left: 32,
		right: 32,
		flexDirection: "row",
		justifyContent: "space-between",
		borderTop: "1pt solid #2a2a2a",
		paddingTop: 6,
	},
	footerText: { fontSize: 7, color: "#555" },
});

function fmt(val: number | null | undefined, prefix = "", suffix = "", decimals = 0): string {
	if (val == null) return "—";
	const n = Number(val);
	return `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

function currency(val: number | null | undefined): string {
	if (val == null) return "—";
	if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
	if (val >= 1_000) return `$${Math.round(val / 1_000)}K`;
	return `$${val}`;
}

function winner(cities: CityData[], getValue: (c: CityData) => number | null | undefined, higherIsBetter = true): number {
	let best: number | null = null;
	let bestIdx = -1;
	cities.forEach((c, i) => {
		const v = getValue(c);
		if (v == null) return;
		if (best === null || (higherIsBetter ? v > best : v < best)) { best = v; bestIdx = i; }
	});
	return bestIdx;
}

const sections = [
	{ title: "Housing & Cost", rows: [
		{ label: "Median Home Price", getValue: (c: CityData) => c.housing?.medianHomePrice, format: currency, higherIsBetter: false },
		{ label: "Median 2BR Rent", getValue: (c: CityData) => c.housing?.medianRent2Bed, format: (v: number | null | undefined) => currency(v) + "/mo", higherIsBetter: false },
		{ label: "Affordability Index", getValue: (c: CityData) => c.housing?.affordabilityIndex, format: (v: number | null | undefined) => fmt(v, "", "", 2), higherIsBetter: true },
	]},
	{ title: "Jobs & Economy", rows: [
		{ label: "Median Household Income", getValue: (c: CityData) => c.jobs?.medianHouseholdIncome, format: currency, higherIsBetter: true },
		{ label: "Unemployment Rate", getValue: (c: CityData) => c.jobs?.unemploymentRate, format: (v: number | null | undefined) => fmt(v, "", "%", 1), higherIsBetter: false },
		{ label: "Job Growth Rate", getValue: (c: CityData) => c.jobs?.jobGrowthRate, format: (v: number | null | undefined) => fmt(v, "", "%", 1), higherIsBetter: true },
	]},
	{ title: "Climate", rows: [
		{ label: "Sunny Days / Year", getValue: (c: CityData) => c.climate?.sunnyDaysPerYear, format: (v: number | null | undefined) => fmt(v, "", " days"), higherIsBetter: true },
		{ label: "July Avg Temp", getValue: (c: CityData) => c.climate?.avgTempJul, format: (v: number | null | undefined) => fmt(v, "", "°F"), higherIsBetter: false },
		{ label: "January Avg Temp", getValue: (c: CityData) => c.climate?.avgTempJan, format: (v: number | null | undefined) => fmt(v, "", "°F"), higherIsBetter: true },
		{ label: "Air Quality Index", getValue: (c: CityData) => c.climate?.airQualityIndex, format: (v: number | null | undefined) => fmt(v, "", " AQI"), higherIsBetter: false },
	]},
	{ title: "Safety", rows: [
		{ label: "Violent Crime /100k", getValue: (c: CityData) => c.safety?.violentCrimeRate, format: (v: number | null | undefined) => fmt(v), higherIsBetter: false },
		{ label: "Property Crime /100k", getValue: (c: CityData) => c.safety?.propertyCrimeRate, format: (v: number | null | undefined) => fmt(v), higherIsBetter: false },
	]},
	{ title: "Education", rows: [
		{ label: "School Quality Rating", getValue: (c: CityData) => c.schools?.greatSchoolsRating, format: (v: number | null | undefined) => fmt(v, "", " / 10", 1), higherIsBetter: true },
		{ label: "Graduation Rate", getValue: (c: CityData) => c.schools?.graduationRate, format: (v: number | null | undefined) => fmt(v, "", "%"), higherIsBetter: true },
	]},
	{ title: "Walkability", rows: [
		{ label: "Walk Score", getValue: (c: CityData) => c.walkability?.walkScore, format: (v: number | null | undefined) => fmt(v, "", " / 100"), higherIsBetter: true },
		{ label: "Transit Score", getValue: (c: CityData) => c.walkability?.transitScore, format: (v: number | null | undefined) => fmt(v, "", " / 100"), higherIsBetter: true },
	]},
];

export function CompareReportPdf({ cities, generatedAt }: { cities: CityData[]; generatedAt: string }) {
	const date = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
	const cityNames = cities.map((c) => `${c.name}, ${c.stateId}`).join(" vs ");

	return (
		<Document title={`NextHome USA — ${cityNames}`} author="NextHome USA">
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.brand}>NextHome USA</Text>
					<Text style={styles.title}>City Comparison Report</Text>
					<Text style={styles.subtitle}>{cityNames} · Generated {date}</Text>
				</View>

				<View style={styles.table}>
					<View style={styles.tableHeader}>
						<Text style={styles.metricCol}>Metric</Text>
						{cities.map((c) => (
							<View key={`${c.name}-${c.stateId}`} style={styles.cityCol}>
								<Text style={styles.cityHeader}>{c.name}, {c.stateId}</Text>
								<Text style={styles.citySubheader}>Score: {c.overallScore ?? "—"} · Pop: {c.population?.toLocaleString() ?? "—"}</Text>
							</View>
						))}
					</View>

					{sections.map((section) => (
						<View key={section.title}>
							<View style={{ flexDirection: "row" }}>
								<Text style={[styles.sectionLabel, { flex: 1 }]}>{section.title}</Text>
							</View>
							{section.rows.map((row, rowIdx) => {
								const winIdx = winner(cities, row.getValue, row.higherIsBetter ?? true);
								const RowStyle = rowIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
								return (
									<View key={row.label} style={RowStyle}>
										<Text style={styles.metricCol}>{row.label}</Text>
										{cities.map((c, ci) => {
											const val = row.getValue(c);
											const isWinner = ci === winIdx && val != null;
											return (
												<Text key={`${c.name}-${row.label}`} style={[styles.cityCol, isWinner ? styles.winnerCell : styles.normalCell]}>
													{row.format(val)}
												</Text>
											);
										})}
									</View>
								);
							})}
						</View>
					))}
				</View>

				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>NextHome USA · nexthomeusa.com</Text>
					<Text style={styles.footerText}>Cyan = best value · Data: Census, BLS, NOAA, FBI UCR</Text>
					<Text style={styles.footerText}>{date}</Text>
				</View>
			</Page>
		</Document>
	);
}
