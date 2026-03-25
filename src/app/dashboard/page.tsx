"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { Heart, Trash2, LogOut, ArrowRight, Sparkles, CreditCard, Check } from "lucide-react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { PremiumBadge } from "@/components/shared/PremiumGate";

interface SavedCity {
	id: string;
	cityId: string;
	notes: string | null;
	addedAt: string;
	city: {
		id: string;
		slug: string;
		name: string;
		stateId: string;
		overallScore: number | null;
		heroImageUrl: string | null;
		thumbnailUrl: string | null;
		tier: string;
	};
}

function DashboardContent() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const [billingLoading, setBillingLoading] = useState(false);

	const justUpgraded = searchParams.get("upgraded") === "1";
	const isPremium = session?.user?.tier === "premium";

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth/signin?callbackUrl=/dashboard");
		}
	}, [status, router]);

	const { data: savedCities = [], isLoading } = useQuery<SavedCity[]>({
		queryKey: ["saved-cities"],
		queryFn: async () => {
			const res = await fetch("/api/users/me/cities");
			if (!res.ok) return [];
			return res.json() as Promise<SavedCity[]>;
		},
		enabled: status === "authenticated",
	});

	const removeMutation = useMutation({
		mutationFn: async (cityId: string) => {
			await fetch("/api/users/me/cities", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ cityId }),
			});
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-cities"] }),
	});

	async function handleManageBilling() {
		setBillingLoading(true);
		try {
			const res = await fetch("/api/stripe/portal", { method: "POST" });
			const data = await res.json() as { url?: string };
			if (data.url) window.location.href = data.url;
		} finally {
			setBillingLoading(false);
		}
	}

	if (status === "loading" || status === "unauthenticated") {
		return (
			<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)", color: "var(--color-muted)" }}>
				Loading...
			</div>
		);
	}

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			{/* Header */}
			<header className="border-b px-6 py-4 flex items-center justify-between glass" style={{ borderColor: "var(--color-border)" }}>
				<Link href="/" className="font-bold text-lg">
					<span style={{ color: "var(--color-accent)" }}>Next</span>Home USA
				</Link>
				<div className="flex items-center gap-4">
					{isPremium && <PremiumBadge />}
					<span className="text-sm hidden sm:inline" style={{ color: "var(--color-muted)" }}>
						{session?.user?.email}
					</span>
					<button
						type="button"
						onClick={() => signOut({ callbackUrl: "/" })}
						className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
						style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
					>
						<LogOut size={12} /> Sign out
					</button>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-8">
				{/* Upgrade success banner */}
				{justUpgraded && (
					<div
						className="flex items-center gap-3 rounded-2xl p-4 mb-8"
						style={{ background: "oklch(16% 0.06 160)", border: "1px solid oklch(45% 0.15 160)" }}
					>
						<div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
							<Check size={14} className="text-emerald-400" />
						</div>
						<div>
							<p className="font-semibold text-sm text-emerald-400">Welcome to Premium!</p>
							<p className="text-xs" style={{ color: "var(--color-muted)" }}>
								You now have access to Surprise Me AI recommendations, unlimited saves, and PDF reports.
							</p>
						</div>
					</div>
				)}

				{/* Welcome */}
				<div className="flex items-start justify-between mb-8 gap-4">
					<div>
						<h1 className="text-2xl font-bold">My Move Plan</h1>
						<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
							Your saved cities and research hub
						</p>
					</div>

					{/* Subscription controls */}
					{isPremium ? (
						<button
							type="button"
							onClick={handleManageBilling}
							disabled={billingLoading}
							className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border shrink-0 transition-colors hover:border-[var(--color-accent)] disabled:opacity-60"
							style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
						>
							<CreditCard size={12} />
							{billingLoading ? "Loading…" : "Manage Billing"}
						</button>
					) : (
						<Link
							href="/upgrade"
							className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border shrink-0 transition-colors hover:border-[var(--color-accent)]"
							style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
						>
							<Sparkles size={12} /> Upgrade
						</Link>
					)}
				</div>

				{/* Quick action cards */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
					{[
						{ href: "/explore", icon: "🔍", label: "Browse Cities" },
						{ href: "/quiz", icon: "🤖", label: "Retake Quiz" },
						{ href: "/map", icon: "🗺️", label: "Open Map" },
						{ href: "/surprise", icon: "✦", label: "Surprise Me" },
					].map((a) => (
						<Link
							key={a.href}
							href={a.href}
							className="glass rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-[var(--color-accent)] transition-colors"
						>
							<span className="text-2xl">{a.icon}</span>
							<span className="text-xs font-medium">{a.label}</span>
						</Link>
					))}
				</div>

				{/* Upgrade nudge for free users */}
				{!isPremium && (
					<div
						className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl p-5 mb-8"
						style={{ background: "oklch(14% 0.06 220)", border: "1px solid oklch(30% 0.08 220)" }}
					>
						<div className="flex items-center gap-3">
							<Sparkles size={18} style={{ color: "var(--color-accent)" }} />
							<div>
								<p className="font-semibold text-sm">Unlock Premium — $9/mo</p>
								<p className="text-xs" style={{ color: "var(--color-muted)" }}>
									Surprise Me AI, unlimited saves, PDF reports
								</p>
							</div>
						</div>
						<UpgradeButton label="Upgrade →" className="shrink-0 px-4 py-2 text-xs" />
					</div>
				)}

				{/* Saved cities */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-bold flex items-center gap-2">
							<Heart size={16} style={{ color: "var(--color-accent)" }} />
							Saved Cities
							{savedCities.length > 0 && (
								<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
									{savedCities.length}
								</span>
							)}
						</h2>
						<Link
							href="/explore"
							className="flex items-center gap-1 text-xs"
							style={{ color: "var(--color-accent)" }}
						>
							Add more <ArrowRight size={12} />
						</Link>
					</div>

					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="glass rounded-2xl h-48 animate-pulse" />
							))}
						</div>
					) : savedCities.length === 0 ? (
						<div className="glass rounded-2xl p-10 text-center">
							<p className="text-3xl mb-3">🏙️</p>
							<p className="font-semibold mb-1">No saved cities yet</p>
							<p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
								Browse cities and tap the heart icon to save them here.
							</p>
							<Link
								href="/explore"
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
								style={{ background: "var(--color-accent)", color: "#000" }}
							>
								Start Exploring
							</Link>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{savedCities.map((sc) => (
								<SavedCityCard
									key={sc.id}
									saved={sc}
									onRemove={() => removeMutation.mutate(sc.cityId)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}

export default function DashboardPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)", color: "var(--color-muted)" }}>
				Loading…
			</div>
		}>
			<DashboardContent />
		</Suspense>
	);
}

