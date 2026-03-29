"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import {
	Heart, Trash2, LogOut, ArrowRight, Sparkles, CreditCard,
	Check, Search, GitCompare, Trophy, MailWarning, X,
} from "lucide-react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { PremiumBadge } from "@/components/shared/PremiumGate";
import { scoreToColor } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedCity {
	id: string; cityId: string; notes: string | null; addedAt: string;
	city: { id: string; slug: string; name: string; stateId: string; overallScore: number | null; heroImageUrl: string | null; thumbnailUrl: string | null; tier: string };
}
interface SavedSearch {
	id: string; name: string | null; filterState: string; resultCount: number | null; lastRunAt: string | null; createdAt: string | null;
}
interface SavedComparison {
	id: string; name: string | null; cityIds: string; createdAt: string | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardContent() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const [billingLoading, setBillingLoading] = useState(false);
	const [verifyDismissed, setVerifyDismissed] = useState(false);

	const justUpgraded = searchParams.get("upgraded") === "1";
	const justVerified = searchParams.get("verified") === "1";
	const isPremium = session?.user?.tier === "premium";

	useEffect(() => {
		if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/dashboard");
	}, [status, router]);

	// ── Queries ──
	const { data: savedCities = [], isLoading: citiesLoading } = useQuery<SavedCity[]>({
		queryKey: ["saved-cities"],
		queryFn: () => fetch("/api/users/me/cities").then((r) => r.ok ? r.json() : []),
		enabled: status === "authenticated",
	});

	const { data: searchData } = useQuery<{ searches: SavedSearch[] }>({
		queryKey: ["saved-searches"],
		queryFn: () => fetch("/api/users/me/searches").then((r) => r.ok ? r.json() : { searches: [] }),
		enabled: status === "authenticated",
	});

	const { data: compareData } = useQuery<{ comparisons: SavedComparison[] }>({
		queryKey: ["saved-comparisons"],
		queryFn: () => fetch("/api/users/me/comparisons").then((r) => r.ok ? r.json() : { comparisons: [] }),
		enabled: status === "authenticated",
	});

