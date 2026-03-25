"use client";

import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
	score: number;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const CIRCUMFERENCE = 2 * Math.PI * 40; // r=40

export function MatchScoreBadge({ score, size = "md", className }: MatchScoreBadgeProps) {
	const clamped = Math.min(100, Math.max(0, score));
	const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

	const sizeMap = {
		sm: { outer: 56, r: 22, sw: 3, fontSize: "text-xs" },
		md: { outer: 80, r: 32, sw: 4, fontSize: "text-sm font-semibold" },
		lg: { outer: 96, r: 40, sw: 5, fontSize: "text-base font-bold" },
	};

	const { outer, r, sw, fontSize } = sizeMap[size];
	const cx = outer / 2;
	const circ = 2 * Math.PI * r;
	const offset = circ * (1 - clamped / 100);

	return (
		<div
			className={cn("relative inline-flex items-center justify-center shrink-0", className)}
			style={{ width: outer, height: outer }}
		>
			<svg width={outer} height={outer} className="-rotate-90" viewBox={`0 0 ${outer} ${outer}`}>
				{/* Track */}
				<circle
					cx={cx}
					cy={cx}
					r={r}
					fill="none"
					stroke="oklch(28% 0 0)"
					strokeWidth={sw}
				/>
				{/* Fill */}
				<circle
					cx={cx}
					cy={cx}
					r={r}
					fill="none"
					stroke="url(#cyanGrad)"
					strokeWidth={sw}
					strokeLinecap="round"
					strokeDasharray={circ}
					strokeDashoffset={offset}
					style={{ transition: "stroke-dashoffset 0.6s ease" }}
				/>
				<defs>
					<linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#00d4ff" />
						<stop offset="100%" stopColor="#0088cc" />
					</linearGradient>
				</defs>
			</svg>
			<span className={cn("absolute text-[var(--color-foreground)]", fontSize)}>
				{clamped}
			</span>
		</div>
	);
}
