/**
 * Neighborhood cards for the city detail page.
 * Shows name, vibe, pros/cons, best-for tags, walk score, and housing estimates.
 */
import type { neighborhoods } from "@/db/schema";

type Neighborhood = typeof neighborhoods.$inferSelect;

interface Props {
	neighborhoods: Neighborhood[];
	cityName: string;
}

const VIBE_COLORS: Record<string, string> = {
	walkable: "bg-emerald-900/40 text-emerald-400",
	"family-friendly": "bg-blue-900/40 text-blue-400",
	artsy: "bg-purple-900/40 text-purple-400",
	trendy: "bg-pink-900/40 text-pink-400",
	historic: "bg-amber-900/40 text-amber-400",
	suburban: "bg-slate-800/40 text-slate-400",
	urban: "bg-cyan-900/40 text-cyan-400",
};

const BEST_FOR_COLORS: Record<string, string> = {
	"families": "bg-blue-900/30 text-blue-300",
	"young professionals": "bg-violet-900/30 text-violet-300",
	"students": "bg-green-900/30 text-green-300",
	"retirees": "bg-orange-900/30 text-orange-300",
	"remote workers": "bg-teal-900/30 text-teal-300",
	"nightlife seekers": "bg-pink-900/30 text-pink-300",
	"outdoor enthusiasts": "bg-lime-900/30 text-lime-300",
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
	if (!raw) return fallback;
	try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function walkScoreColor(score: number): string {
	if (score >= 80) return "#4ade80";
	if (score >= 60) return "#facc15";
	return "#f87171";
}

export function NeighborhoodCards({ neighborhoods: hoods, cityName }: Props) {
	if (hoods.length === 0) {
		return (
			<div className="glass rounded-2xl p-6">
				<h2 className="font-bold mb-2">🏘️ Neighborhoods</h2>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					Neighborhood data for {cityName} is coming soon. Check back after our next data refresh.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<h2 className="font-bold">🏘️ Neighborhoods in {cityName}</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{hoods.map((hood) => {
					const vibes = parseJson<string[]>(hood.vibeKeywords, []);
					const pros = parseJson<string[]>(hood.pros, []);
					const cons = parseJson<string[]>(hood.cons, []);
					const bestFor = parseJson<string[]>(hood.bestFor, []);

					return (
						<div key={hood.id} className="glass rounded-2xl p-5 flex flex-col gap-3">

							{/* Header */}
							<div className="flex items-start justify-between gap-2">
								<h3 className="font-semibold leading-tight">{hood.name}</h3>
								{hood.walkScore != null && (
									<span
										className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
										style={{ background: "oklch(18% 0.04 220)", color: walkScoreColor(hood.walkScore) }}
									>
										Walk {hood.walkScore}
									</span>
								)}
							</div>

							{/* Description */}
							{hood.description && (
								<p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
									{hood.description}
								</p>
							)}

							{/* Vibe + Best For tags */}
							{(vibes.length > 0 || bestFor.length > 0) && (
								<div className="flex flex-wrap gap-1.5">
									{vibes.map((v) => (
										<span key={v} className={`text-xs px-2 py-0.5 rounded-full ${VIBE_COLORS[v] ?? "bg-gray-800/40 text-gray-400"}`}>
											{v}
										</span>
									))}
									{bestFor.map((b) => (
										<span key={b} className={`text-xs px-2 py-0.5 rounded-full ${BEST_FOR_COLORS[b] ?? "bg-gray-800/40 text-gray-400"}`}>
											★ {b}
										</span>
									))}
								</div>
							)}

							{/* Pros / Cons */}
							{(pros.length > 0 || cons.length > 0) && (
								<div className="grid grid-cols-2 gap-3">
									{pros.length > 0 && (
										<div>
											<p className="text-xs font-medium mb-1" style={{ color: "#4ade80" }}>Pros</p>
											<ul className="space-y-1">
												{pros.map((p) => (
													<li key={p} className="text-xs flex gap-1.5 items-start" style={{ color: "var(--color-muted)" }}>
														<span className="shrink-0 mt-px" style={{ color: "#4ade80" }}>✓</span>
														{p}
													</li>
												))}
											</ul>
										</div>
									)}
									{cons.length > 0 && (
										<div>
											<p className="text-xs font-medium mb-1" style={{ color: "#fb923c" }}>Cons</p>
											<ul className="space-y-1">
												{cons.map((c) => (
													<li key={c} className="text-xs flex gap-1.5 items-start" style={{ color: "var(--color-muted)" }}>
														<span className="shrink-0 mt-px" style={{ color: "#fb923c" }}>✗</span>
														{c}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>
							)}

							{/* Housing stats */}
							{(hood.medianHomePrice || hood.medianRent) && (
								<div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: "1px solid oklch(22% 0 0)" }}>
									{hood.medianHomePrice ? (
										<div>
											<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median Home</p>
											<p className="text-sm font-medium">${Math.round(hood.medianHomePrice / 1000)}k</p>
										</div>
									) : null}
									{hood.medianRent ? (
										<div>
											<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median Rent</p>
											<p className="text-sm font-medium">${hood.medianRent.toLocaleString()}/mo</p>
										</div>
									) : null}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
