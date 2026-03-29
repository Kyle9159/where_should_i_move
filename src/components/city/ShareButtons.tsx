"use client";

import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";

interface Props {
	cityName: string;
	stateId: string;
	slug: string;
	score?: number;
}

export function ShareButtons({ cityName, stateId, slug, score }: Props) {
	const [copied, setCopied] = useState(false);
	const [open, setOpen] = useState(false);

	const url = typeof window !== "undefined"
		? `${window.location.origin}/city/${slug}`
		: `https://whereshouldimove.us/city/${slug}`;

	const text = `Checking out ${cityName}, ${stateId}${score ? ` (score: ${score}/100)` : ""} on Where Should I Move — the AI relocation research platform 🏠`;

	function copyLink() {
		navigator.clipboard.writeText(url).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	function shareTwitter() {
		window.open(
			`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
			"_blank", "noopener,noreferrer",
		);
	}

	function shareFacebook() {
		window.open(
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
			"_blank", "noopener,noreferrer",
		);
	}

	// Use native share API on mobile if available
	async function handleNativeShare() {
		if (navigator.share) {
			try {
				await navigator.share({ title: `${cityName}, ${stateId} — Where Should I Move`, text, url });
				return;
			} catch {
				// User cancelled or not supported — fall through to popover
			}
		}
		setOpen(!open);
	}

	return (
		<div className="relative">
			<button
				type="button"
				onClick={handleNativeShare}
				className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors hover:border-[var(--color-accent)]"
				style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
				title="Share this city"
			>
				<Share2 size={12} /> Share
			</button>

			{open && (
				<>
					{/* Backdrop */}
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					{/* Popover */}
					<div
						className="absolute right-0 top-full mt-2 z-50 rounded-xl p-3 space-y-1 min-w-[160px]"
						style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
					>
						<button type="button" onClick={() => { copyLink(); setOpen(false); }}
							className="flex items-center gap-2 w-full text-xs px-3 py-2 rounded-lg transition-colors hover:bg-[var(--color-surface-2)] text-left">
							{copied ? <Check size={12} style={{ color: "#4ade80" }} /> : <Link2 size={12} />}
							{copied ? "Copied!" : "Copy link"}
						</button>
						<button type="button" onClick={shareTwitter}
							className="flex items-center gap-2 w-full text-xs px-3 py-2 rounded-lg transition-colors hover:bg-[var(--color-surface-2)] text-left">
							𝕏 Share on X
						</button>
						<button type="button" onClick={shareFacebook}
							className="flex items-center gap-2 w-full text-xs px-3 py-2 rounded-lg transition-colors hover:bg-[var(--color-surface-2)] text-left">
							ƒ Share on Facebook
						</button>
					</div>
				</>
			)}
		</div>
	);
}
