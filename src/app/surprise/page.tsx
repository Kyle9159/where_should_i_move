"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { decodeWeights } from "@/lib/ranking";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

interface SurpriseCity {
	id: string;
	slug: string;
	name: string;
	stateId: string;
	population: number | null;
	tier: string;
	heroImageUrl: string | null;
	thumbnailUrl: string | null;
	overallScore: number | null;
	grokReasoning: string;
}

type Phase = "idle" | "thinking" | "revealed";

const THINKING_MESSAGES = [
	"Analyzing your priorities...",
	"Scanning 1,000 US cities...",
	"Filtering by what matters to you...",
	"Discovering hidden gems...",
	"Almost there...",
];

export default function SurpriseMePage() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [cities, setCities] = useState<SurpriseCity[]>([]);
	const [thinkingMsg, setThinkingMsg] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Cycle thinking messages
	useEffect(() => {
		if (phase !== "thinking") return;
		const id = setInterval(() => setThinkingMsg((m) => (m + 1) % THINKING_MESSAGES.length), 900);
		return () => clearInterval(id);
	}, [phase]);

	async function fetchSurprise(excludeSlugs: string[] = []) {
		setPhase("thinking");
		setError(null);

		// Get weights from localStorage if available
		let weightsEncoded: string | undefined;
		if (typeof window !== "undefined") {
			weightsEncoded = localStorage.getItem("quiz_weights") ?? undefined;
		}

		try {
			const res = await fetch("/api/recommendations/surprise", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					weightsEncoded,
					excludeSlugs,
					count: 5,
				}),
			});

			if (!res.ok) throw new Error("API error");
			const data = await res.json() as { cities: SurpriseCity[] };

			// Small delay for dramatic effect
			await new Promise((r) => setTimeout(r, 1200));

			setCities(data.cities);
			setPhase("revealed");
		} catch {
			setError("Something went wrong. Try again?");
			setPhase("idle");
		}
	}

	function refresh() {
		const currentSlugs = cities.map((c) => c.slug);
		setCities([]);
		fetchSurprise(currentSlugs);
	}

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			<div className="max-w-4xl mx-auto px-6 py-12">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<Link
						href="/explore"
						className="flex items-center gap-2 text-sm transition-colors"
						style={{ color: "var(--color-muted)" }}
					>
						<ArrowLeft size={16} /> Explore
					</Link>
				</div>

				<div className="text-center mb-12">
					<div
						className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border mb-4"
						style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
					>
						<Sparkles size={12} style={{ color: "var(--color-accent)" }} />
						AI-powered hidden gems
					</div>
					<h1 className="text-4xl font-bold mb-3">Surprise Me</h1>
					<p className="max-w-lg mx-auto text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
						{phase === "idle" && "Let our AI find 5 cities you'd never think to consider — matched to your priorities."}
						{phase === "thinking" && "Our AI is scanning 1,000 cities to find your hidden gems..."}
						{phase === "revealed" && "Here are 5 cities picked just for you. Take the quiz first for even better results."}
					</p>
				</div>

				{/* Idle state */}
				{phase === "idle" && (
					<div className="flex flex-col items-center gap-4">
						{error && (
							<p className="text-sm" style={{ color: "oklch(70% 0.15 30)" }}>{error}</p>
						)}
						<button
							type="button"
							onClick={() => fetchSurprise()}
							className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:brightness-110 glow-cyan"
							style={{ background: "var(--color-accent)", color: "#000" }}
						>
							<Sparkles size={20} /> Discover My Cities
						</button>
						<Link
							href="/quiz"
							className="text-sm"
							style={{ color: "var(--color-muted)" }}
						>
							Take the quiz first for personalized results →
						</Link>
					</div>
				)}

				{/* Thinking state */}
				{phase === "thinking" && (
					<div className="flex flex-col items-center gap-8 py-8">
						{/* Pulsing logo */}
						<div className="relative">
							<div
								className="w-24 h-24 rounded-full flex items-center justify-center"
								style={{ background: "oklch(18% 0.06 220)", border: "2px solid var(--color-accent)" }}
							>
								<Sparkles size={40} style={{ color: "var(--color-accent)" }} className="animate-pulse" />
							</div>
							{/* Ripple rings */}
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="absolute inset-0 rounded-full border"
									style={{
										borderColor: `color-mix(in oklch, var(--color-accent) ${40 - i * 10}%, transparent)`,
										animation: `ping ${1.2 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
										animationDelay: `${i * 0.2}s`,
									}}
								/>
							))}
						</div>
						<p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
							{THINKING_MESSAGES[thinkingMsg]}
						</p>
					</div>
				)}

				{/* Revealed state */}
				{phase === "revealed" && cities.length > 0 && (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{cities.map((city, i) => (
								<SurpriseCityCard key={city.id} city={city} index={i} />
							))}
						</div>

						<div className="flex justify-center mt-8 gap-3">
							<button
								type="button"
								onClick={refresh}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm border transition-colors hover:border-[var(--color-accent)]"
								style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
							>
								<RefreshCw size={14} /> Different suggestions
							</button>
							<Link
								href="/explore"
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
								style={{ background: "var(--color-accent)", color: "#000" }}
							>
								Browse All Cities
							</Link>
						</div>
					</>
				)}
			</div>
		</main>
	);
}

function SurpriseCityCard({ city, index }: { city: SurpriseCity; index: number }) {
	const score = Math.round(city.overallScore ?? 50);

	return (
		<div
			className="glass rounded-2xl overflow-hidden flex flex-col"
			style={{
				animation: `fadeSlideUp 0.4s ease forwards`,
				animationDelay: `${index * 100}ms`,
				opacity: 0,
			}}
		>
			<style>{`
				@keyframes fadeSlideUp {
					from { opacity: 0; transform: translateY(16px); }
					to { opacity: 1; transform: translateY(0); }
				}
			`}</style>

			{/* Image / gradient hero */}
			<div
				className="relative h-36"
				style={{
					background: city.heroImageUrl
						? `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6)), url(${city.thumbnailUrl ?? city.heroImageUrl}) center/cover no-repeat`
						: "linear-gradient(135deg, oklch(20% 0.05 220), oklch(14% 0.02 200))",
				}}
			>
				<MatchScoreBadge score={score} size="sm" className="absolute top-3 right-3" />
				<div className="absolute bottom-3 left-4">
					<p className="font-bold text-base leading-tight">{city.name}</p>
					<p className="text-xs" style={{ color: "oklch(80% 0 0)" }}>{city.stateId}</p>
				</div>
			</div>

			{/* AI reasoning */}
			<div className="p-4 flex-1 flex flex-col justify-between gap-3">
				<p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
					<span style={{ color: "var(--color-accent)" }}>✦ </span>
					{city.grokReasoning}
				</p>
				<Link
					href={`/city/${city.slug}`}
					className="flex items-center gap-1.5 text-xs font-medium self-start"
					style={{ color: "var(--color-accent)" }}
				>
					Explore city <ExternalLink size={11} />
				</Link>
			</div>
		</div>
	);
}
