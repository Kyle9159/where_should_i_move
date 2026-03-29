"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			setSent(true);
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-background)" }}>
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link href="/" className="text-xl font-bold">
						<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
					</Link>
				</div>

				<div className="glass rounded-2xl p-6 space-y-5">
					{sent ? (
						<div className="text-center space-y-4 py-4">
							<div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "oklch(18% 0.04 220)" }}>
								<Mail size={20} style={{ color: "var(--color-accent)" }} />
							</div>
							<h2 className="font-bold text-lg">Check your inbox</h2>
							<p className="text-sm" style={{ color: "var(--color-muted)" }}>
								If an account exists for <strong>{email}</strong>, we sent a password reset link. Check spam if you don't see it.
							</p>
							<Link href="/auth/signin" className="text-sm" style={{ color: "var(--color-accent)" }}>
								Back to sign in
							</Link>
						</div>
					) : (
						<>
							<div>
								<h2 className="font-bold text-lg">Reset your password</h2>
								<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
									Enter your email and we'll send a reset link.
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<input
									type="email"
									className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1"
									style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
									placeholder="you@email.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoFocus
								/>

								{error && (
									<p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
										{error}
									</p>
								)}

								<button
									type="submit"
									disabled={loading}
									className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
									style={{ background: "var(--color-accent)", color: "#000" }}
								>
									{loading ? "Sending…" : "Send reset link"}
								</button>
							</form>

							<Link
								href="/auth/signin"
								className="flex items-center gap-1.5 text-xs"
								style={{ color: "var(--color-muted)" }}
							>
								<ArrowLeft size={12} /> Back to sign in
							</Link>
						</>
					)}
				</div>
			</div>
		</main>
	);
}
