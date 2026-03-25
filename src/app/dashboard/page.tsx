"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Heart, Trash2, Map, Sparkles, BarChart3, LogOut, ArrowRight } from "lucide-react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { formatCurrency } from "@/lib/utils";

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

export default function DashboardPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const queryClient = useQueryClient();

	// Redirect to sign-in if not authenticated
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
					<span className="text-sm" style={{ color: "var(--color-muted)" }}>
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
				{/* Welcome */}
				<div className="mb-8">
					<h1 className="text-2xl font-bold">My Move Plan</h1>
					<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
						Your saved cities and research hub
					</p>
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
