"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowLeftRight, TrendingUp, TrendingDown, Home, DollarSign, Search, X } from "lucide-react";

type CityResult = {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	stateName: string;
	population: number | null;
	costIndex: number;
	taxBurden: number | null;
	medianRent: number | null;
	medianHomePrice: number | null;
};

// ── City search input ─────────────────────────────────────────────────────────

function CitySearch({
	label,
	value,
	onChange,
	placeholder = "Search cities…",
}: {
	label: string;
	value: CityResult | null;
	onChange: (c: CityResult | null) => void;
	placeholder?: string;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<CityResult[]>([]);
	const [open, setOpen] = useState(false);
	const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (query.length < 2) { setResults([]); return; }
		if (debounce.current) clearTimeout(debounce.current);
		debounce.current = setTimeout(async () => {
			const res = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}`);
			if (res.ok) setResults(await res.json());
		}, 200);
	}, [query]);

	function select(c: CityResult) {
		onChange(c);
		setQuery("");
		setResults([]);
		setOpen(false);
	}

	function clear() {
		onChange(null);
		setQuery("");
	}

	return (
		<div className="flex flex-col gap-2">
			<label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
				{label}
			</label>
			{value ? (
				<div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-accent)" }}>
					<div>
						<p className="font-semibold">{value.name}</p>
						<p className="text-xs" style={{ color: "var(--color-muted)" }}>{value.stateName}</p>
					</div>
					<button type="button" onClick={clear} className="p-1" style={{ color: "var(--color-muted)" }}>
						<X size={14} />
					</button>
				</div>
			) : (
				<div className="relative">
					<div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }}>
						<Search size={14} />
					</div>
					<input
						type="text"
						value={query}
						onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
						onFocus={() => setOpen(true)}
						onBlur={() => setTimeout(() => setOpen(false), 150)}
						placeholder={placeholder}
						className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none bg-transparent"
						style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
					/>
					{open && results.length > 0 && (
						<div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10 shadow-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
							{results.map((c) => (
								<button
									key={c.id}
									type="button"
									onMouseDown={() => select(c)}
									className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between"
								>
									<div>
										<p className="text-sm font-medium">{c.name}</p>
										<p className="text-xs" style={{ color: "var(--color-muted)" }}>{c.stateName}</p>
									</div>
									{c.population && (
										<span className="text-xs shrink-0 ml-2" style={{ color: "var(--color-muted)" }}>
											{Math.round(c.population / 1000)}k
										</span>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtCompact(n: number) {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
	return `$${Math.round(n)}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CostOfLivingPage() {
	const [fromCity, setFromCity] = useState<CityResult | null>(null);
	const [toCity, setToCity] = useState<CityResult | null>(null);
	const [salary, setSalary] = useState<string>("80000");

	const salaryNum = parseFloat(salary.replace(/,/g, "")) || 0;
	const ready = fromCity && toCity && salaryNum > 0;

	// Cost calculation
	const fromIdx = fromCity?.costIndex ?? 100;
	const toIdx = toCity?.costIndex ?? 100;
	const ratio = toIdx / fromIdx;
	const equivalentSalary = salaryNum * ratio;
	const diff = equivalentSalary - salaryNum;
	const pctChange = ((ratio - 1) * 100);
	const moreExpensive = ratio > 1;

	function swap() {
		const tmp = fromCity;
		setFromCity(toCity);
		setToCity(tmp);
	}

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			{/* Header */}
			<div className="sticky top-0 z-30 glass border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "var(--color-border)" }}>
				<Link href="/" className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
					<ArrowLeft size={16} /> Home
				</Link>
				<h1 className="font-bold">Cost of Living Calculator</h1>
			</div>

			<div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
				{/* Intro */}
				<div>
					<h2 className="text-2xl font-black mb-2">How far does your salary go?</h2>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>
						Compare purchasing power across US cities. Based on state-level cost-of-living indexes from the Council for Community and Economic Research.
					</p>
				</div>

				{/* Input card */}
				<div className="glass rounded-2xl p-6 space-y-6">
					{/* City pickers */}
					<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
						<CitySearch label="I currently live in" value={fromCity} onChange={setFromCity} placeholder="Current city…" />
						<button
							type="button"
							onClick={swap}
							className="p-2 rounded-xl self-center sm:self-end mb-0.5 transition-colors hover:bg-white/5"
							style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
							title="Swap cities"
							aria-label="Swap cities"
						>
							<ArrowLeftRight size={16} />
						</button>
						<CitySearch label="I want to move to" value={toCity} onChange={setToCity} placeholder="Target city…" />
					</div>

					{/* Salary */}
					<div className="flex flex-col gap-2">
						<label htmlFor="salary-input" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
							Current annual salary
						</label>
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--color-muted)" }}>$</span>
							<input
								id="salary-input"
								type="text"
								inputMode="numeric"
								value={salary}
								onChange={(e) => setSalary(e.target.value.replace(/[^\d,]/g, ""))}
								className="w-full pl-8 pr-4 py-3 rounded-xl text-sm outline-none"
								style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
								placeholder="80,000"
							/>
						</div>
					</div>
				</div>

				{/* Results */}
				{ready && (
					<div className="space-y-4">
						{/* Main result */}
						<div className="glass rounded-2xl p-6">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
								<div>
									<p className="text-sm mb-1" style={{ color: "var(--color-muted)" }}>To maintain your lifestyle in</p>
									<p className="text-lg font-bold">{toCity!.name}, {toCity!.stateId}</p>
								</div>
								<div className="flex items-center gap-2">
									{moreExpensive ? <TrendingUp size={18} style={{ color: "#f87171" }} /> : <TrendingDown size={18} style={{ color: "#4ade80" }} />}
									<span className="text-xl font-black" style={{ color: moreExpensive ? "#f87171" : "#4ade80" }}>
										{pctChange > 0 ? "+" : ""}{Math.round(pctChange)}%
									</span>
									<span className="text-sm" style={{ color: "var(--color-muted)" }}>cost of living</span>
								</div>
							</div>

							{/* Salary comparison */}
							<div className="grid grid-cols-2 gap-4">
								<div className="rounded-xl p-4" style={{ background: "var(--color-surface)" }}>
									<p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Your salary in {fromCity!.name}</p>
									<p className="text-2xl font-black">{fmt(salaryNum)}</p>
									<p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>CoL index: {fromIdx}</p>
								</div>
								<div className="rounded-xl p-4" style={{ background: moreExpensive ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${moreExpensive ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}` }}>
									<p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Equivalent salary in {toCity!.name}</p>
									<p className="text-2xl font-black" style={{ color: moreExpensive ? "#f87171" : "#4ade80" }}>{fmt(equivalentSalary)}</p>
									<p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>CoL index: {toIdx}</p>
								</div>
							</div>

							{/* Takeaway */}
							<div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--color-surface)" }}>
								<DollarSign size={14} className="inline mr-1" style={{ color: "var(--color-accent)" }} />
								{moreExpensive ? (
									<>You&apos;d need <strong style={{ color: "#f87171" }}>+{fmt(diff)}/yr</strong> more to maintain the same lifestyle in {toCity!.name}.</>
								) : (
									<>You could earn <strong style={{ color: "#4ade80" }}>{fmt(Math.abs(diff))}/yr</strong> less and still live the same lifestyle in {toCity!.name}.</>
								)}
							</div>
						</div>

						{/* Housing comparison */}
						{(fromCity!.medianRent || toCity!.medianRent || fromCity!.medianHomePrice || toCity!.medianHomePrice) && (
							<div className="glass rounded-2xl p-6">
								<h3 className="font-bold mb-4 flex items-center gap-2">
									<Home size={16} style={{ color: "var(--color-accent)" }} />
									Housing Snapshot
								</h3>
								<div className="grid grid-cols-2 gap-4">
									{/* From city */}
									<div className="space-y-3">
										<p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>{fromCity!.name}</p>
										{fromCity!.medianRent && (
											<div>
												<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median 2BR rent</p>
												<p className="font-bold">{fmt(fromCity!.medianRent)}<span className="text-xs font-normal">/mo</span></p>
											</div>
										)}
										{fromCity!.medianHomePrice && (
											<div>
												<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median home price</p>
												<p className="font-bold">{fmtCompact(fromCity!.medianHomePrice)}</p>
											</div>
										)}
									</div>
									{/* To city */}
									<div className="space-y-3">
										<p className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>{toCity!.name}</p>
										{toCity!.medianRent && (
											<div>
												<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median 2BR rent</p>
												<p className="font-bold">
													{fmt(toCity!.medianRent)}<span className="text-xs font-normal">/mo</span>
													{fromCity!.medianRent && (
														<span className="ml-2 text-xs" style={{ color: toCity!.medianRent > fromCity!.medianRent ? "#f87171" : "#4ade80" }}>
															({toCity!.medianRent > fromCity!.medianRent ? "+" : ""}{Math.round((toCity!.medianRent / fromCity!.medianRent - 1) * 100)}%)
														</span>
													)}
												</p>
											</div>
										)}
										{toCity!.medianHomePrice && (
											<div>
												<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median home price</p>
												<p className="font-bold">
													{fmtCompact(toCity!.medianHomePrice)}
													{fromCity!.medianHomePrice && (
														<span className="ml-2 text-xs" style={{ color: toCity!.medianHomePrice > fromCity!.medianHomePrice ? "#f87171" : "#4ade80" }}>
															({toCity!.medianHomePrice > fromCity!.medianHomePrice ? "+" : ""}{Math.round((toCity!.medianHomePrice / fromCity!.medianHomePrice - 1) * 100)}%)
														</span>
													)}
												</p>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{/* CTA */}
						<div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
							<p className="text-sm" style={{ color: "var(--color-muted)" }}>
								Want a full data breakdown for {toCity!.name}?
							</p>
							<Link
								href={`/city/${toCity!.slug}`}
								className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl shrink-0"
								style={{ background: "var(--color-accent)", color: "#000" }}
							>
								Full city profile <ArrowRight size={14} />
							</Link>
						</div>
					</div>
				)}

				{/* Empty state */}
				{!ready && (
					<div className="text-center py-12 rounded-2xl glass">
						<div className="text-4xl mb-3">🏙️</div>
						<p className="text-sm" style={{ color: "var(--color-muted)" }}>
							Select both cities and enter your salary to see the comparison.
						</p>
					</div>
				)}
			</div>
		</main>
	);
}