function SavedCityCard({ saved, onRemove }: { saved: SavedCity; onRemove: () => void }) {
	const { city } = saved;
	const score = Math.round(city.overallScore ?? 50);

	return (
		<div className="group glass rounded-2xl overflow-hidden flex flex-col">
			{/* Hero */}
			<Link href={`/city/${city.slug}`}>
				<div
					className="h-36 relative flex items-end p-4"
					style={{
						background: city.heroImageUrl
							? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65)), url(${city.thumbnailUrl ?? city.heroImageUrl}) center/cover no-repeat`
							: "linear-gradient(135deg, oklch(20% 0.05 220), oklch(14% 0.02 200))",
					}}
				>
					<MatchScoreBadge score={score} size="sm" className="absolute top-3 right-3" />
					<div>
						<p className="font-bold leading-tight">{city.name}</p>
						<p className="text-xs" style={{ color: "oklch(75% 0 0)" }}>{city.stateId}</p>
					</div>
				</div>
			</Link>

			{/* Actions */}
			<div className="p-3 flex items-center justify-between gap-2">
				<Link
					href={`/city/${city.slug}`}
					className="text-xs"
					style={{ color: "var(--color-accent)" }}
				>
					View details →
				</Link>
				<button
					type="button"
					onClick={onRemove}
					className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
					style={{ color: "var(--color-muted)" }}
					title="Remove from saved"
				>
					<Trash2 size={13} />
				</button>
			</div>
		</div>
	);
}
