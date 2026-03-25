"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SlidersHorizontal, X, ChevronRight, Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { decodeWeights, encodeWeights, type FilterWeights } from "@/lib/ranking";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { CompareBar, CompareButton } from "@/components/shared/CompareBar";
import { US_STATES, CITY_TIERS } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CityResult {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	tier: string;
	population: number;
	matchPct: number;
	overallScore: number;
	categoryScores: { essentials: number; lifestyle: number; practical: number; family: number; nature: number };
	heroImageUrl: string | null;
}

interface CitiesResponse {
	cities: CityResult[];
	total: number;
	page: number;
	totalPages: number;
}

// ── Explore page (wrapped for Suspense) ───────────────────────────────────────

export default function ExplorePage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ color: "var(--color-muted)" }}>Loading...</div>}>
			<ExploreInner />
		</Suspense>
	);
}

function ExploreInner() {
	const searchParams = useSearchParams();
	const router = useRouter();

	// Initialize all filter state from URL params
	const initialWeights = searchParams.get("weights") ? decodeWeights(searchParams.get("weights")!) : {};
	const initialStates = searchParams.getAll("states");
	const initialTiers = searchParams.getAll("tiers");
	const initialSort = (searchParams.get("sort") ?? "match") as "match" | "population" | "name";

	const [weights, setWeights] = useState<FilterWeights>(initialWeights);
	const [selectedStates, setSelectedStates] = useState<string[]>(initialStates);
	const [selectedTiers, setSelectedTiers] = useState<string[]>(initialTiers);
	const [sortBy, setSortBy] = useState<"match" | "population" | "name">(initialSort);
	const [page, setPage] = useState(1);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [shareCopied, setShareCopied] = useState(false);

	// Sync filter state → URL (replaceState so back button works)
	useEffect(() => {
		const p = new URLSearchParams();
		for (const s of selectedStates) p.append("states", s);
		for (const t of selectedTiers) p.append("tiers", t);
		if (Object.keys(weights).length > 0) p.set("weights", encodeWeights(weights));
		if (sortBy !== "match") p.set("sort", sortBy);
		const qs = p.toString();
		const url = qs ? `/explore?${qs}` : "/explore";
		window.history.replaceState(null, "", url);
	}, [selectedStates, selectedTiers, weights, sortBy]);

	function handleShare() {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(() => {
			setShareCopied(true);
			setTimeout(() => setShareCopied(false), 2000);
		});
	}

	const buildQueryParams = useCallback(() => {
		const params = new URLSearchParams();
		for (const state of selectedStates) params.append("stateIds", state);
		for (const tier of selectedTiers) params.append("tier", tier);
		if (Object.keys(weights).length > 0) params.set("weights", encodeWeights(weights));
		params.set("sort", sortBy);
		params.set("page", String(page));
		params.set("pageSize", "20");
		return params.toString();
	}, [selectedStates, selectedTiers, weights, sortBy, page]);

	const { data, isLoading } = useQuery<CitiesResponse>({
		queryKey: ["cities", selectedStates, selectedTiers, weights, sortBy, page],
		queryFn: async () => {
			const res = await fetch(`/api/cities?${buildQueryParams()}`);
			if (!res.ok) throw new Error("Failed to fetch cities");
			return res.json() as Promise<CitiesResponse>;
		},
	});

	return (
		<div className="flex min-h-screen" style={{ background: "var(--color-background)" }}>
			{/* ── Sidebar ─────────────────────────────────────── */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-40 w-72 glass border-r flex flex-col transition-transform lg:translate-x-0 lg:static lg:flex",
					sidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
				style={{ borderColor: "var(--color-border)" }}
			>
				<div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
					<Link href="/" className="font-bold text-sm">
						<span style={{ color: "var(--color-accent)" }}>Next</span>Home USA
					</Link>
					<div className="flex items-center gap-2">
						<Link href="/surprise" className="text-xs" style={{ color: "var(--color-muted)" }}>✦ Surprise</Link>
						<Link href="/compare" className="text-xs" style={{ color: "var(--color-muted)" }}>⚖️ Compare</Link>
					</div>
					<button
						type="button"
						onClick={() => setSidebarOpen(false)}
						className="lg:hidden"
						style={{ color: "var(--color-muted)" }}
					>
						<X size={16} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-6">
					{/* States */}
					<div>
						<h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-muted)" }}>
							States
						</h3>
						<div className="grid grid-cols-4 gap-1">
							{US_STATES.map((s) => {
								const sel = selectedStates.includes(s.id);
								return (
									<button
										key={s.id}
										type="button"
										onClick={() =>
											setSelectedStates((prev) =>
												sel ? prev.filter((x) => x !== s.id) : [...prev, s.id],
											)
										}
										className={cn(
											"text-xs py-1 rounded font-mono transition-colors",
											sel
												? "text-black font-bold"
												: "hover:bg-[var(--color-surface-2)]",
										)}
										style={sel ? { background: "var(--color-accent)", color: "#000" } : { color: "var(--color-muted)" }}
									>
										{s.id}
									</button>
								);
							})}
						</div>
						{selectedStates.length > 0 && (
							<button
								type="button"
								onClick={() => setSelectedStates([])}
								className="mt-2 text-xs"
								style={{ color: "var(--color-muted)" }}
							>
								Clear all
							</button>
						)}
					</div>

					{/* City size */}
					<div>
						<h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-muted)" }}>
							City Size
						</h3>
						<div className="space-y-1.5">
							{Object.entries(CITY_TIERS).map(([id, label]) => {
								const sel = selectedTiers.includes(id);
								return (
									<button
										key={id}
										type="button"
										onClick={() =>
											setSelectedTiers((prev) =>
												sel ? prev.filter((x) => x !== id) : [...prev, id],
											)
										}
										className={cn(
											"w-full text-left text-xs py-2 px-3 rounded-lg transition-colors",
											sel
												? "bg-[oklch(18%_0.04_220)]"
												: "hover:bg-[var(--color-surface)]",
										)}
										style={sel ? { border: "1px solid var(--color-accent)", color: "var(--color-foreground)" } : { color: "var(--color-muted)" }}
									>
										{label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Key weight sliders */}
					<div>
						<h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-muted)" }}>
							What matters most?
						</h3>
						<div className="space-y-4">
							{KEY_FILTERS.map((f) => (
								<WeightSlider
									key={f.key}
									label={f.label}
									icon={f.icon}
									value={((weights[f.key as keyof FilterWeights] ?? 0) * 100)}
									onChange={(v) =>
										setWeights((prev) => ({
											...prev,
											[f.key]: v / 100,
										}))
									}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Take quiz CTA */}
				<div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
					<Link
						href="/quiz"
						className="flex items-center justify-between w-full text-xs px-3 py-2.5 rounded-xl transition-all"
						style={{ background: "oklch(18% 0.04 220)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }}
					>
						<span>🤖 Take AI Quiz for better results</span>
						<ChevronRight size={14} />
					</Link>
				</div>
			</aside>

			{/* ── Main content ────────────────────────────────── */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<header className="sticky top-0 z-30 glass border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "var(--color-border)" }}>
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="lg:hidden flex items-center gap-2 text-sm"
						style={{ color: "var(--color-muted)" }}
					>
						<SlidersHorizontal size={16} /> Filters
					</button>

					<div className="flex-1 flex items-center gap-2 flex-wrap">
						{selectedStates.length > 0 && (
							<div className="flex items-center gap-1 flex-wrap">
								{selectedStates.map((s) => (
									<span
										key={s}
										className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
										style={{ background: "var(--color-surface-2)", color: "var(--color-foreground)" }}
									>
										{s}
										<button type="button" onClick={() => setSelectedStates((p) => p.filter((x) => x !== s))}>
											<X size={10} />
										</button>
									</span>
								))}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 ml-auto">
						<span className="text-xs hidden sm:block" style={{ color: "var(--color-muted)" }}>
							{data?.total ?? "…"} cities
						</span>
						<button
							type="button"
							onClick={handleShare}
							className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
							style={{ borderColor: "var(--color-border)", color: shareCopied ? "var(--color-accent)" : "var(--color-muted)" }}
							title="Copy shareable link"
						>
							{shareCopied ? <Check size={12} /> : <Share2 size={12} />}
							<span className="hidden sm:inline">{shareCopied ? "Copied!" : "Share"}</span>
						</button>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
							className="text-xs px-3 py-1.5 rounded-lg border appearance-none cursor-pointer"
							style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
						>
							<option value="match">Best Match</option>
							<option value="population">Population</option>
							<option value="name">Name A–Z</option>
						</select>
					</div>
				</header>

				{/* Grid */}
				<div className="flex-1 p-6">
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{Array.from({ length: 12 }).map((_, i) => (
								<div key={i} className="glass rounded-2xl h-72 animate-pulse" />
							))}
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
								{data?.cities.map((city) => (
									<CityCard key={city.id} city={city} />
								))}
							</div>

							{/* Pagination */}
							{(data?.totalPages ?? 1) > 1 && (
								<div className="flex items-center justify-center gap-3 mt-8">
									<button
										type="button"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
										className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30"
										style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
									>
										Previous
									</button>
									<span className="text-sm" style={{ color: "var(--color-muted)" }}>
										{page} / {data?.totalPages}
									</span>
									<button
										type="button"
										onClick={() => setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))}
										disabled={page >= (data?.totalPages ?? 1)}
										className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30"
										style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
									>
										Next
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Compare bar */}
			<CompareBar />
		</div>
	);
}

// ── City Card ─────────────────────────────────────────────────────────────────

function CityCard({ city }: { city: CityResult }) {
	return (
		<div className="group glass rounded-2xl overflow-hidden flex flex-col hover:border-[var(--color-accent)] transition-colors">
			{/* Image area */}
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
							{city.stateId} · {CITY_TIERS[city.tier as keyof typeof CITY_TIERS]?.split(" ")[0] ?? city.tier}
						</p>
					</div>
				</div>
			</Link>

			{/* Stats + compare */}
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
	);
}

// ── Weight Slider ─────────────────────────────────────────────────────────────

function WeightSlider({
	label,
	icon,
	value,
	onChange,
}: {
	label: string;
	icon: string;
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span className="text-xs flex items-center gap-1.5">
					<span>{icon}</span>
					<span style={{ color: "var(--color-foreground)" }}>{label}</span>
				</span>
				<span className="text-xs font-mono" style={{ color: "var(--color-accent)" }}>
					{Math.round(value)}%
				</span>
			</div>
			<input
				type="range"
				min={0}
				max={30}
				step={1}
				value={Math.min(30, value)}
				onChange={(e) => onChange(parseInt(e.target.value, 10))}
				className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
				style={{
					background: `linear-gradient(to right, var(--color-accent) ${(Math.min(30, value) / 30) * 100}%, var(--color-border) ${(Math.min(30, value) / 30) * 100}%)`,
				}}
			/>
		</div>
	);
}

// ── Key filters list ──────────────────────────────────────────────────────────

const KEY_FILTERS = [
	{ key: "scoreMedianHomePrice", label: "Affordability", icon: "💰" },
	{ key: "scoreJobMarket", label: "Job Market", icon: "💼" },
	{ key: "scoreViolentCrime", label: "Safety", icon: "🛡️" },
	{ key: "scoreSchoolQuality", label: "Schools", icon: "🎓" },
	{ key: "scoreWeather", label: "Climate", icon: "☀️" },
	{ key: "scoreWalkability", label: "Walkability", icon: "🚶" },
	{ key: "scoreNearOcean", label: "Near Ocean", icon: "🌊" },
	{ key: "scoreNearMountains", label: "Near Mountains", icon: "⛰️" },
] as const;
