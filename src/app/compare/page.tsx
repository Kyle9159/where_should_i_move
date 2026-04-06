"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Trophy, Download, Lock, Bookmark, Check } from "lucide-react";
import { useComparison } from "@/hooks/useComparison";
import { formatCurrency, formatPct, scoreToColor } from "@/lib/utils";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CityDetail {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	tier: string;
	population: number | null;
	overallScore: number | null;
	heroImageUrl: string | null;
	housing: { medianHomePrice: number | null; medianRent2Bed: number | null; affordabilityIndex: number | null } | null;
	jobs: { unemploymentRate: number | null; medianHouseholdIncome: number | null; jobGrowthRate: number | null } | null;
	climate: { avgTempJan: number | null; avgTempJul: number | null; sunnyDaysPerYear: number | null; airQualityIndex: number | null } | null;
	safety: { violentCrimeRate: number | null; propertyCrimeRate: number | null } | null;
	schools: { greatSchoolsRating: number | null; graduationRate: number | null } | null;
	walkability: { walkScore: number | null; transitScore: number | null; bikeScore: number | null } | null;
	lifestyle: { nearOcean: boolean | null; nearMountains: boolean | null; lgbtqFriendlyScore: number | null } | null;
	filterScores: Record<string, number | null> | null;
}

// ── Comparison rows definition ─────────────────────────────────────────────────

type ExtractFn = (c: CityDetail) => string | number | null;

const SECTIONS: Array<{
	title: string;
	rows: Array<{ label: string; extract: ExtractFn; higherIsBetter?: boolean; format?: (v: number) => string }>;
}> = [
	{
		title: "💰 Housing & Cost",
		rows: [
			{ label: "Median Home Price", extract: (c) => c.housing?.medianHomePrice ?? null, higherIsBetter: false, format: (v) => formatCurrency(v, { compact: true }) },
			{ label: "Median 2BR Rent", extract: (c) => c.housing?.medianRent2Bed ?? null, higherIsBetter: false, format: (v) => formatCurrency(v, { compact: true }) },
			{ label: "Affordability Index", extract: (c) => c.housing?.affordabilityIndex ? Math.round(c.housing.affordabilityIndex * 100) / 100 : null, higherIsBetter: true },
		],
	},
	{
		title: "💼 Jobs & Economy",
		rows: [
			{ label: "Median Household Income", extract: (c) => c.jobs?.medianHouseholdIncome ?? null, higherIsBetter: true, format: (v) => formatCurrency(v, { compact: true }) },
			{ label: "Unemployment Rate", extract: (c) => c.jobs?.unemploymentRate ?? null, higherIsBetter: false, format: (v) => `${v}%` },
			{ label: "Job Growth Rate", extract: (c) => c.jobs?.jobGrowthRate ?? null, higherIsBetter: true, format: (v) => `${v}%` },
		],
	},
	{
		title: "☀️ Climate",
		rows: [
			{ label: "Sunny Days / Year", extract: (c) => c.climate?.sunnyDaysPerYear ?? null, higherIsBetter: true },
			{ label: "Avg Jan Temp", extract: (c) => c.climate?.avgTempJan ?? null, format: (v) => `${v}°F` },
			{ label: "Avg Jul Temp", extract: (c) => c.climate?.avgTempJul ?? null, format: (v) => `${v}°F` },
			{ label: "Air Quality Index", extract: (c) => c.climate?.airQualityIndex ?? null, higherIsBetter: false },
		],
	},
	{
		title: "🛡️ Safety",
		rows: [
			{ label: "Violent Crime Rate", extract: (c) => c.safety?.violentCrimeRate ?? null, higherIsBetter: false, format: (v) => `${Math.round(v)} /100k` },
			{ label: "Property Crime Rate", extract: (c) => c.safety?.propertyCrimeRate ?? null, higherIsBetter: false, format: (v) => `${Math.round(v)} /100k` },
		],
	},
	{
		title: "🎓 Education",
		rows: [
			{ label: "GreatSchools Rating", extract: (c) => c.schools?.greatSchoolsRating ?? null, higherIsBetter: true, format: (v) => `${v} / 10` },
			{ label: "Graduation Rate", extract: (c) => c.schools?.graduationRate ?? null, higherIsBetter: true, format: (v) => `${v}%` },
		],
	},
	{
		title: "🚶 Walkability",
		rows: [
			{ label: "Walk Score", extract: (c) => c.walkability?.walkScore ?? null, higherIsBetter: true },
			{ label: "Transit Score", extract: (c) => c.walkability?.transitScore ?? null, higherIsBetter: true },
			{ label: "Bike Score", extract: (c) => c.walkability?.bikeScore ?? null, higherIsBetter: true },
		],
	},
	{
		title: "🌿 Nature & Lifestyle",
		rows: [
			{ label: "Near Ocean", extract: (c) => c.lifestyle?.nearOcean ? "Yes" : "No" },
			{ label: "Near Mountains", extract: (c) => c.lifestyle?.nearMountains ? "Yes" : "No" },
			{ label: "LGBTQ+ Score", extract: (c) => c.lifestyle?.lgbtqFriendlyScore ?? null, higherIsBetter: true },
		],
	},
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ComparePage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ color: "var(--color-muted)" }}>Loading...</div>}>
			<CompareInner />
		</Suspense>
	);
}