	const removeCityMutation = useMutation({
		mutationFn: (cityId: string) => fetch("/api/users/me/cities", {
			method: "DELETE", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cityId }),
		}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-cities"] }),
	});

	const deleteSearchMutation = useMutation({
		mutationFn: (id: string) => fetch("/api/users/me/searches", {
			method: "DELETE", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
	});

	const deleteComparisonMutation = useMutation({
		mutationFn: (id: string) => fetch("/api/users/me/comparisons", {
			method: "DELETE", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-comparisons"] }),
	});

	async function handleManageBilling() {
		setBillingLoading(true);
		try {
			const res = await fetch("/api/stripe/portal", { method: "POST" });
			const data = (await res.json()) as { url?: string };
			if (data.url) window.location.href = data.url;
		} finally {
			setBillingLoading(false);
		}
	}

	function loadSearch(search: SavedSearch) {
		try {
			const state = JSON.parse(search.filterState) as {
				weights?: string; stateIds?: string[]; tiers?: string[]; sortBy?: string;
			};
			const p = new URLSearchParams();
			if (state.weights) p.set("weights", state.weights);
			for (const s of state.stateIds ?? []) p.append("states", s);
			for (const t of state.tiers ?? []) p.append("tiers", t);
			if (state.sortBy) p.set("sort", state.sortBy);
			router.push(`/explore?${p.toString()}`);
		} catch {
			router.push("/explore");
		}
	}

	function loadComparison(comp: SavedComparison) {
		try {
			const ids = JSON.parse(comp.cityIds) as string[];
			router.push(`/compare?preload=${ids.join(",")}`);
		} catch {
			router.push("/compare");
		}
	}

	if (status === "loading" || status === "unauthenticated") {
		return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)", color: "var(--color-muted)" }}>Loading...</div>;
	}

	const savedSearches = searchData?.searches ?? [];
	const savedComparisons = compareData?.comparisons ?? [];
	const sortedCities = [...savedCities].sort((a, b) => (b.city.overallScore ?? 0) - (a.city.overallScore ?? 0));
	const topCity = sortedCities[0];

	const surface: React.CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-border)" };

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			{/* Header */}
			<header className="border-b px-6 py-4 flex items-center justify-between glass" style={{ borderColor: "var(--color-border)" }}>
				<Link href="/" className="font-bold text-lg">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</Link>
				<div className="flex items-center gap-4">
					{isPremium && <PremiumBadge />}
					<span className="text-sm hidden sm:inline" style={{ color: "var(--color-muted)" }}>{session?.user?.email}</span>
					<button type="button" onClick={() => signOut({ callbackUrl: "/" })}
						className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
						style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
						<LogOut size={12} /> Sign out
					</button>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
				{/* Email verify banner */}
				{!verifyDismissed && !(session?.user as any)?.emailVerified && (
					<div className="flex items-center justify-between gap-3 rounded-2xl p-4"
						style={{ background: "oklch(15% 0.05 50)", border: "1px solid oklch(40% 0.1 50)" }}>
						<div className="flex items-center gap-3">
							<MailWarning size={16} style={{ color: "oklch(75% 0.15 60)" }} />
							<p className="text-sm" style={{ color: "oklch(75% 0.15 60)" }}>
								Verify your email to keep full access.{" "}
								<button type="button" className="underline font-medium"
									onClick={() => fetch("/api/auth/forgot-password", {
										method: "POST", headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ email: session?.user?.email }),
									})}>
									Resend verification
								</button>
							</p>
						</div>
						<button type="button" onClick={() => setVerifyDismissed(true)} style={{ color: "var(--color-muted)" }}>
							<X size={14} />
						</button>
					</div>
				)}

				{/* Upgrade success */}
				{justUpgraded && (
					<div className="flex items-center gap-3 rounded-2xl p-4"
						style={{ background: "oklch(16% 0.06 160)", border: "1px solid oklch(45% 0.15 160)" }}>
						<Check size={14} className="text-emerald-400 shrink-0" />
						<div>
							<p className="font-semibold text-sm text-emerald-400">Welcome to Premium!</p>
							<p className="text-xs" style={{ color: "var(--color-muted)" }}>Surprise Me AI, unlimited saves, and PDF reports are now unlocked.</p>
						</div>
					</div>
				)}

				{justVerified && (
					<div className="flex items-center gap-3 rounded-2xl p-4"
						style={{ background: "oklch(16% 0.06 160)", border: "1px solid oklch(45% 0.15 160)" }}>
						<Check size={14} className="text-emerald-400 shrink-0" />
						<p className="font-semibold text-sm text-emerald-400">Email verified! Your account is fully activated.</p>
					</div>
				)}

				{/* Header row */}
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold">My Move Plan</h1>
						<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Your saved cities and research hub</p>
					</div>
					{isPremium ? (
						<button type="button" onClick={handleManageBilling} disabled={billingLoading}
							className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border shrink-0 transition-colors disabled:opacity-60"
							style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
							<CreditCard size={12} />
							{billingLoading ? "Loading…" : "Manage Billing"}
						</button>
					) : (
						<Link href="/upgrade" className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border shrink-0"
							style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>
							<Sparkles size={12} /> Upgrade
						</Link>
					)}
				</div>

				{/* Quick actions */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{[
						{ href: "/explore", icon: "🔍", label: "Browse Cities" },
						{ href: "/quiz", icon: "🤖", label: "Retake Quiz" },
						{ href: "/map", icon: "🗺️", label: "Open Map" },
						{ href: "/surprise", icon: "✦", label: "Surprise Me" },
					].map((a) => (
						<Link key={a.href} href={a.href}
							className="glass rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-[var(--color-accent)] transition-colors">
							<span className="text-2xl">{a.icon}</span>
							<span className="text-xs font-medium">{a.label}</span>
						</Link>
					))}
				</div>

				{/* Move Scorecard */}
				{sortedCities.length > 0 && (
					<div className="glass rounded-2xl p-6 space-y-4">
						<div className="flex items-center gap-2">
							<Trophy size={16} style={{ color: "var(--color-accent)" }} />
							<h2 className="font-bold">Move Scorecard</h2>
							{topCity && (
								<span className="text-xs ml-auto" style={{ color: "var(--color-muted)" }}>
									Top pick: <span style={{ color: "var(--color-accent)" }}>{topCity.city.name}, {topCity.city.stateId}</span>
								</span>
							)}
						</div>
						<div className="space-y-3">
							{sortedCities.slice(0, 5).map((sc, idx) => {
								const score = sc.city.overallScore ?? 50;
								const pct = score;
								return (
									<Link key={sc.id} href={`/city/${sc.city.slug}`}
										className="flex items-center gap-3 group">
										<span className="text-xs w-4 text-right shrink-0" style={{ color: "var(--color-muted)" }}>
											{idx + 1}
										</span>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium truncate group-hover:underline">
													{sc.city.name}, {sc.city.stateId}
												</span>
												<span className={`text-xs font-bold ml-2 shrink-0 ${scoreToColor(score)}`}>{score}</span>
											</div>
											<div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
												<div
													className="h-full rounded-full transition-all"
													style={{
														width: `${pct}%`,
														background: score >= 70 ? "#00d4ff" : score >= 50 ? "#f59e0b" : "#f87171",
													}}
												/>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
						{sortedCities.length > 1 && (
							<Link href="/compare" className="text-xs" style={{ color: "var(--color-muted)" }}>
								Compare all → ⚖️
							</Link>
						)}
					</div>
				)}

				{/* Upgrade nudge */}
				{!isPremium && (
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl p-5"
						style={{ background: "oklch(14% 0.06 220)", border: "1px solid oklch(30% 0.08 220)" }}>
						<div className="flex items-center gap-3">
							<Sparkles size={18} style={{ color: "var(--color-accent)" }} />
							<div>
								<p className="font-semibold text-sm">Unlock Premium — $9/mo</p>
								<p className="text-xs" style={{ color: "var(--color-muted)" }}>Surprise Me AI, unlimited saves, PDF reports</p>
							</div>
						</div>
						<UpgradeButton label="Upgrade →" className="shrink-0 px-4 py-2 text-xs" />
					</div>
				)}

				{/* Saved Cities */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-bold flex items-center gap-2">
							<Heart size={16} style={{ color: "var(--color-accent)" }} />
							Saved Cities
							{savedCities.length > 0 && (
								<span className="text-xs px-2 py-0.5 rounded-full" style={surface}>{savedCities.length}</span>
							)}
						</h2>
						<Link href="/explore" className="flex items-center gap-1 text-xs" style={{ color: "var(--color-accent)" }}>
							Add more <ArrowRight size={12} />
						</Link>
					</div>
					{citiesLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-2xl h-48 animate-pulse" />)}
						</div>
					) : savedCities.length === 0 ? (
						<div className="glass rounded-2xl p-10 text-center">
							<p className="text-3xl mb-3">🏙️</p>
							<p className="font-semibold mb-1">No saved cities yet</p>
							<p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>Browse cities and tap the heart icon to save them here.</p>
							<Link href="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
								style={{ background: "var(--color-accent)", color: "#000" }}>
								Start Exploring
							</Link>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{savedCities.map((sc) => (
								<SavedCityCard key={sc.id} saved={sc} onRemove={() => removeCityMutation.mutate(sc.cityId)} />
							))}
						</div>
					)}
				</div>

				{/* Saved Searches */}
				<div>
					<h2 className="font-bold flex items-center gap-2 mb-4">
						<Search size={16} style={{ color: "var(--color-accent)" }} />
						Saved Searches
						{savedSearches.length > 0 && (
							<span className="text-xs px-2 py-0.5 rounded-full" style={surface}>{savedSearches.length}</span>
						)}
					</h2>
					{savedSearches.length === 0 ? (
						<div className="glass rounded-2xl p-6 text-center">
							<p className="text-sm" style={{ color: "var(--color-muted)" }}>
								No saved searches yet. Use the "Save Search" button on the explore page to bookmark your filters.
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{savedSearches.map((s) => (
								<div key={s.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{s.name || "Unnamed Search"}</p>
										<p className="text-xs" style={{ color: "var(--color-muted)" }}>
											{s.resultCount != null ? `${s.resultCount} results · ` : ""}
											{s.lastRunAt ? new Date(s.lastRunAt).toLocaleDateString() : ""}
										</p>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<button type="button" onClick={() => loadSearch(s)}
											className="text-xs px-3 py-1.5 rounded-lg font-medium"
											style={{ background: "oklch(18% 0.04 220)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }}>
											Load
										</button>
										<button type="button" onClick={() => deleteSearchMutation.mutate(s.id)}
											className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
											style={{ color: "var(--color-muted)" }}>
											<Trash2 size={13} />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Saved Comparisons */}
				<div>
					<h2 className="font-bold flex items-center gap-2 mb-4">
						<GitCompare size={16} style={{ color: "var(--color-accent)" }} />
						Saved Comparisons
						{savedComparisons.length > 0 && (
							<span className="text-xs px-2 py-0.5 rounded-full" style={surface}>{savedComparisons.length}</span>
						)}
					</h2>
					{savedComparisons.length === 0 ? (
						<div className="glass rounded-2xl p-6 text-center">
							<p className="text-sm" style={{ color: "var(--color-muted)" }}>
								No saved comparisons yet. Compare cities and save your comparisons here.
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{savedComparisons.map((c) => {
								let slugs: string[] = [];
								try { slugs = JSON.parse(c.cityIds); } catch {}
								return (
									<div key={c.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">{c.name || "Unnamed Comparison"}</p>
											<p className="text-xs" style={{ color: "var(--color-muted)" }}>
												{slugs.length} cities · {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<button type="button" onClick={() => loadComparison(c)}
												className="text-xs px-3 py-1.5 rounded-lg font-medium"
												style={{ background: "oklch(18% 0.04 220)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }}>
												Load
											</button>
											<button type="button" onClick={() => deleteComparisonMutation.mutate(c.id)}
												className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
												style={{ color: "var(--color-muted)" }}>
												<Trash2 size={13} />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}

export default function DashboardPage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)", color: "var(--color-muted)" }}>Loading…</div>}>
			<DashboardContent />
		</Suspense>
	);
}

function SavedCityCard({ saved, onRemove }: { saved: SavedCity; onRemove: () => void }) {
	const { city } = saved;
	const score = Math.round(city.overallScore ?? 50);
	return (
		<div className="group glass rounded-2xl overflow-hidden flex flex-col">
			<Link href={`/city/${city.slug}`}>
				<div className="h-36 relative flex items-end p-4" style={{
					background: city.heroImageUrl
						? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65)), url(${city.thumbnailUrl ?? city.heroImageUrl}) center/cover no-repeat`
						: "linear-gradient(135deg, oklch(20% 0.05 220), oklch(14% 0.02 200))",
				}}>
					<MatchScoreBadge score={score} size="sm" className="absolute top-3 right-3" />
					<div>
						<p className="font-bold leading-tight">{city.name}</p>
						<p className="text-xs" style={{ color: "oklch(75% 0 0)" }}>{city.stateId}</p>
					</div>
				</div>
			</Link>
			<div className="p-3 flex items-center justify-between gap-2">
				<Link href={`/city/${city.slug}`} className="text-xs" style={{ color: "var(--color-accent)" }}>
					View details →
				</Link>
				<button type="button" onClick={onRemove}
					className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
					style={{ color: "var(--color-muted)" }} title="Remove from saved">
					<Trash2 size={13} />
				</button>
			</div>
		</div>
	);
}
