"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Suspense } from "react";

function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const result = await signIn("credentials", {
			email,
			password,
			mode,
			redirect: false,
		});

		setLoading(false);

		if (result?.error) {
			setError(mode === "signup"
				? "Email already in use or invalid input."
				: "Invalid email or password.");
		} else {
			router.push(callbackUrl);
		}
	}

	return (
		<main
			className="min-h-screen flex items-center justify-center px-6"
			style={{ background: "var(--color-background)" }}
		>
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link href="/" className="text-xl font-bold">
						<span style={{ color: "var(--color-accent)" }}>Next</span>Home USA
					</Link>
					<p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
						{mode === "signin" ? "Sign in to your account" : "Create a free account"}
					</p>
				</div>

				<div className="glass rounded-2xl p-6">
					{/* Mode toggle */}
					<div className="flex rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--color-border)" }}>
						{(["signin", "signup"] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => { setMode(m); setError(null); }}
								className="flex-1 py-2 text-sm font-medium transition-colors"
								style={mode === m
									? { background: "var(--color-accent)", color: "#000" }
									: { color: "var(--color-muted)" }
								}
							>
								{m === "signin" ? "Sign In" : "Sign Up"}
							</button>
						))}
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="text-xs mb-1 block" style={{ color: "var(--color-muted)" }}>Email</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="you@email.com"
								className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:border-[var(--color-accent)] transition-colors"
								style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
							/>
						</div>

						<div>
							<label className="text-xs mb-1 block" style={{ color: "var(--color-muted)" }}>Password</label>
							<div className="relative">
								<input
									type={showPass ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
									placeholder="••••••••"
									className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:border-[var(--color-accent)] transition-colors pr-10"
									style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
								/>
								<button
									type="button"
									onClick={() => setShowPass((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2"
									style={{ color: "var(--color-muted)" }}
								>
									{showPass ? <EyeOff size={14} /> : <Eye size={14} />}
								</button>
							</div>
							{mode === "signup" && (
								<p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Minimum 8 characters</p>
							)}
						</div>

						{error && (
							<p className="text-xs" style={{ color: "oklch(65% 0.15 30)" }}>{error}</p>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
							style={{ background: "var(--color-accent)", color: "#000" }}
						>
							{loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
						</button>
					</form>

					{mode === "signin" && (
						<div className="text-center">
							<Link href="/auth/forgot-password" className="text-xs" style={{ color: "var(--color-muted)" }}>
								Forgot your password?
							</Link>
						</div>
					)}
					<div className="mt-4 pt-4 text-center text-xs" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
						<Sparkles size={10} className="inline mr-1" style={{ color: "var(--color-accent)" }} />
						Free account · Save cities · Compare · Get AI recommendations
					</div>
				</div>
			</div>
		</main>
	);
}

export default function SignInPage() {
	return (
		<Suspense>
			<SignInForm />
		</Suspense>
	);
}
