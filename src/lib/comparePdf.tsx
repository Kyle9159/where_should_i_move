/**
 * Multi-city comparison PDF report.
 * Generates a side-by-side table for up to 4 cities.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
	page: { backgroundColor: "#0f0f0f", color: "#f0f0f0", fontFamily: "Helvetica", padding: 32 },
	header: { marginBottom: 20 },
	brand: { fontSize: 10, color: "#00d4ff", fontFamily: "Helvetica-Bold" },
	title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6 },
	subtitle: { fontSize: 10, color: "#888", marginTop: 3 },
	divider: { height: 1, backgroundColor: "#2a2a2a", marginVertical: 14 },
	// Table
	table: { flexDirection: "column" },
	tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1e1e", paddingVertical: 5 },
	tableRowAlt: { backgroundColor: "#111" },
	labelCell: { width: "22%", fontSize: 9, color: "#888", paddingRight: 4 },
	valueCell: { fontSize: 9, color: "#f0f0f0", fontFamily: "Helvetica-Bold", flex: 1, paddingHorizontal: 4 },
	winnerCell: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#00d4ff", flex: 1, paddingHorizontal: 4 },
	// City header row
	cityHeaderRow: { flexDirection: "row", marginBottom: 10 },
	cityHeaderLabel: { width: "22%" },
	cityHeader: { flex: 1, paddingHorizontal: 4 },
	cityName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#f0f0f0" },
	cityState: { fontSize: 9, color: "#888" },
	scoreChip: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "#00d4ff", borderRadius: 4, alignSelf: "flex-start" },
	scoreChipText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#000" },
	// Section header
	sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#00d4ff", marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
	// Footer
	footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
	footerText: { fontSize: 7, color: "#555" },
});

interface CitySnap {
	name: string;
	stateId: string;
	overallScore: number | null;
	housing: { medianHomePrice?: number | null; medianRent2Bed?: number | null } | null;
	jobs: { unemploymentRate?: number | null; medianHouseholdIncome?: number | null } | null;
	climate: { avgTempJul?: number | null; sunnyDaysPerYear?: number | null; airQualityIndex?: number | null } | null;
	safety: { violentCrimeRate?: number | null; crimeGrade?: string | null } | null;
	schools: { greatSchoolsRating?: number | null; graduationRate?: number | null } | null;
	walkability: { walkScore?: number | null; transitScore?: number | null } | null;
}

function fmt$(n: number | null | undefined): string {
	if (n == null) return "N/A";
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
	return `$${n}`;
}
function fmt(n: number | null | undefined, suffix = ""): string {
	return n == null ? "N/A" : `${n}${suffix}`;
}

// Find the index of the "winner" for a metric (highest or lowest)
function winner(values: (number | null | undefined)[], highIsBetter = true): number {
	const filtered = values.map((v, i) => ({ v: v ?? null, i })).filter((x) => x.v !== null);
	if (filtered.length === 0) return -1;
	filtered.sort((a, b) => highIsBetter ? (b.v! - a.v!) : (a.v! - b.v!));
	return filtered[0].i;
}

interface MetricRow {
	label: string;
	values: (number | null | undefined)[];
	format: (v: number | null | undefined) => string;
	highIsBetter?: boolean;
}

function TableSection({ title, rows, cityCount }: { title: string; rows: MetricRow[]; cityCount: number }) {
	return (
		<View>
			<Text style={styles.sectionTitle}>{title}</Text>
			{rows.map((row, ri) => {
				const w = winner(row.values, row.highIsBetter !== false);
				return (
					<View key={row.label} style={[styles.tableRow, ri % 2 === 0 ? styles.tableRowAlt : {}]}>
						<Text style={styles.labelCell}>{row.label}</Text>
						{Array.from({ length: cityCount }).map((_, ci) => {
							const isWinner = ci === w;
							return (
								<Text key={ci} style={isWinner ? styles.winnerCell : styles.valueCell}>
									{row.format(row.values[ci])}
									{isWinner && cityCount > 1 ? " ✓" : ""}
								</Text>
							);
						})}
					</View>
				);
			})}
		</View>
	);
}

export function CompareReportPdf({ cities, generatedAt }: { cities: CitySnap[]; generatedAt: string }) {
	const n = cities.length;

	return (
		<Document title="City Comparison Report — NextHome USA" author="NextHome USA">
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.brand}>NextHome USA · City Comparison Report</Text>
					<Text style={styles.title}>Comparing {n} Cities</Text>
					<Text style={styles.subtitle}>Generated {new Date(generatedAt).toLocaleDateString()}</Text>
				</View>

				<View style={styles.divider} />

				{/* City headers */}
				<View style={styles.cityHeaderRow}>
					<View style={styles.cityHeaderLabel} />
					{cities.map((c, i) => (
						<View key={i} style={styles.cityHeader}>
							<Text style={styles.cityName}>{c.name}</Text>
							<Text style={styles.cityState}>{c.stateId}</Text>
							{c.overallScore != null && (
								<View style={styles.scoreChip}>
									<Text style={styles.scoreChipText}>{Math.round(c.overallScore)}</Text>
								</View>
							)}
						</View>
					))}
				</View>

				<View style={styles.divider} />

				{/* Housing */}
				<TableSection title="Housing & Cost" cityCount={n} rows={[
					{ label: "Median Home", values: cities.map((c) => c.housing?.medianHomePrice), format: fmt$, highIsBetter: false },
					{ label: "Median Rent", values: cities.map((c) => c.housing?.medianRent2Bed), format: (v) => v ? `${fmt$(v)}/mo` : "N/A", highIsBetter: false },
				]} />

				{/* Jobs */}
				<TableSection title="Jobs & Economy" cityCount={n} rows={[
					{ label: "Median Income", values: cities.map((c) => c.jobs?.medianHouseholdIncome), format: fmt$ },
					{ label: "Unemployment", values: cities.map((c) => c.jobs?.unemploymentRate), format: (v) => fmt(v, "%"), highIsBetter: false },
				]} />

				{/* Climate */}
				<TableSection title="Climate" cityCount={n} rows={[
					{ label: "July Avg Temp", values: cities.map((c) => c.climate?.avgTempJul), format: (v) => fmt(v, "°F") },
					{ label: "Sunny Days", values: cities.map((c) => c.climate?.sunnyDaysPerYear), format: (v) => fmt(v, "/yr") },
					{ label: "Air Quality", values: cities.map((c) => c.climate?.airQualityIndex), format: fmt, highIsBetter: false },
				]} />

				{/* Safety */}
				<TableSection title="Safety" cityCount={n} rows={[
					{ label: "Violent Crime", values: cities.map((c) => c.safety?.violentCrimeRate), format: (v) => fmt(v, "/100k"), highIsBetter: false },
				]} />

				{/* Schools */}
				<TableSection title="Education" cityCount={n} rows={[
					{ label: "GreatSchools", values: cities.map((c) => c.schools?.greatSchoolsRating), format: (v) => fmt(v, "/10") },
					{ label: "Graduation %", values: cities.map((c) => c.schools?.graduationRate), format: (v) => fmt(v, "%") },
				]} />

				{/* Walkability */}
				<TableSection title="Walkability" cityCount={n} rows={[
					{ label: "Walk Score", values: cities.map((c) => c.walkability?.walkScore), format: (v) => fmt(v, "/100") },
					{ label: "Transit Score", values: cities.map((c) => c.walkability?.transitScore), format: (v) => fmt(v, "/100") },
				]} />

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>NextHome USA — nexthomeusa.com</Text>
					<Text style={styles.footerText}>✓ = best in comparison · Data: Census, BLS, NOAA, GreatSchools, FBI UCR</Text>
					<Text style={styles.footerText}>{new Date(generatedAt).toLocaleDateString()}</Text>
				</View>
			</Page>
		</Document>
	);
}
