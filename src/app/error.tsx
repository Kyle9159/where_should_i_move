"use client";

import { useEffect } from "react";
import Link from "next/link";

// Root-level error boundary — catches unhandled errors anywhere in the app
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[GlobalError]", error);
	}, [error]);

	return (
		<html lang="en">
			<body style={{ background: "#0a0a0a", color: "#e0e0e0", fontFamily: "sans-serif", margin: 0 }}>
				<main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
					<span style={{ fontSize: "3rem" }}>⚡</span>
					<div>
						<h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
							Something went wrong
						</h1>
						<p style={{ color: "#888", fontSize: "0.9rem" }}>
							An unexpected error occurred. Our team has been notified.
						</p>
						{error.digest && (
							<p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.5rem" }}>
								Error ID: {error.digest}
							</p>
						)}
					</div>
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={reset}
							style={{ background: "#00d4ff", color: "#000", border: "none", padding: "0.6rem 1.5rem", borderRadius: "0.75rem", fontWeight: 600, cursor: "pointer" }}
						>
							Try again
						</button>
						<Link
							href="/"
							style={{ color: "#888", textDecoration: "none", display: "flex", alignItems: "center", fontSize: "0.875rem" }}
						>
							Go home
						</Link>
					</div>
				</main>
			</body>
		</html>
	);
}
