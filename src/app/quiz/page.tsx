"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { QUIZ_QUESTIONS, Q1_OPTIONS, Q7_OPTIONS, Q9_OPTIONS } from "@/lib/quizConfig";
import type { QuizAnswers } from "@/lib/quizConfig";
import { cn } from "@/lib/utils";

const INITIAL_ANSWERS: Partial<QuizAnswers> = {};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export default function QuizPage() {
	const router = useRouter();
	const [step, setStep] = useState<Step>(1);
	const [answers, setAnswers] = useState<Partial<QuizAnswers>>(INITIAL_ANSWERS);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const progress = (step / 11) * 100;

	function updateAnswer<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
		setAnswers((prev) => ({ ...prev, [key]: value }));
	}

	function canProceed(): boolean {
		switch (step) {
			case 1: return (answers.q1_priorities?.length ?? 0) >= 1;
			case 2: return !!answers.q2_housing;
			case 3: return !!answers.q3_climate;
			case 4: return !!answers.q4_children;
			case 5: return answers.q5_walkability !== undefined;
			case 6: return !!answers.q6_work;
			case 7: return (answers.q7_outdoors?.length ?? 0) >= 1;
			case 8: return !!answers.q8_budget;
			case 9: return !!answers.q9_vibe;
			case 10: return answers.q10_healthcare !== undefined;
			case 11: return !!answers.q11_taxes;
			default: return false;
		}
	}

	async function handleSubmit() {
		setIsSubmitting(true);
		try {
			const res = await fetch("/api/quiz", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: crypto.randomUUID(),
					answers: {
						q1_priorities: answers.q1_priorities ?? [],
						q2_housing: answers.q2_housing ?? "flexible",
						q3_climate: answers.q3_climate ?? "any",
						q4_children: answers.q4_children ?? "no",
						q5_walkability: answers.q5_walkability ?? 5,
						q6_work: answers.q6_work ?? "remote",
						q7_outdoors: answers.q7_outdoors ?? [],
						q8_budget: answers.q8_budget ?? { min: 1500, max: 4000 },
						q9_vibe: answers.q9_vibe ?? "urban",
						q10_healthcare: answers.q10_healthcare ?? 5,
						q11_taxes: answers.q11_taxes ?? "somewhat",
					},
				}),
			});

			if (res.ok) {
				const data = await res.json() as { weightsEncoded: string };
				if (typeof window !== "undefined") {
					localStorage.setItem("quiz_weights", data.weightsEncoded);
				}
				router.push(`/explore?weights=${data.weightsEncoded}`);
			} else {
				router.push("/explore");
			}
		} catch {
			router.push("/explore");
		}
	}

	return (
		<main
			className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
			style={{ background: "var(--color-background)" }}
		>
			{/* Header */}
			<div className="w-full max-w-2xl mb-8">
				<div className="flex items-center justify-between mb-4">
					<span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
						Step {step} of 11
					</span>
					<span className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
						{Math.round(progress)}%
					</span>
				</div>
				{/* Progress bar */}
				<div className="h-1.5 rounded-full w-full" style={{ background: "var(--color-border)" }}>
					<div
						className="h-full rounded-full transition-all duration-500"
						style={{ width: `${progress}%`, background: "var(--color-accent)" }}
					/>
				</div>
			</div>

			{/* Question card */}
			<div className="w-full max-w-2xl glass rounded-2xl p-8">
				<h2 className="text-xl font-bold mb-2">{QUIZ_QUESTIONS[step].title}</h2>
				<p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
					{QUIZ_QUESTIONS[step].subtitle}
				</p>

				{/* Question content */}
				{step === 1 && (
					<Q1Priorities
						selected={answers.q1_priorities ?? []}
						onChange={(v) => updateAnswer("q1_priorities", v)}
					/>
				)}
				{step === 2 && (
					<SingleCardQ
						options={[
							{ id: "buy", label: "Buy a home", icon: "🏡", desc: "Ready to put down roots" },
							{ id: "rent", label: "Rent long-term", icon: "🔑", desc: "Flexibility matters more" },
							{ id: "flexible", label: "Not sure yet", icon: "🤷", desc: "Still figuring it out" },
						]}
						selected={answers.q2_housing}
						onChange={(v) => updateAnswer("q2_housing", v as QuizAnswers["q2_housing"])}
					/>
				)}
				{step === 3 && (
					<SingleCardQ
						options={[
							{ id: "warm", label: "Warm & sunny", icon: "☀️", desc: "Hot summers, mild winters" },
							{ id: "four-seasons", label: "Four seasons", icon: "🍂", desc: "I love a snowy winter" },
							{ id: "mild", label: "Mild & temperate", icon: "🌤️", desc: "Never too hot, never too cold" },
							{ id: "any", label: "Don't care", icon: "🌍", desc: "Climate isn't a factor" },
						]}
						selected={answers.q3_climate}
						onChange={(v) => updateAnswer("q3_climate", v as QuizAnswers["q3_climate"])}
					/>
				)}
				{step === 4 && (
					<SingleCardQ
						options={[
							{ id: "have-now", label: "Yes, currently", icon: "👶", desc: "Schools & family amenities matter" },
							{ id: "planning", label: "Planning soon", icon: "💕", desc: "We're thinking about it" },
							{ id: "no", label: "No", icon: "🧑", desc: "Not a factor for me" },
						]}
						selected={answers.q4_children}
						onChange={(v) => updateAnswer("q4_children", v as QuizAnswers["q4_children"])}
					/>
				)}
				{step === 5 && (
					<WalkabilitySlider
						value={answers.q5_walkability ?? 5}
						onChange={(v) => updateAnswer("q5_walkability", v)}
					/>
				)}
				{step === 6 && (
					<SingleCardQ
						options={[
							{ id: "remote", label: "Remote / WFH", icon: "💻", desc: "Location-independent" },
							{ id: "find-local", label: "Need local job", icon: "🏢", desc: "Must find work in the area" },
							{ id: "self-employed", label: "Self-employed", icon: "🛠️", desc: "I run my own thing" },
							{ id: "retired", label: "Retired", icon: "🌴", desc: "Healthcare & lifestyle focused" },
						]}
						selected={answers.q6_work}
						onChange={(v) => updateAnswer("q6_work", v as QuizAnswers["q6_work"])}
					/>
				)}
				{step === 7 && (
					<Q7Outdoors
						selected={answers.q7_outdoors ?? []}
						onChange={(v) => updateAnswer("q7_outdoors", v)}
					/>
				)}
				{step === 8 && (
					<BudgetSlider
						value={answers.q8_budget ?? { min: 1500, max: 4000 }}
						onChange={(v) => updateAnswer("q8_budget", v)}
					/>
				)}
				{step === 9 && (
					<SingleCardQ
						options={Q9_OPTIONS.map((o) => ({ ...o }))}
						selected={answers.q9_vibe}
						onChange={(v) => updateAnswer("q9_vibe", v as QuizAnswers["q9_vibe"])}
					/>
				)}
				{step === 10 && (
					<HealthcareSlider
						value={answers.q10_healthcare ?? 5}
						onChange={(v) => updateAnswer("q10_healthcare", v)}
					/>
				)}
				{step === 11 && (
					<SingleCardQ
						options={[
							{ id: "sensitive", label: "Very sensitive", icon: "💸", desc: "No/low income tax states preferred" },
							{ id: "somewhat", label: "Somewhat", icon: "🤔", desc: "I'd like reasonable taxes" },
							{ id: "not-a-factor", label: "Not a factor", icon: "🙂", desc: "Taxes don't influence my choice" },
						]}
						selected={answers.q11_taxes}
						onChange={(v) => updateAnswer("q11_taxes", v as QuizAnswers["q11_taxes"])}
					/>
				)}
			</div>

			{/* Navigation */}
			<div className="w-full max-w-2xl mt-6 flex items-center justify-between">
				<button
					type="button"
					onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
					disabled={step === 1}
					className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-30"
					style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
				>
					<ArrowLeft size={16} /> Back
				</button>

				{step < 11 ? (
					<button
						type="button"
						onClick={() => setStep((s) => (s + 1) as Step)}
						disabled={!canProceed()}
						className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						Next <ArrowRight size={16} />
					</button>
				) : (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!canProceed() || isSubmitting}
						className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 glow-cyan"
						style={{ background: "var(--color-accent)", color: "#000" }}
					>
						{isSubmitting ? (
							<>
								<Sparkles size={16} className="animate-spin" /> Analyzing...
							</>
						) : (
							<>
								Find My Cities <Sparkles size={16} />
							</>
						)}
					</button>
				)}
			</div>
		</main>
	);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Q1Priorities({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (v: string[]) => void;
}) {
	function toggle(id: string) {
		if (selected.includes(id)) {
			onChange(selected.filter((s) => s !== id));
		} else if (selected.length < 3) {
			onChange([...selected, id]);
		}
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{Q1_OPTIONS.map((opt) => {
				const isSelected = selected.includes(opt.id);
				const rank = selected.indexOf(opt.id) + 1;
				return (
					<button
						key={opt.id}
						type="button"
						onClick={() => toggle(opt.id)}
						className={cn(
							"relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
							isSelected
								? "border-[var(--color-accent)] bg-[oklch(18%_0.04_220)]"
								: "border-[var(--color-border)] hover:border-[var(--color-muted)]",
						)}
					>
						{isSelected && (
							<span
								className="absolute top-2 right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
								style={{ background: "var(--color-accent)", color: "#000" }}
							>
								{rank}
							</span>
						)}
						<span className="text-2xl">{opt.icon}</span>
						<span className="text-xs font-medium">{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function SingleCardQ({
	options,
	selected,
	onChange,
}: {
	options: Array<{ id: string; label: string; icon: string; desc: string }>;
	selected?: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{options.map((opt) => (
				<button
					key={opt.id}
					type="button"
					onClick={() => onChange(opt.id)}
					className={cn(
						"flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
						selected === opt.id
							? "border-[var(--color-accent)] bg-[oklch(18%_0.04_220)]"
							: "border-[var(--color-border)] hover:border-[var(--color-muted)]",
					)}
				>
					<span className="text-3xl shrink-0">{opt.icon}</span>
					<div>
						<p className="text-sm font-semibold">{opt.label}</p>
						<p className="text-xs" style={{ color: "var(--color-muted)" }}>{opt.desc}</p>
					</div>
					{selected === opt.id && (
						<Check
							size={16}
							className="ml-auto shrink-0"
							style={{ color: "var(--color-accent)" }}
						/>
					)}
				</button>
			))}
		</div>
	);
}

function WalkabilitySlider({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	const labels = ["I drive everywhere", "Mostly drive", "Sometimes walk", "Prefer to walk", "Walk everywhere"];
	const labelIdx = Math.round((value / 10) * (labels.length - 1));

	return (
		<div className="space-y-6">
			<div className="text-center">
				<span className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
					{labels[labelIdx]}
				</span>
			</div>
			<input
				type="range"
				min={0}
				max={10}
				step={1}
				value={value}
				onChange={(e) => onChange(parseInt(e.target.value, 10))}
				className="w-full h-2 appearance-none cursor-pointer rounded-full"
				style={{
					background: `linear-gradient(to right, var(--color-accent) ${value * 10}%, var(--color-border) ${value * 10}%)`,
				}}
			/>
			<div className="flex justify-between text-xs" style={{ color: "var(--color-muted)" }}>
				<span>🚗 Drive</span>
				<span>🚶 Walk</span>
			</div>
		</div>
	);
}

function Q7Outdoors({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (v: string[]) => void;
}) {
	function toggle(id: string) {
		if (id === "none") {
			onChange(["none"]);
			return;
		}
		const without = selected.filter((s) => s !== "none");
		if (without.includes(id)) {
			onChange(without.filter((s) => s !== id));
		} else {
			onChange([...without, id]);
		}
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{Q7_OPTIONS.map((opt) => {
				const isSelected = selected.includes(opt.id);
				return (
					<button
						key={opt.id}
						type="button"
						onClick={() => toggle(opt.id)}
						className={cn(
							"flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
							isSelected
								? "border-[var(--color-accent)] bg-[oklch(18%_0.04_220)]"
								: "border-[var(--color-border)] hover:border-[var(--color-muted)]",
						)}
					>
						<span className="text-2xl">{opt.icon}</span>
						<span className="text-xs font-medium">{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function BudgetSlider({
	value,
	onChange,
}: {
	value: { min: number; max: number };
	onChange: (v: { min: number; max: number }) => void;
}) {
	const max = value.max;

	return (
		<div className="space-y-6">
			<div className="text-center">
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>Monthly housing budget</p>
				<p className="text-3xl font-bold mt-1" style={{ color: "var(--color-accent)" }}>
					${max.toLocaleString()}{max >= 8000 ? "+" : ""}
				</p>
			</div>
			<input
				type="range"
				min={800}
				max={8000}
				step={100}
				value={max}
				onChange={(e) => onChange({ min: 800, max: parseInt(e.target.value, 10) })}
				className="w-full h-2 appearance-none cursor-pointer rounded-full"
				style={{
					background: `linear-gradient(to right, var(--color-accent) ${((max - 800) / 7200) * 100}%, var(--color-border) ${((max - 800) / 7200) * 100}%)`,
				}}
			/>
			<div className="flex justify-between text-xs" style={{ color: "var(--color-muted)" }}>
				<span>$800/mo</span>
				<span>$8,000+/mo</span>
			</div>
		</div>
	);
}

function HealthcareSlider({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	const labels = ["Not a priority", "Low priority", "Somewhat important", "Very important", "Critical factor"];
	const labelIdx = Math.round((value / 10) * (labels.length - 1));

	return (
		<div className="space-y-6">
			<div className="text-center">
				<span className="text-lg font-semibold" style={{ color: "var(--color-accent)" }}>
					{labels[labelIdx]}
				</span>
			</div>
			<input
				type="range"
				min={0}
				max={10}
				step={1}
				value={value}
				onChange={(e) => onChange(parseInt(e.target.value, 10))}
				className="w-full h-2 appearance-none cursor-pointer rounded-full"
				style={{
					background: `linear-gradient(to right, var(--color-accent) ${value * 10}%, var(--color-border) ${value * 10}%)`,
				}}
			/>
			<div className="flex justify-between text-xs" style={{ color: "var(--color-muted)" }}>
				<span>🙂 Not a priority</span>
				<span>🏥 Critical factor</span>
			</div>
		</div>
	);
}
