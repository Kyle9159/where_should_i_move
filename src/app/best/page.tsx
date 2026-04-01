import Link from "next/link";
import type { Metadata } from "next";
import { AuthNav } from "@/components/layout/AuthNav";
import { PERSONAS } from "./personas";

export const metadata: Metadata = {
	title: "Best Cities For Every Lifestyle | Where Should I Move",
	description: "Find the best US cities for remote workers, retirees, outdoor lovers, families, young professionals, and more.",
};

export default function BestPage() {
	return (
		<main className="min-h-screen" style={{ paddingTop: "80px" }}>
			<nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-[var(--color-border)]">
				<Link href="/" className="font-bold text-lg tracking-tight">
					<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
				</Link>
				<div className="flex items-center gap-3">
					<Link href="/explore" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Explore</Link>
					<Link href="/map" className="text-sm transition-colors hover:text-white hidden sm:inline" style={{ color: "var(--color-muted)" }}>Map</Link>
					<Link href="/best" className="text-sm transition-colors text-white hidden sm:inline font-medium">Best Cities</Link>
					<AuthNav />
					<Link href="/quiz" className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110" style={{ background: "var(--color-accent)", color: "#000" }}>
						Take Quiz
					</Link>
				</div>
			</nav>
			{/* Hero */}
			<section className="px-6 py-16 text-center max-w-3xl mx-auto">
				<p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>
					Curated Collections
				</p>
				<h1 className="text-4xl md:text-5xl font-bold mb-4">Best Cities For Every Lifestyle</h1>
				<p className="text-lg" style={{ color: "var(--color-muted)" }}>
					Ranked by what matters most for each type of move — not a one-size-fits-all score.
				</p>
			</section>

			{/* Persona grid */}
			<section className="max-w-6xl mx-auto px-6 pb-20">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
					{PERSONAS.map((persona) => (
						<Link
							key={persona.slug}
							href={`/best/${persona.slug}`}
							className="group glass rounded-2xl p-6 flex flex-col gap-3 hover:border-[var(--color-accent)] transition-colors cursor-pointer"
						>
							<span className="text-4xl">{persona.emoji}</span>
							<div>
								<h2 className="font-bold text-lg leading-tight">{persona.title}</h2>
								<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
									{persona.subtitle}
								</p>
							</div>
							<p className="text-sm flex-1" style={{ color: "oklch(75% 0 0)" }}>
								{persona.description}
							</p>
							<span
								className="text-sm font-semibold mt-auto group-hover:underline"
								style={{ color: "var(--color-accent)" }}
							>
								See top cities →
							</span>
						</Link>
					))}
				</div>

				{/* CTA */}
				<div
					className="mt-14 rounded-2xl p-8 text-center"
					style={{ background: "oklch(16% 0.04 220)", border: "1px solid oklch(25% 0.05 220)" }}
				>
					<p className="text-xl font-bold mb-2">Not sure which fits you?</p>
					<p className="mb-6" style={{ color: "var(--color-muted)" }}>
						Take our 11-question quiz and get a fully personalized ranking of all 2,700+ cities.
					</p>
					<Link
						href="/quiz"
						className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Take the AI Quiz →
					</Link>
				</div>
			</section>
		</main>
	);
}
