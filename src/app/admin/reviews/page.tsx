"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, X, Trash2, ExternalLink, Star } from "lucide-react";
import Link from "next/link";

interface Review {
	id: string;
	rating: number | null;
	body: string;
	pros: string | null;
	cons: string | null;
	status: string;
	createdAt: string | null;
	user: { name: string | null; email: string | null } | null;
	city: { name: string; stateId: string; slug: string } | null;
}

type Tab = "pending" | "approved" | "rejected";

export default function AdminReviewsPage() {
	const { data: session } = useSession();
	const [secret, setSecret] = useState("");
	const [authed, setAuthed] = useState(false);
	const [tab, setTab] = useState<Tab>("pending");
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(false);
	const [actioning, setActioning] = useState<string | null>(null);

	async function load(status: Tab, key: string) {
		setLoading(true);
		try {
			const res = await fetch(`/api/admin/reviews?status=${status}`, {
				headers: { "x-admin-secret": key },
			});
			if (res.status === 401) { setAuthed(false); return; }
			const data = await res.json();
			setReviews(data.reviews ?? []);
		} finally {
			setLoading(false);
		}
	}

	async function action(id: string, act: "approve" | "reject") {
		setActioning(id);
		await fetch("/api/admin/reviews", {
			method: "PATCH",
			headers: { "Content-Type": "application/json", "x-admin-secret": secret },
			body: JSON.stringify({ id, action: act }),
		});
		setReviews((prev) => prev.filter((r) => r.id !== id));
		setActioning(null);
	}

	async function remove(id: string) {
		if (!confirm("Permanently delete this review?")) return;
		setActioning(id);
		await fetch("/api/admin/reviews", {
			method: "DELETE",
			headers: { "Content-Type": "application/json", "x-admin-secret": secret },
			body: JSON.stringify({ id }),
		});
		setReviews((prev) => prev.filter((r) => r.id !== id));
		setActioning(null);
	}

	function handleAuth(e: React.FormEvent) {
		e.preventDefault();
		setAuthed(true);
		load(tab, secret);
	}

	useEffect(() => {
		if (authed) load(tab, secret);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	const bg = { background: "var(--color-background)" };
	const surface = { background: "var(--color-surface)", border: "1px solid var(--color-border)" };

	if (!authed) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6" style={bg}>
				<form onSubmit={handleAuth} className="glass rounded-2xl p-8 w-full max-w-sm space-y-4">
					<h1 className="text-xl font-bold">Admin — Review Moderation</h1>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>Enter your ADMIN_SECRET to continue.</p>
					<input
						type="password"
						className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
						style={surface}
						placeholder="Admin secret"
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
						required
					/>
					<button
						type="submit"
						className="w-full py-2.5 rounded-xl text-sm font-semibold"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Enter
					</button>
				</form>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-6" style={bg}>
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Review Moderation</h1>
					<span className="text-sm" style={{ color: "var(--color-muted)" }}>{reviews.length} reviews</span>
				</div>

				{/* Tabs */}
				<div className="flex gap-2">
					{(["pending", "approved", "rejected"] as Tab[]).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
							style={tab === t
								? { background: "var(--color-accent)", color: "#000" }
								: { ...surface, color: "var(--color-muted)" }
							}
						>
							{t}
						</button>
					))}
				</div>

				{loading && (
					<div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
						<span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
							style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
						Loading…
					</div>
				)}

				{!loading && reviews.length === 0 && (
					<div className="glass rounded-2xl p-12 text-center" style={{ color: "var(--color-muted)" }}>
						No {tab} reviews.
					</div>
				)}

				<div className="space-y-4">
					{reviews.map((r) => {
						const pros: string[] = r.pros ? JSON.parse(r.pros) : [];
						const cons: string[] = r.cons ? JSON.parse(r.cons) : [];
						return (
							<div key={r.id} className="glass rounded-2xl p-5 space-y-3">
								{/* Header */}
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-0.5">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-sm">{r.user?.name ?? "Unknown"}</span>
											{r.user?.email && (
												<span className="text-xs" style={{ color: "var(--color-muted)" }}>{r.user.email}</span>
											)}
										</div>
										{r.city && (
											<Link
												href={`/city/${r.city.slug}`}
												target="_blank"
												className="text-xs flex items-center gap-1 hover:underline"
												style={{ color: "var(--color-accent)" }}
											>
												{r.city.name}, {r.city.stateId} <ExternalLink size={10} />
											</Link>
										)}
										<span className="text-xs" style={{ color: "var(--color-muted)" }}>
											{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
										</span>
									</div>
									{r.rating && (
										<div className="flex items-center gap-0.5">
											{[1,2,3,4,5].map((s) => (
												<Star key={s} size={12}
													fill={s <= r.rating! ? "#00d4ff" : "transparent"}
													stroke={s <= r.rating! ? "#00d4ff" : "#555"}
												/>
											))}
										</div>
									)}
								</div>

								{/* Body */}
								<p className="text-sm leading-relaxed">{r.body}</p>

								{/* Pros / Cons */}
								{(pros.length > 0 || cons.length > 0) && (
									<div className="flex gap-4 text-xs" style={{ color: "var(--color-muted)" }}>
										{pros.length > 0 && <span style={{ color: "#4ade80" }}>✓ {pros.join(", ")}</span>}
										{cons.length > 0 && <span style={{ color: "#f87171" }}>✗ {cons.join(", ")}</span>}
									</div>
								)}

								{/* Actions */}
								<div className="flex items-center gap-2 pt-1">
									{tab !== "approved" && (
										<button
											type="button"
											onClick={() => action(r.id, "approve")}
											disabled={actioning === r.id}
											className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
											style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}
										>
											<Check size={12} /> Approve
										</button>
									)}
									{tab !== "rejected" && (
										<button
											type="button"
											onClick={() => action(r.id, "reject")}
											disabled={actioning === r.id}
											className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
											style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}
										>
											<X size={12} /> Reject
										</button>
									)}
									<button
										type="button"
										onClick={() => remove(r.id)}
										disabled={actioning === r.id}
										className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 ml-auto"
										style={{ color: "var(--color-muted)" }}
									>
										<Trash2 size={12} /> Delete
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
