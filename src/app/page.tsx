import Link from "next/link";
import { ArrowRight, Map, BarChart3, Sparkles, Shield, TreePine, DollarSign } from "lucide-react";
import { db } from "@/db";
import { AuthNav } from "@/components/layout/AuthNav";

async function getHeroCities() {
	return db.query.cities.findMany({
		orderBy: (c, { desc }) => [desc(c.overallScore)],
		limit: 8,
	});
}

const FEATURES = [
	{ icon: BarChart3, title: "55+ Smart Filters", desc: "School ratings, wildfire risk, craft beer density, EV chargers — filter by what actually matters to you." },
	{ icon: Sparkles, title: "AI-Powered Quiz", desc: "8 questions. Our AI maps your answers to a personalized weight system that ranks cities by your Match %." },
	{ icon: Map, title: "Interactive Map", desc: "Heatmap overlays for jobs, crime, housing costs, and air quality — click any city to deep-dive." },
	{ icon: Shield, title: "Real Data", desc: "Census, BLS, FBI, NOAA, EPA, GreatSchools — authoritative sources with freshness timestamps." },
	{ icon: TreePine, title: "City Deep-Dives", desc: "Every city gets a full report: neighborhood breakdowns, climate charts, school ratings, cost comparisons." },
	{ icon: DollarSign, title: "Side-by-Side Compare", desc: "Stack up to 4 cities head-to-head across every dimension — pick your winner with confidence." },
];

const STATS = [
	{ emoji: "🏙️", label: "2,700+ cities", sublabel: "analyzed & scored" },
	{ emoji: "📊", label: "55 filters", sublabel: "across 5 categories" },
	{ emoji: "🤖", label: "AI-ranked", sublabel: "personalized Match %" },
	{ emoji: "🔒", label: "Free forever", sublabel: "premium tier coming" },
];

export default async function LandingPage() {
	const heroCities = await getHeroCities();

	return (
		<main className="flex flex-col min-h-screen">
			{/* Nav */}
			<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-[var(--color-border)]">
				<span className="font-bold text-lg tracking-tight">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</span>
				<div className="flex items-center gap-3">
					<Link href="/explore" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>
						Explore
					</Link>
					<Link href="/map" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>
						Map
					</Link>
					<Link href="/surprise" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>
						Surprise Me
					</Link>
					<AuthNav />
					<Link
						href="/quiz"
						className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Take Quiz
					</Link>
				</div>
			</nav>

			{/* Hero */}
			<section className="relative flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
				<div
					className="pointer-events-none absolute inset-0 -z-10"
					style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(22% 0.06 220 / 0.6) 0%, transparent 70%)" }}
				/>

				<div
					className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border"
					style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
				>
					<Sparkles size={12} style={{ color: "var(--color-accent)" }} />
					AI-powered relocation research
				</div>

				<h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
					Find where you{" "}
					<span style={{ color: "var(--color-accent)" }}>actually belong</span>
				</h1>

				<p className="mt-5 text-lg max-w-xl leading-relaxed" style={{ color: "var(--color-muted)" }}>
					Overwhelmed by &ldquo;where should I move?&rdquo; We rank every American city by
					what matters to <em>you</em> — 55+ filters, real data, zero guesswork.
				</p>

				<div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
					<Link
						href="/quiz"
						className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 glow-cyan"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Take the 2-min Quiz <ArrowRight size={16} />
					</Link>
					<Link
						href="/explore"
						className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm transition-colors hover:border-[var(--color-accent)] border"
						style={{ borderColor: "var(--color-border)" }}
					>
						Start Exploring
					</Link>
				</div>

				{/* Stats strip */}
				<div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
					{STATS.map((s) => (
						<div key={s.label} className="glass rounded-xl p-4 flex flex-col items-center gap-1">
							<span className="text-2xl">{s.emoji}</span>
							<span className="text-sm font-semibold">{s.label}</span>
							<span className="text-xs" style={{ color: "var(--color-muted)" }}>{s.sublabel}</span>
						</div>
					))}
				</div>
			</section>

			{/* City strip */}
			<section className="px-6 pb-16 max-w-5xl mx-auto w-full">
				<p className="text-xs text-center mb-4 tracking-widest uppercase" style={{ color: "var(--color-muted)" }}>
					Top-scoring cities
				</p>
				<div className="flex gap-3 overflow-x-auto pb-2">
					{heroCities.map((city) => (
						<Link
							key={city.id}
							href={`/city/${city.slug}`}
							className="group glass rounded-2xl overflow-hidden shrink-0 w-44 transition-colors hover:border-[var(--color-accent)]"
						>
							<div className="h-24 flex items-end p-3" style={{ background: "linear-gradient(135deg, oklch(20% 0.04 220), oklch(14% 0.02 180))" }}>
								<div>
									<p className="text-sm font-semibold leading-tight">{city.name}</p>
									<p className="text-xs" style={{ color: "var(--color-muted)" }}>{city.stateId}</p>
								</div>
							</div>
							<div className="p-3 flex items-center justify-between">
								<span className="text-xs" style={{ color: "var(--color-muted)" }}>Score</span>
								<span className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
									{Math.round(city.overallScore ?? 50)}
								</span>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* Features */}
			<section className="px-6 pb-20 max-w-5xl mx-auto w-full">
				<h2 className="text-2xl font-bold text-center mb-10">Everything you need to make the move</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{FEATURES.map((f) => (
						<div key={f.title} className="glass rounded-2xl p-5 flex flex-col gap-3">
							<div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "oklch(20% 0.04 220)" }}>
								<f.icon size={18} style={{ color: "var(--color-accent)" }} />
							</div>
							<h3 className="font-semibold text-sm">{f.title}</h3>
							<p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>{f.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA Banner */}
			<div className="px-6 mb-16 max-w-2xl mx-auto w-full">
				<div className="glass rounded-2xl p-8 text-center">
					<h2 className="text-xl font-bold mb-2">Ready to find your next home?</h2>
					<p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
						Take the quiz and get personalized city rankings in under 2 minutes.
					</p>
					<Link
						href="/quiz"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Get My City Rankings <ArrowRight size={16} />
					</Link>
				</div>
			</div>

			{/* Footer */}
			<footer className="mt-auto px-6 py-6 text-center text-xs border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
				Where Should I Move · Data: Census, BLS, FBI, NOAA, GreatSchools &amp; more.
			</footer>
		</main>
	);
}
