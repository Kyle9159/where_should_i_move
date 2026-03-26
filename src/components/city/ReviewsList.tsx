"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

interface Review {
	id: string;
	rating: number | null;
	body: string;
	pros: string | null;
	cons: string | null;
	yearsLivedThere: number | null;
	livedFrom: number | null;
	livedTo: number | null;
	createdAt: string | null;
	authorName: string | null;
}

function StarRow({ rating }: { rating: number }) {
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((s) => (
				<Star
					key={s}
					size={12}
					fill={s <= rating ? "#00d4ff" : "transparent"}
					stroke={s <= rating ? "#00d4ff" : "#555"}
				/>
			))}
		</div>
	);
}

export function ReviewsList({ slug }: { slug: string }) {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/cities/${slug}/reviews`)
			.then((r) => r.json())
			.then((d) => setReviews(d.reviews ?? []))
			.finally(() => setLoading(false));
	}, [slug]);

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
				<span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
				Loading reviews…
			</div>
		);
	}

	if (reviews.length === 0) {
		return (
			<div
				className="flex flex-col items-center gap-2 py-10 rounded-2xl border border-dashed text-center"
				style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
			>
				<MessageSquare size={24} />
				<p className="text-sm">No reviews yet. Be the first to share your experience!</p>
			</div>
		);
	}

	// Summary stats
	const rated = reviews.filter((r) => r.rating !== null);
	const avgRating =
		rated.length > 0
			? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
			: null;

	return (
		<div className="space-y-5">
			{/* Summary bar */}
			{avgRating && (
				<div
					className="flex items-center gap-4 p-4 rounded-xl"
					style={{ background: "var(--color-surface)" }}
				>
					<div className="text-4xl font-bold" style={{ color: "var(--color-accent)" }}>
						{avgRating}
					</div>
					<div className="flex flex-col gap-1">
						<StarRow rating={Math.round(Number(avgRating))} />
						<p className="text-xs" style={{ color: "var(--color-muted)" }}>
							{rated.length} resident review{rated.length !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
			)}

			{/* Cards */}
			{reviews.map((review) => {
				const pros: string[] = review.pros ? JSON.parse(review.pros) : [];
				const cons: string[] = review.cons ? JSON.parse(review.cons) : [];
				const lived =
					review.livedFrom && review.livedTo
						? `${review.livedFrom}–${review.livedTo}`
						: review.livedFrom
							? `Since ${review.livedFrom}`
							: review.yearsLivedThere
								? `${review.yearsLivedThere} yr${review.yearsLivedThere !== 1 ? "s" : ""} lived here`
								: null;

				return (
					<div
						key={review.id}
						className="glass rounded-2xl p-5 space-y-3"
					>
						{/* Header */}
						<div className="flex items-start justify-between gap-3">
							<div className="flex flex-col gap-1">
								<span className="text-sm font-semibold">
									{review.authorName ?? "Anonymous"}
								</span>
								{lived && (
									<span className="text-xs" style={{ color: "var(--color-muted)" }}>
										{lived}
									</span>
								)}
							</div>
							<div className="flex flex-col items-end gap-1">
								{review.rating !== null && <StarRow rating={review.rating} />}
								{review.createdAt && (
									<span className="text-xs" style={{ color: "var(--color-muted)" }}>
										{new Date(review.createdAt).toLocaleDateString()}
									</span>
								)}
							</div>
						</div>

						{/* Body */}
						<p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
							{review.body}
						</p>

						{/* Pros / Cons */}
						{(pros.length > 0 || cons.length > 0) && (
							<div className="grid grid-cols-2 gap-3 pt-1">
								{pros.length > 0 && (
									<div className="space-y-1">
										<div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#4ade80" }}>
											<ThumbsUp size={11} /> Pros
										</div>
										<ul className="space-y-0.5">
											{pros.map((p) => (
												<li key={p} className="text-xs" style={{ color: "var(--color-muted)" }}>
													· {p}
												</li>
											))}
										</ul>
									</div>
								)}
								{cons.length > 0 && (
									<div className="space-y-1">
										<div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#f87171" }}>
											<ThumbsDown size={11} /> Cons
										</div>
										<ul className="space-y-0.5">
											{cons.map((c) => (
												<li key={c} className="text-xs" style={{ color: "var(--color-muted)" }}>
													· {c}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
