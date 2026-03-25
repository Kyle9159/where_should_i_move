"use client";

import Link from "next/link";
import { X, BarChart3, ArrowRight } from "lucide-react";
import { useComparison, type CompareEntry } from "@/hooks/useComparison";

export function CompareBar() {
	const { cities, remove, clear, count } = useComparison();

	if (count === 0) return null;

	return (
		<div
			className="fixed bottom-0 inset-x-0 z-50 glass border-t px-6 py-3 flex items-center gap-3"
			style={{ borderColor: "var(--color-border)" }}
		>
			<div className="flex items-center gap-2 shrink-0">
				<BarChart3 size={16} style={{ color: "var(--color-accent)" }} />
				<span className="text-sm font-semibold">
					Comparing{" "}
					<span style={{ color: "var(--color-accent)" }}>{count}</span>
					{" "}/ 4
				</span>
			</div>

			{/* City chips */}
			<div className="flex items-center gap-2 flex-1 overflow-x-auto">
				{cities.map((city) => (
					<span
						key={city.id}
						className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0"
						style={{ background: "oklch(18% 0.04 220)", border: "1px solid var(--color-border)" }}
					>
						{city.name}, {city.stateId}
						<button
							type="button"
							onClick={() => remove(city.id)}
							style={{ color: "var(--color-muted)" }}
						>
							<X size={10} />
						</button>
					</span>
				))}
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={clear}
					className="text-xs px-3 py-1.5 rounded-lg"
					style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
				>
					Clear
				</button>

				<Link
					href="/compare"
					className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110"
					style={{ background: "var(--color-accent)", color: "#000" }}
				>
					Compare <ArrowRight size={12} />
				</Link>
			</div>
		</div>
	);
}

/**
 * Button to add/remove a city from the comparison list.
 * Drop this into any city card or city detail page.
 */
export function CompareButton({ entry }: { entry: CompareEntry }) {
	const { toggle, has, isFull } = useComparison();
	const isAdded = has(entry.id);
	const disabled = isFull && !isAdded;

	return (
		<button
			type="button"
			onClick={() => toggle(entry)}
			disabled={disabled}
			className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30"
			style={
				isAdded
					? { borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "oklch(18% 0.04 220)" }
					: { borderColor: "var(--color-border)", color: "var(--color-muted)" }
			}
		>
			<BarChart3 size={12} />
			{isAdded ? "Remove" : disabled ? "Full (4/4)" : "Compare"}
		</button>
	);
}
