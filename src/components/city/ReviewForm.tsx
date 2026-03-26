"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Star, Plus, X, Send } from "lucide-react";
import Link from "next/link";

interface Props {
	slug: string;
	onSubmitted?: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export function ReviewForm({ slug, onSubmitted }: Props) {
	const { data: session } = useSession();
	const [rating, setRating] = useState(0);
	const [hoverRating, setHoverRating] = useState(0);
	const [body, setBody] = useState("");
	const [proInput, setProInput] = useState("");
	const [conInput, setConInput] = useState("");
	const [pros, setPros] = useState<string[]>([]);
	const [cons, setCons] = useState<string[]>([]);
	const [yearsLivedThere, setYearsLivedThere] = useState("");
	const [livedFrom, setLivedFrom] = useState("");
	const [livedTo, setLivedTo] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!session?.user) {
		return (
			<div
				className="flex flex-col items-center gap-3 py-8 text-center rounded-2xl border border-dashed"
				style={{ borderColor: "var(--color-border)" }}
			>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					Sign in to share your experience living in this city.
				</p>
				<Link
					href={`/auth/signin?callbackUrl=/city/${slug}`}
					className="text-sm px-4 py-2 rounded-xl font-medium transition-colors"
					style={{ background: "var(--color-accent)", color: "#000" }}
				>
					Sign in to Review
				</Link>
			</div>
		);
	}

	if (success) {
		return (
			<div
				className="flex flex-col items-center gap-2 py-10 text-center rounded-2xl"
				style={{ background: "var(--color-surface)" }}
			>
				<span className="text-2xl">🎉</span>
				<p className="font-semibold">Thanks for your review!</p>
				<p className="text-xs" style={{ color: "var(--color-muted)" }}>
					It will appear after a quick moderation check.
				</p>
			</div>
		);
	}

