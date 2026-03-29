import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Sparkles, ArrowLeft } from "lucide-react";
import { UpgradeButton } from "@/components/shared/UpgradeButton";

export const metadata: Metadata = {
	title: "Upgrade to Premium",
	description: "Unlock the full Where Should I Move experience — PDF reports, Surprise Me AI, and more.",
};

const FREE_FEATURES = [
	{ label: "Explore 1,000+ US cities", included: true },
	{ label: "AI quiz + personalized rankings", included: true },
	{ label: "55+ search filters", included: true },
	{ label: "City deep-dive pages", included: true },
	{ label: "Side-by-side comparison (up to 4 cities)", included: true },
	{ label: "Save up to 5 cities", included: true },
	{ label: "Interactive map with heatmaps", included: true },
	{ label: "Surprise Me AI recommendations", included: false },
	{ label: "Unlimited saved cities", included: false },
	{ label: "PDF city reports", included: false },
	{ label: "Shareable move plan", included: false },
];

const PREMIUM_FEATURES = [
	{ label: "Everything in Free", included: true },
	{ label: "Unlimited saved cities", included: true },
	{ label: "Surprise Me AI recommendations", included: true },
	{ label: "PDF city reports (export any city)", included: true },
	{ label: "Shareable move plan link", included: true },
	{ label: "Priority data refreshes", included: true },
	{ label: "Early access to new features", included: true },
];

export default function UpgradePage() {
	return (
		<main className="min-h-screen" style={{ background: "var(--color-background)" }}>
			<div className="max-w-4xl mx-auto px-6 py-12">
				{/* Back */}
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-2 text-sm mb-8"
					style={{ color: "var(--color-muted)" }}
				>
					<ArrowLeft size={14} /> Back to dashboard
				</Link>

				{/* Header */}
				<div className="text-center mb-12">
					<div
						className="inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full mb-4"
						style={{ background: "oklch(18% 0.06 200)", color: "var(--color-accent)" }}
					>
						<Sparkles size={13} /> Where Should I Move Premium
					</div>
					<h1 className="text-4xl font-bold mb-3">
						Find your city,{" "}
						<span style={{ color: "var(--color-accent)" }}>without limits</span>
					</h1>
					<p className="text-lg" style={{ color: "var(--color-muted)" }}>
						Unlock the full relocation research experience. Cancel anytime.
					</p>
				</div>

				{/* Pricing cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
					{/* Free */}
					<div className="glass rounded-2xl p-8">
						<div className="mb-6">
							<p className="text-sm font-medium mb-1" style={{ color: "var(--color-muted)" }}>Free</p>
							<p className="text-4xl font-bold">$0</p>
							<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>forever</p>
						</div>
						<ul className="space-y-3 mb-8">
							{FREE_FEATURES.map((f) => (
								<li key={f.label} className="flex items-start gap-3 text-sm">
									{f.included
										? <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
										: <X size={15} className="shrink-0 mt-0.5" style={{ color: "var(--color-muted)" }} />}
									<span style={{ color: f.included ? "var(--color-foreground)" : "var(--color-muted)" }}>
										{f.label}
									</span>
								</li>
							))}
						</ul>
						<Link
							href="/explore"
							className="w-full flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:border-[var(--color-accent)]"
							style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
						>
							Start exploring for free
						</Link>
					</div>

					{/* Premium */}
					<div
						className="rounded-2xl p-8 relative overflow-hidden"
						style={{ background: "oklch(14% 0.06 220)", border: "1px solid var(--color-accent)" }}
					>
						{/* Glow */}
						<div
							className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
							style={{ background: "var(--color-accent)" }}
						/>

						<div className="relative mb-6">
							<p className="text-sm font-medium mb-1" style={{ color: "var(--color-accent)" }}>Premium</p>
							<div className="flex items-baseline gap-2">
								<p className="text-4xl font-bold">$9</p>
								<p className="text-sm" style={{ color: "var(--color-muted)" }}>/month</p>
							</div>
							<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
								or{" "}
								<span className="font-medium" style={{ color: "var(--color-foreground)" }}>$79/year</span>
								{" "}
								<span style={{ color: "var(--color-accent)" }}>— save $29</span>
							</p>
						</div>

						<ul className="relative space-y-3 mb-8">
							{PREMIUM_FEATURES.map((f) => (
								<li key={f.label} className="flex items-start gap-3 text-sm">
									<Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
									<span>{f.label}</span>
								</li>
							))}
						</ul>

						<div className="relative flex flex-col gap-3">
							<UpgradeButton interval="monthly" label="Get Premium — $9/mo" className="w-full justify-center" />
							<UpgradeButton interval="yearly" label="Get Premium — $79/yr (best value)" className="w-full justify-center" />
						</div>
					</div>
				</div>

				{/* FAQ */}
				<div className="max-w-xl mx-auto space-y-6">
					<h2 className="text-center font-bold text-lg">Frequently Asked Questions</h2>
					{[
						{
							q: "Can I cancel anytime?",
							a: "Yes. Cancel from your Dashboard → Manage Billing at any time. You keep Premium access until the end of your billing period.",
						},
						{
							q: "What payment methods do you accept?",
							a: "All major credit/debit cards via Stripe. Apple Pay and Google Pay where available.",
						},
						{
							q: "Is there a free trial?",
							a: "The free tier is generous and has no time limit. Premium features are gated but the core search, quiz, and comparison tool are always free.",
						},
						{
							q: "What are 'Surprise Me AI' recommendations?",
							a: "An AI-powered feature that analyzes your quiz preferences and surfaces 5 hidden-gem cities you wouldn't normally think to search for — with personalized reasoning from xAI Grok.",
						},
					].map((item) => (
						<div key={item.q}>
							<p className="font-semibold mb-1 text-sm">{item.q}</p>
							<p className="text-sm" style={{ color: "var(--color-muted)" }}>{item.a}</p>
						</div>
					))}
				</div>
			</div>
		</main>
	);
}
