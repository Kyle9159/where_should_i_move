"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	context?: string; // e.g. "city page" or "explore"
}

interface State {
	hasError: boolean;
	errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, errorMessage: "" };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, errorMessage: error.message };
	}

	componentDidCatch(error: Error) {
		console.error(`[ErrorBoundary:${this.props.context ?? "unknown"}]`, error);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div
					className="flex flex-col items-center justify-center min-h-[40vh] gap-5 px-6 text-center"
					style={{ background: "var(--color-background)" }}
				>
					<span className="text-4xl">⚠️</span>
					<div>
						<h2 className="font-bold text-lg mb-1">Something went wrong</h2>
						<p className="text-sm" style={{ color: "var(--color-muted)" }}>
							{this.props.context
								? `An error occurred while loading the ${this.props.context}.`
								: "An unexpected error occurred."}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => this.setState({ hasError: false, errorMessage: "" })}
							className="text-sm px-4 py-2 rounded-xl font-medium"
							style={{ background: "var(--color-accent)", color: "#000" }}
						>
							Try again
						</button>
						<Link href="/" className="text-sm" style={{ color: "var(--color-muted)" }}>
							Go home
						</Link>
					</div>
					{process.env.NODE_ENV === "development" && this.state.errorMessage && (
						<code className="text-xs mt-2 px-3 py-2 rounded-lg max-w-lg text-left overflow-auto"
							style={{ background: "var(--color-surface)", color: "#f87171" }}>
							{this.state.errorMessage}
						</code>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
