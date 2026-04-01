import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";

const CITY_TIERS: Record<string, string> = {
	"major-city": "Major City", "mid-size": "Mid-Size", "small-city": "Small City", suburb: "Suburb",
};

interface Props {
	params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { token } = await params;
	const plan = await db.query.movePlans.findFirst({
		where: (p, { eq }) => eq(p.token, token),
		with: { user: { columns: { name: true } } },
	});
	if (!plan) return { title: "Move Plan Not Found" };
	const ownerName = plan.user?.name ?? "Someone";
	return {
		title: `${plan.title ?? `${ownerName}'s Move Plan`} | Where Should I Move`,
		description: `${ownerName} is weighing their relocation options. See which cities made their list.`,
	};
}

export default async function PlanPage({ params }: Props) {
	const { token } = await params;

	const plan = await db.query.movePlans.findFirst({
		where: (p, { eq }) => eq(p.token, token),
		with: { user: { columns: { name: true } } },
	});

	if (!plan) notFound();

	const cityIds: string[] = JSON.parse(plan.cityIds);
	const cities = await db.query.cities.findMany({
		where: (c, { inArray }) => inArray(c.id, cityIds),
		columns: {
			id: true, slug: true, name: true, stateId: true,
			overallScore: true, heroImageUrl: true, thumbnailUrl: true, tier: true,
		},
	});

	const cityMap = new Map(cities.map((c) => [c.id, c]));
	const orderedCities = cityIds.map((id) => cityMap.get(id)).filter(Boolean) as typeof cities;

	const ownerName = plan.user?.name ?? "Someone";
	const planTitle = plan.title ?? `${ownerName}'s Move Plan`;
	const exploreUrl = plan.quizWeightsEncoded
		? `/explore?weights=${encodeURIComponent(plan.quizWeightsEncoded)}`
		: "/explore";
	const quizUrl = plan.quizWeightsEncoded
		? `/quiz/results?weights=${encodeURIComponent(plan.quizWeightsEncoded)}`
		: "/quiz";

	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)", paddingTop: "80px" }}>
			{/* Nav */}
			<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-[var(--color-border)]">
				<Link href="/" className="font-bold text-lg tracking-tight">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</Link>
				<div className="flex items-center gap-3">
					<Link href="/explore" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Explore</Link>
					<Link href="/quiz" className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110" style={{ background: "var(--color-accent)", color: "#000" }}>
						Take the Quiz
					</Link>
				</div>
			</nav>

			{/* Header */}
			<section className="max-w-3xl mx-auto px-6 pt-12 pb-8">
				<p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--color-accent)" }}>
					Shared Move Plan
				</p>
				<h1 className="text-3xl md:text-4xl font-bold mb-2">{planTitle}</h1>
				<p className="text-base" style={{ color: "oklch(75% 0 0)" }}>
					{ownerName} is weighing {orderedCities.length} {orderedCities.length === 1 ? "city" : "cities"} for their next move.
				</p>
			</section>

			{/* City list */}
			<section className="max-w-3xl mx-auto px-6 pb-10">
				<div className="space-y-3">
					{orderedCities.map((city, i) => {
						const score = Math.round(city.overallScore ?? 50);
						const scoreColor = score >= 70 ? "#00d4ff" : score >= 50 ? "#f59e0b" : "#f87171";
						return (
							<Link
								key={city.id}
								href={`/city/${city.slug}`}
								className="group flex items-center gap-4 glass rounded-2xl p-4 hover:border-[var(--color-accent)] transition-colors"
							>
								{/* Rank */}
								<div
									className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
									style={{
										background: i === 0 ? "var(--color-accent)" : "oklch(20% 0.04 220)",
										color: i === 0 ? "#000" : "oklch(80% 0 0)",
									}}
								>
									{i + 1}
								</div>

								{/* Thumbnail */}
								{city.heroImageUrl ? (
									<div
										className="w-14 h-14 shrink-0 rounded-xl overflow-hidden"
										style={{ background: `url(${city.thumbnailUrl ?? city.heroImageUrl}) center/cover no-repeat` }}
									/>
								) : (
									<div className="w-14 h-14 shrink-0 rounded-xl" style={{ background: "oklch(18% 0.04 220)" }} />
								)}

								{/* Info */}
								<div className="flex-1 min-w-0">
									<p className="font-semibold truncate">{city.name}</p>
									<p className="text-sm" style={{ color: "var(--color-muted)" }}>
										{city.stateId} · {CITY_TIERS[city.tier] ?? city.tier}
									</p>
								</div>

								{/* Score */}
								<div
									className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2"
									style={{ borderColor: scoreColor, color: scoreColor }}
								>
									{score}
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			{/* CTA section */}
			<section className="max-w-3xl mx-auto px-6 pb-20 grid sm:grid-cols-2 gap-4">
				<Link
					href={quizUrl}
					className="rounded-2xl p-6 flex flex-col gap-2 transition-all hover:border-[var(--color-accent)]"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<span className="text-2xl">🤖</span>
					<p className="font-bold">Find your own top cities</p>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>
						Take the 2-minute quiz and get a personalized ranked list.
					</p>
					<span className="text-sm font-semibold mt-1" style={{ color: "var(--color-accent)" }}>Take the quiz →</span>
				</Link>
				<Link
					href={exploreUrl}
					className="rounded-2xl p-6 flex flex-col gap-2 transition-all hover:border-[var(--color-accent)]"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<span className="text-2xl">🔍</span>
					<p className="font-bold">Explore 2,700+ cities</p>
					<p className="text-sm" style={{ color: "var(--color-muted)" }}>
						Filter by cost, climate, jobs, walkability, and more.
					</p>
					<span className="text-sm font-semibold mt-1" style={{ color: "var(--color-accent)" }}>Open Explore →</span>
				</Link>
			</section>
		</main>
	);
}
