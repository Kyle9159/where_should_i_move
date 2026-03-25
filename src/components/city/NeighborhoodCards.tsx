/**
 * Neighborhood cards for the city detail page.
 * Since neighborhood data is sparse (seed doesn't populate it yet),
 * this component gracefully handles empty state and shows a placeholder
 * grid when no data is present.
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
					const vibes: string[] = hood.vibeKeywords
						? (JSON.parse(hood.vibeKeywords) as string[])
						: [];

					return (
						<div key={hood.id} className="glass rounded-2xl p-5">
							<div className="flex items-start justify-between gap-2 mb-3">
								<h3 className="font-semibold">{hood.name}</h3>
								{hood.walkScore && (
									<span
										className="text-xs px-2 py-0.5 rounded-full shrink-0"
										style={{ background: "oklch(18% 0.04 220)", color: "var(--color-accent)" }}
									>
										Walk {hood.walkScore}
									</span>
								)}
							</div>

							{hood.description && (
								<p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--color-muted)" }}>
									{hood.description}
								</p>
							)}

							{/* Stats */}
							<div className="grid grid-cols-2 gap-2 mb-3">
								{hood.medianHomePrice && (
									<div>
										<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median Home</p>
										<p className="text-sm font-medium">${Math.round(hood.medianHomePrice / 1000)}k</p>
									</div>
								)}
								{hood.medianRent && (
									<div>
										<p className="text-xs" style={{ color: "var(--color-muted)" }}>Median Rent</p>
										<p className="text-sm font-medium">${hood.medianRent}/mo</p>
									</div>
								)}
							</div>

							{/* Vibe tags */}
							{vibes.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{vibes.map((vibe) => (
										<span
											key={vibe}
											className={`text-xs px-2 py-0.5 rounded-full ${VIBE_COLORS[vibe] ?? "bg-gray-800/40 text-gray-400"}`}
										>
											{vibe}
										</span>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
