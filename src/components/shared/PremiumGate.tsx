"use client";

import { useSession } from "next-auth/react";
import { Lock, Sparkles } from "lucide-react";
import { UpgradeButton } from "./UpgradeButton";

interface Props {
	children: React.ReactNode;
	feature?: string;
}

export function PremiumGate({ children, feature = "this feature" }: Props) {
	const { data: session, status } = useSession();

	if (status === "loading") return null;

	if (session?.user?.tier === "premium") {
		return <>{children}</>;
	}

	return (
		<div className="glass rounded-2xl p-8 flex flex-col items-center text-center gap-4">
			<div
				className="w-12 h-12 rounded-full flex items-center justify-center"
				style={{ background: "oklch(18% 0.04 220)" }}
			>
				<Lock size={18} style={{ color: "var(--color-accent)" }} />
			</div>
			<div>
				<p className="font-semibold mb-1">Premium Feature</p>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>
					Unlock {feature} with Where Should I Move Premium.
				</p>
			</div>
			<UpgradeButton />
		</div>
	);
}

// Small inline version for use in cards/headers
export function PremiumBadge() {
	return (
		<span
			className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
			style={{ background: "oklch(18% 0.08 55)", color: "oklch(75% 0.12 55)" }}
		>
			<Sparkles size={10} />
			Premium
		</span>
	);
}
