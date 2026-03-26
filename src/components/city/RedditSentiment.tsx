"use client";

import { useEffect, useState } from "react";
import { ExternalLink, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";

interface RedditSentiment {
	postCount: number;
	avgUpvotes: number;
	positiveThemes: string[];
	negativeThemes: string[];
	topPosts: Array<{ title: string; upvotes: number; url: string; subreddit: string }>;
	fetchedAt: string;
}

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
				<span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
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

	return (
		<div className="space-y-5">
			{/* Summary stats */}
			<div className="grid grid-cols-2 gap-3">
				<div className="glass rounded-xl p-4">
					<p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Discussions found</p>
					<p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{sentiment.postCount}</p>
				</div>
				<div className="glass rounded-xl p-4">
					<p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Avg upvotes</p>
					<p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{sentiment.avgUpvotes}</p>
				</div>
			</div>

			{/* Themes */}
			{(sentiment.positiveThemes.length > 0 || sentiment.negativeThemes.length > 0) && (
				<div className="grid grid-cols-2 gap-4">
					{sentiment.positiveThemes.length > 0 && (
						<div className="space-y-2">
							<div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#4ade80" }}>
								<TrendingUp size={12} /> What people love
							</div>
							<div className="flex flex-wrap gap-1.5">
								{sentiment.positiveThemes.map((t) => (
									<span
										key={t}
										className="text-xs px-2 py-0.5 rounded-full capitalize"
										style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
									>
										{t}
									</span>
								))}
							</div>
						</div>
					)}
					{sentiment.negativeThemes.length > 0 && (
						<div className="space-y-2">
							<div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#f87171" }}>
								<TrendingDown size={12} /> Common concerns
							</div>
							<div className="flex flex-wrap gap-1.5">
								{sentiment.negativeThemes.map((t) => (
									<span
										key={t}
										className="text-xs px-2 py-0.5 rounded-full capitalize"
										style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}
									>
										{t}
									</span>
								))}
							</div>
						</div>
					)}
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
									<span className="text-xs" style={{ color: "var(--color-muted)" }}>
										r/{post.subreddit}
									</span>
									<span className="text-xs flex items-center gap-0.5" style={{ color: "var(--color-muted)" }}>
										<MessageSquare size={10} /> {post.upvotes} upvotes
									</span>
								</div>
							</div>
							<ExternalLink size={12} style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: 2 }} />
						</a>
					))}
				</div>
			)}

			<p className="text-xs" style={{ color: "var(--color-muted)" }}>
				From Reddit · Updated {new Date(sentiment.fetchedAt).toLocaleDateString()}
			</p>
		</div>
	);
}