	function addTag(
		val: string,
		list: string[],
		setList: (v: string[]) => void,
		setInput: (v: string) => void,
	) {
		const trimmed = val.trim();
		if (trimmed && !list.includes(trimmed) && list.length < 6) {
			setList([...list, trimmed]);
		}
		setInput("");
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			const res = await fetch(`/api/cities/${slug}/reviews`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rating: rating || undefined,
					body,
					pros: pros.length ? pros : undefined,
					cons: cons.length ? cons : undefined,
					yearsLivedThere: yearsLivedThere ? Number(yearsLivedThere) : undefined,
					livedFrom: livedFrom ? Number(livedFrom) : undefined,
					livedTo: livedTo ? Number(livedTo) : undefined,
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				setError(data.error ?? "Submission failed");
			} else {
				setSuccess(true);
				onSubmitted?.();
			}
		} catch {
			setError("Network error, please try again");
		} finally {
			setSubmitting(false);
		}
	}

	const inputClass =
		"w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:ring-1";
	const inputStyle = {
		background: "var(--color-surface)",
		border: "1px solid var(--color-border)",
		color: "var(--color-text)",
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			{/* Star rating */}
			<div className="flex flex-col gap-2">
				<label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
					Overall Rating
				</label>
				<div className="flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setRating(s)}
							onMouseEnter={() => setHoverRating(s)}
							onMouseLeave={() => setHoverRating(0)}
							className="transition-transform hover:scale-110"
						>
							<Star
								size={24}
								fill={(hoverRating || rating) >= s ? "#00d4ff" : "transparent"}
								stroke={(hoverRating || rating) >= s ? "#00d4ff" : "#555"}
							/>
						</button>
					))}
					{rating > 0 && (
						<span className="text-sm ml-2" style={{ color: "var(--color-muted)" }}>
							{["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
						</span>
					)}
				</div>
			</div>

			{/* Review body */}
			<div className="flex flex-col gap-2">
				<label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
					Your Experience <span style={{ color: "#f87171" }}>*</span>
				</label>
				<textarea
					className={inputClass}
					style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
					placeholder="What's it like living here? What should movers know?"
					value={body}
					onChange={(e) => setBody(e.target.value)}
					required
					minLength={20}
					maxLength={2000}
				/>
				<span className="text-xs text-right" style={{ color: "var(--color-muted)" }}>
					{body.length}/2000
				</span>
			</div>

			{/* Pros */}
			<div className="flex flex-col gap-2">
				<label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#4ade80" }}>
					Pros (optional, up to 6)
				</label>
				<div className="flex gap-2">
					<input
						className={inputClass}
						style={inputStyle}
						placeholder="e.g. Great schools"
						value={proInput}
						onChange={(e) => setProInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addTag(proInput, pros, setPros, setProInput);
							}
						}}
					/>
					<button
						type="button"
						onClick={() => addTag(proInput, pros, setPros, setProInput)}
						className="px-3 py-2 rounded-xl text-sm"
						style={{ background: "var(--color-surface)", border: "1px solid #4ade80", color: "#4ade80" }}
					>
						<Plus size={14} />
					</button>
				</div>
				{pros.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{pros.map((p) => (
							<span
								key={p}
								className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
								style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
							>
								{p}
								<button type="button" onClick={() => setPros(pros.filter((x) => x !== p))}>
									<X size={10} />
								</button>
							</span>
						))}
					</div>
				)}
			</div>

			{/* Cons */}
			<div className="flex flex-col gap-2">
				<label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#f87171" }}>
					Cons (optional, up to 6)
				</label>
				<div className="flex gap-2">
					<input
						className={inputClass}
						style={inputStyle}
						placeholder="e.g. High traffic"
						value={conInput}
						onChange={(e) => setConInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addTag(conInput, cons, setCons, setConInput);
							}
						}}
					/>
					<button
						type="button"
						onClick={() => addTag(conInput, cons, setCons, setConInput)}
						className="px-3 py-2 rounded-xl text-sm"
						style={{ background: "var(--color-surface)", border: "1px solid #f87171", color: "#f87171" }}
					>
						<Plus size={14} />
					</button>
				</div>
				{cons.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{cons.map((c) => (
							<span
								key={c}
								className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
								style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}
							>
								{c}
								<button type="button" onClick={() => setCons(cons.filter((x) => x !== c))}>
									<X size={10} />
								</button>
							</span>
						))}
					</div>
				)}
			</div>

			{/* Years lived */}
			<div className="grid grid-cols-3 gap-3">
				<div className="flex flex-col gap-1">
					<label className="text-xs" style={{ color: "var(--color-muted)" }}>Years lived</label>
					<input
						type="number"
						min={0}
						max={80}
						className={inputClass}
						style={inputStyle}
						placeholder="e.g. 5"
						value={yearsLivedThere}
						onChange={(e) => setYearsLivedThere(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs" style={{ color: "var(--color-muted)" }}>From year</label>
					<input
						type="number"
						min={1940}
						max={CURRENT_YEAR}
						className={inputClass}
						style={inputStyle}
						placeholder={String(CURRENT_YEAR - 5)}
						value={livedFrom}
						onChange={(e) => setLivedFrom(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs" style={{ color: "var(--color-muted)" }}>To year</label>
					<input
						type="number"
						min={1940}
						max={CURRENT_YEAR}
						className={inputClass}
						style={inputStyle}
						placeholder={String(CURRENT_YEAR)}
						value={livedTo}
						onChange={(e) => setLivedTo(e.target.value)}
					/>
				</div>
			</div>

			{error && (
				<p className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
					{error}
				</p>
			)}

			<button
				type="submit"
				disabled={submitting || body.trim().length < 20}
				className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
				style={{ background: "var(--color-accent)", color: "#000" }}
			>
				<Send size={14} />
				{submitting ? "Submitting…" : "Submit Review"}
			</button>
		</form>
	);
}
