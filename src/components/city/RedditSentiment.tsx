"use client";

import { useEffect, useState } from "react";
import { ExternalLink, TrendingUp, TrendingDown, MessageSquare, Flame } from "lucide-react";

interface RedditSentiment {
	postCount: number;
	avgUpvotes: number;
	positiveThemes: string[];
	negativeThemes: string[];
	topPosts: Array<{ title: string; upvotes: number; url: string; subreddit: string }>;
	fetchedAt: string;
}

// ── Theme categorisation ─────────────────────────────────────────────────────

const THEME_CATEGORIES: Array<{ label: string; emoji: string; keywords: string[] }> = [
	{ label: "Housing", emoji: "🏠", keywords: ["affordable", "expensive", "high taxes", "home prices", "rent"] },
	{ label: "Safety", emoji: "🛡️", keywords: ["safe", "dangerous", "crime", "low crime"] },
	{ label: "Jobs", emoji: "💼", keywords: ["job market", "growing", "thriving", "jobs", "tech"] },
	{ label: "Transport", emoji: "🚗", keywords: ["traffic", "sprawl", "commute", "walkable"] },
	{ label: "Lifestyle", emoji: "🌿", keywords: ["vibrant", "beautiful", "clean", "outdoors", "best", "friendly", "wonderful", "amazing", "love", "great"] },
	{ label: "Concerns", emoji: "⚠️", keywords: ["boring", "hot", "humid", "flooding", "homeless", "leaving", "regret", "overrated", "bad schools", "avoid", "tornado", "hurricane"] },
];

function categoriseThemes(positiveThemes: string[], negativeThemes: string[]) {
	const allThemes = [
		...positiveThemes.map((t) => ({ theme: t, sentiment: "positive" as const })),
		...negativeThemes.map((t) => ({ theme: t, sentiment: "negative" as const })),
	];
	const buckets: Record<string, Array<{ theme: string; sentiment: "positive" | "negative" }>> = {};

	for (const { theme, sentiment } of allThemes) {
		let placed = false;
		for (const cat of THEME_CATEGORIES) {
			if (cat.keywords.some((kw) => theme.toLowerCase().includes(kw) || kw.includes(theme.toLowerCase()))) {
				if (!buckets[cat.label]) buckets[cat.label] = [];
				buckets[cat.label].push({ theme, sentiment });
				placed = true;
				break;
			}
		}
		if (!placed) {
			if (!buckets["Other"]) buckets["Other"] = [];
			buckets["Other"].push({ theme, sentiment });
		}
	}
	return buckets;
}

function computeSentimentScore(pos: string[], neg: string[]): number {
	const total = pos.length + neg.length;
	if (total === 0) return 50;
	return Math.round((pos.length / total) * 100);
}

function sentimentLabel(score: number): { label: string; color: string } {
	if (score >= 75) return { label: "Very Positive", color: "#4ade80" };
	if (score >= 55) return { label: "Mostly Positive", color: "#a3e635" };
	if (score >= 45) return { label: "Mixed", color: "#facc15" };
	if (score >= 30) return { label: "Mostly Concerns", color: "#fb923c" };
	return { label: "Mixed Concerns", color: "#f87171" };
}

// ── Component ────────────────────────────────────────────────────────────────

