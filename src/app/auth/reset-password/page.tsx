"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

function ResetForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token") ?? "";

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!token) {
		return (
			<p className="text-sm text-center" style={{ color: "#f87171" }}>
				Invalid reset link. <Link href="/auth/forgot-password" style={{ color: "var(--color-accent)" }}>Request a new one</Link>.
			</p>
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (password !== confirm) { setError("Passwords don't match"); return; }
		if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

		setLoading(true);
		try {
			const res = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});
			const data = await res.json();
			if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
			setDone(true);
			setTimeout(() => router.push("/auth/signin"), 2500);
		} finally {
			setLoading(false);
		}
	}

	if (done) {
		return (
			<div className="text-center space-y-3 py-4">
				<CheckCircle size={40} className="mx-auto" style={{ color: "var(--color-accent)" }} />
				<p className="font-semibold">Password updated!</p>
				<p className="text-sm" style={{ color: "var(--color-muted)" }}>Redirecting to sign in…</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<h2 className="font-bold text-lg">Set a new password</h2>
				<p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Choose a strong password — at least 8 characters.</p>
			</div>

			<div className="relative">
				<input
					type={showPass ? "text" : "password"}
					className="w-full rounded-xl px-4 py-2.5 text-sm pr-10 outline-none focus:ring-1"
					style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
					placeholder="New password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={8}
					autoFocus
				/>
				<button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }}>
					{showPass ? <EyeOff size={14} /> : <Eye size={14} />}
				</button>
			</div>

			<input
				type="password"
				className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1"
				style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
				placeholder="Confirm new password"
				value={confirm}
				onChange={(e) => setConfirm(e.target.value)}
				required
			/>

			{error && (
				<p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</p>
			)}

			<button
				type="submit"
				disabled={loading}
				className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
				style={{ background: "var(--color-accent)", color: "#000" }}
			>
				{loading ? "Updating…" : "Update password"}
			</button>
		</form>
	);
}

export default function ResetPasswordPage() {
	return (
		<main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-background)" }}>
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link href="/" className="text-xl font-bold">
						<span style={{ color: "var(--color-accent)" }}>Where</span>ShouldIMove
					</Link>
				</div>
				<div className="glass rounded-2xl p-6">
					<Suspense fallback={<p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>Loading…</p>}>
						<ResetForm />
					</Suspense>
				</div>
			</div>
		</main>
	);
}