function CompareInner() {
	const { cities: compareList, add: addToCompare } = useComparison();
	const searchParams = useSearchParams();
	const [cityData, setCityData] = useState<CityDetail[]>([]);
	const [loading, setLoading] = useState(false);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [saved, setSaved] = useState(false);
	const { data: session } = useSession();
	const isPremium = session?.user?.tier === "premium";
	const router = useRouter();

	// Handle ?preload=slug1,slug2,slug3 from saved comparisons
	useEffect(() => {
		const preload = searchParams.get("preload");
		if (preload) {
			const slugs = preload.split(",").filter(Boolean).slice(0, 4);
			// We need to fetch the city IDs for each slug to add to comparison store
			fetch("/api/cities/compare", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ cityIds: slugs }),
			}).then((r) => r.json()).then((d: { cities: CityDetail[] }) => {
				for (const c of d.cities ?? []) {
					addToCompare({ id: c.id, slug: c.slug, name: c.name, stateId: c.stateId });
				}
			}).catch(() => {});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function saveComparison() {
		if (!session?.user) { router.push("/auth/signin"); return; }
		await fetch("/api/users/me/comparisons", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cityIds: cityData.map((c) => c.id) }),
		});
		setSaved(true);
		setTimeout(() => setSaved(false), 2500);
	}

	async function downloadCompareReport() {
		if (!isPremium) { router.push("/upgrade"); return; }
		setPdfLoading(true);
		try {
			const res = await fetch("/api/export/compare-report", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slugs: cityData.map((c) => c.slug) }),
			});
			if (!res.ok) return;
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `nexthome-comparison.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setPdfLoading(false);
		}
	}

	useEffect(() => {
		if (compareList.length < 2) return;
		setLoading(true);

		fetch("/api/cities/compare", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cityIds: compareList.map((c) => c.slug) }),
		})
			.then((r) => r.json())
			.then((d: { cities: CityDetail[] }) => {
				setCityData(d.cities ?? []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [compareList]);

	if (compareList.length < 2) {
		return (
			<main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: "var(--color-background)" }}>
				<div className="text-5xl">⚖️</div>
				<h1 className="text-2xl font-bold">Nothing to compare yet</h1>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					Add at least 2 cities from the Explore page to compare them side-by-side.
				</p>
				<Link
					href="/explore"
					className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
					style={{ background: "var(--color-accent)", color: "#000" }}
				>
					Browse Cities
				</Link>
			</main>
		);
	}

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			{/* Header */}
			<div className="sticky top-0 z-30 glass border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "var(--color-border)" }}>
				<Link href="/explore" className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
					<ArrowLeft size={16} /> Explore
				</Link>
				<h1 className="font-bold">City Comparison</h1>
				<div className="ml-auto flex items-center gap-2">
					{session?.user && cityData.length >= 2 && (
						<button
							type="button"
							onClick={saveComparison}
							className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
							style={{ borderColor: "var(--color-border)", color: saved ? "#4ade80" : "var(--color-muted)" }}
						>
							{saved ? <Check size={12} /> : <Bookmark size={12} />}
							{saved ? "Saved!" : "Save"}
						</button>
					)}
					<button
						type="button"
						onClick={downloadCompareReport}
						disabled={pdfLoading || cityData.length < 2}
						className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40"
						style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
						title={isPremium ? "Download comparison PDF" : "Premium feature"}
					>
						{isPremium ? <Download size={12} /> : <Lock size={12} />}
						{pdfLoading ? "Generating…" : "PDF Report"}
					</button>
				</div>
			</div>

			<div className="max-w-6xl mx-auto px-4 py-8 overflow-x-auto">
				{loading ? (
					<div className="flex items-center justify-center py-20" style={{ color: "var(--color-muted)" }}>
						Loading comparison...
					</div>
				) : cityData.length >= 2 ? (
					<>
						<WinnerSummary cities={cityData} />
						<CompareTable cities={cityData} />
					</>
				) : null}
			</div>
		</main>
	);
}

// ── Winner Summary ─────────────────────────────────────────────────────────────

function WinnerSummary({ cities }: { cities: CityDetail[] }) {
	// Count how many rows each city wins across all sections
	const wins: number[] = cities.map(() => 0);
	const winLabels: string[][] = cities.map(() => []);

	for (const section of SECTIONS) {
		for (const row of section.rows) {
			if (row.higherIsBetter === undefined) continue;
			const values = cities.map((c) => {
				const v = row.extract(c);
				return typeof v === "number" ? v : null;
			});
			const nums = values.filter((v): v is number => v !== null);
			if (nums.length < 2) continue;
			const best = row.higherIsBetter ? Math.max(...nums) : Math.min(...nums);
			const idx = values.indexOf(best);
			if (idx >= 0) {
				wins[idx]++;
				winLabels[idx].push(row.label);
			}
		}
	}

	const totalRows = wins.reduce((a, b) => a + b, 0);
	const topIdx = wins.indexOf(Math.max(...wins));

	return (
		<div className="glass rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
			<div className="flex items-center gap-2 shrink-0">
				<Trophy size={18} style={{ color: "#facc15" }} />
				<span className="font-bold text-sm">Category Wins</span>
			</div>
			<div className="flex flex-wrap gap-3 flex-1">
				{cities.map((city, i) => (
					<div
						key={city.id}
						className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
						style={{
							background: i === topIdx ? "rgba(250,204,21,0.1)" : "var(--color-surface)",
							border: `1px solid ${i === topIdx ? "#facc15" : "var(--color-border)"}`,
						}}
					>
						{i === topIdx && <span>🏆</span>}
						<span className="font-semibold">{city.name}</span>
						<span style={{ color: "var(--color-muted)" }}>
							{wins[i]} / {totalRows}
						</span>
					</div>
				))}
			</div>
			{winLabels[topIdx]?.length > 0 && (
				<p className="text-xs w-full sm:w-auto shrink-0 max-w-xs" style={{ color: "var(--color-muted)" }}>
					<span className="font-medium" style={{ color: "var(--color-text)" }}>{cities[topIdx]?.name}</span>
					{" leads in: "}
					{winLabels[topIdx].slice(0, 4).join(", ")}
					{winLabels[topIdx].length > 4 && ` +${winLabels[topIdx].length - 4} more`}
				</p>
			)}
		</div>
	);
}

// ── Compare table ──────────────────────────────────────────────────────────────

function CompareTable({ cities }: { cities: CityDetail[] }) {
	const { remove } = useComparison();
	const router = useRouter();

	// Determine which city has the best value for a given row
	function getBestIdx(row: typeof SECTIONS[0]["rows"][0]): number | null {
		if (row.higherIsBetter === undefined) return null;
		const values = cities.map((c) => {
			const v = row.extract(c);
			return typeof v === "number" ? v : null;
		});
		const nums = values.filter((v): v is number => v !== null);
		if (nums.length < 2) return null;
		const best = row.higherIsBetter ? Math.max(...nums) : Math.min(...nums);
		return values.indexOf(best);
	}

	return (
		<table className="w-full border-collapse" style={{ minWidth: `${200 + cities.length * 220}px` }}>
			{/* City header row */}
			<thead>
				<tr>
					<th className="w-44 pb-4 text-left text-xs font-normal" style={{ color: "var(--color-muted)" }}>
						Metric
					</th>
					{cities.map((city) => (
						<th key={city.id} className="pb-4 px-3">
							<div className="glass rounded-2xl overflow-hidden">
								{/* Photo / hero */}
								<div
									className="h-28 relative flex items-end p-3"
									style={{
										background: city.heroImageUrl
											? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7)), url(${city.heroImageUrl}) center/cover`
											: "linear-gradient(135deg, oklch(20% 0.05 220), oklch(14% 0.02 200))",
									}}
								>
									<MatchScoreBadge score={Math.round(city.overallScore ?? 50)} size="sm" className="absolute top-2 right-2" />
									<div>
										<p className="text-sm font-bold leading-tight">{city.name}</p>
										<p className="text-xs" style={{ color: "oklch(75% 0 0)" }}>{city.stateId}</p>
									</div>
									<button
										type="button"
										onClick={() => {
											remove(city.id);
											// Force page refresh if only 1 city left
											if (cities.length <= 2) router.push("/explore");
										}}
										className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
										style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
									>
										<X size={10} />
									</button>
								</div>
								<div className="p-2 text-center">
									<Link
										href={`/city/${city.slug}`}
										className="text-xs"
										style={{ color: "var(--color-accent)" }}
									>
										Full profile →
									</Link>
								</div>
							</div>
						</th>
					))}
				</tr>
			</thead>

			{/* Data rows */}
			<tbody>
				{SECTIONS.map((section) => (
					<>
						{/* Section header */}
						<tr key={section.title}>
							<td colSpan={cities.length + 1} className="py-3 pt-6">
								<span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
									{section.title}
								</span>
							</td>
						</tr>

						{section.rows.map((row, rowIdx) => {
							const bestIdx = getBestIdx(row);
							return (
								<tr
									key={`${section.title}-${rowIdx}`}
									className="border-t"
									style={{ borderColor: "var(--color-border)" }}
								>
									<td className="py-3 pr-4 text-xs" style={{ color: "var(--color-muted)" }}>
										{row.label}
									</td>
									{cities.map((city, cityIdx) => {
										const raw = row.extract(city);
										const display = typeof raw === "number" && row.format
											? row.format(raw)
											: raw !== null ? String(raw) : "—";
										const isWinner = bestIdx === cityIdx && raw !== null;

										return (
											<td key={city.id} className="py-3 px-3 text-center">
												<span
													className="text-sm font-medium px-2 py-1 rounded-lg"
													style={
														isWinner
															? { background: "oklch(18% 0.06 205)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }
															: { color: "var(--color-foreground)" }
													}
												>
													{isWinner && <Trophy size={10} className="inline mr-1" />}
													{display}
												</span>
											</td>
										);
									})}
								</tr>
							);
						})}
					</>
				))}
			</tbody>
		</table>
	);
}