export function RedditSentiment({ slug, cityName }: { slug: string; cityName: string }) {
	const [sentiment, setSentiment] = useState<RedditSentiment | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/cities/${slug}/sentiment`)
			.then((r) => r.json())
			.then((d) => setSentiment(d.sentiment ?? null))
			.finally(() => setLoading(false));
	}, [slug]);

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--color-muted)" }}>
				<span className="w-4 h-4 rounded-full border-2 animate-spin inline-block"
					style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
				Fetching Reddit discussions…
			</div>
		);
	}

	if (!sentiment || sentiment.postCount === 0) {
		return (
			<div className="text-sm py-4" style={{ color: "var(--color-muted)" }}>
				No Reddit discussions found for {cityName}.
			</div>
		);
	}

	const score = computeSentimentScore(sentiment.positiveThemes, sentiment.negativeThemes);
	const { label: scoreLabel, color: scoreColor } = sentimentLabel(score);
	const buckets = categoriseThemes(sentiment.positiveThemes, sentiment.negativeThemes);
	const isHot = sentiment.postCount >= 50;

	return (
		<div className="space-y-5">

			{/* Sentiment gauge */}
			<div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--color-surface)" }}>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: "var(--color-muted)" }}>
							Community Sentiment
						</p>
						<p className="text-lg font-bold" style={{ color: scoreColor }}>{scoreLabel}</p>
					</div>
					<div className="flex flex-col items-end gap-1.5">
						<span className="text-3xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</span>
						{isHot && (
							<span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
								style={{ background: "rgba(255,69,0,0.15)", color: "#ff4500" }}>
								<Flame size={10} /> Hot topic
							</span>
						)}
					</div>
				</div>

				{/* Gauge bar */}
				<div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(248,113,113,0.2)" }}>
					<div
						className="h-full rounded-full transition-all duration-700"
						style={{ width: `${score}%`, background: `linear-gradient(90deg, #facc15 0%, ${scoreColor} 100%)` }}
					/>
				</div>

				<div className="flex justify-between text-xs" style={{ color: "var(--color-muted)" }}>
					<span className="flex items-center gap-1">
						<TrendingDown size={10} /> {sentiment.negativeThemes.length} concerns
					</span>
					<span className="flex items-center gap-1">
						<TrendingUp size={10} /> {sentiment.positiveThemes.length} positives
					</span>
				</div>
			</div>

			{/* Activity stats */}
			<div className="grid grid-cols-2 gap-3">
				<div className="glass rounded-xl p-4">
					<p className="text-xs mb-1 flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
						<MessageSquare size={11} /> Discussions
					</p>
					<p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{sentiment.postCount}</p>
				</div>
				<div className="glass rounded-xl p-4">
					<p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Avg upvotes</p>
					<p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{sentiment.avgUpvotes}</p>
				</div>
			</div>

			{/* Categorised themes */}
			{Object.keys(buckets).length > 0 && (
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
						What people talk about
					</p>
					<div className="grid grid-cols-2 gap-2">
						{Object.entries(buckets).map(([category, items]) => {
							const cat = THEME_CATEGORIES.find((c) => c.label === category);
							const posCount = items.filter((i) => i.sentiment === "positive").length;
							const negCount = items.filter((i) => i.sentiment === "negative").length;
							const bucketPositive = posCount >= negCount;

							return (
								<div
									key={category}
									className="rounded-xl p-3 space-y-1.5"
									style={{
										background: bucketPositive ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)",
										border: `1px solid ${bucketPositive ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
									}}
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold" style={{ color: bucketPositive ? "#4ade80" : "#f87171" }}>
											{cat?.emoji ?? "•"} {category}
										</span>
										{posCount > 0 && negCount > 0 && (
											<span className="text-xs" style={{ color: "var(--color-muted)" }}>
												{posCount}↑ {negCount}↓
											</span>
										)}
									</div>
									<div className="flex flex-wrap gap-1">
										{items.map(({ theme, sentiment: s }) => (
											<span
												key={theme}
												className="text-xs px-1.5 py-0.5 rounded-full capitalize"
												style={{
													background: s === "positive" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
													color: s === "positive" ? "#86efac" : "#fca5a5",
												}}
											>
												{theme}
											</span>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Top posts */}
			{sentiment.topPosts.length > 0 && (
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
						Top discussions
					</p>
					{sentiment.topPosts.map((post) => (
						<a
							key={post.url}
							href={post.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-start justify-between gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--color-surface)]"
							style={{ border: "1px solid var(--color-border)" }}
						>
							<div className="flex-1 min-w-0">
								<p className="text-sm leading-snug line-clamp-2">{post.title}</p>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-xs font-medium" style={{ color: "#ff4500" }}>r/{post.subreddit}</span>
									<span className="text-xs" style={{ color: "var(--color-muted)" }}>
										{post.upvotes} upvotes
									</span>
								</div>
							</div>
							<ExternalLink size={12} style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: 2 }} />
						</a>
					))}
				</div>
			)}

			<p className="text-xs" style={{ color: "var(--color-muted)" }}>
				Via Reddit · Updated {new Date(sentiment.fetchedAt).toLocaleDateString()}
			</p>
		</div>
	);
}
