import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Rate-limiting middleware using Upstash Redis (via Vercel KV).
 *
 * When KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel KV / Upstash),
 * enforces per-IP sliding window rate limits.
 * When not set, skips rate limiting gracefully (dev + environments without KV).
 *
 * Limits:
 *   /api/auth/*          → 10 req / minute  (brute-force protection)
 *   /api/export/*        → 5  req / minute  (PDF generation is expensive)
 *   /api/*               → 120 req / minute (general API)
 */

// ── Limits config ────────────────────────────────────────────────────────────

interface Limit {
	requests: number;
	windowSeconds: number;
}

function matchLimit(pathname: string): Limit {
	if (pathname.startsWith("/api/auth/")) return { requests: 10, windowSeconds: 60 };
	if (pathname.startsWith("/api/export/")) return { requests: 5, windowSeconds: 60 };
	if (pathname.startsWith("/api/cron/")) return { requests: 1, windowSeconds: 60 };
	if (pathname.startsWith("/api/")) return { requests: 120, windowSeconds: 60 };
	return { requests: 500, windowSeconds: 60 };
}

// ── IP extraction ────────────────────────────────────────────────────────────

function getIp(req: NextRequest): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		"127.0.0.1"
	);
}

// ── Sliding window check via Upstash Redis ────────────────────────────────────

async function checkRateLimit(
	ip: string,
	pathname: string,
): Promise<{ limited: boolean; remaining: number; reset: number }> {
	const url = process.env.KV_REST_API_URL;
	const token = process.env.KV_REST_API_TOKEN;
	if (!url || !token) return { limited: false, remaining: 999, reset: 0 };

	const { requests, windowSeconds } = matchLimit(pathname);
	const key = `rl:${pathname.split("/").slice(0, 4).join("/")}:${ip}`;
	const now = Math.floor(Date.now() / 1000);
	const window = Math.floor(now / windowSeconds);
	const redisKey = `${key}:${window}`;

	try {
		// INCR + EXPIRE in one pipeline
		const res = await fetch(`${url}/pipeline`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify([
				["INCR", redisKey],
				["EXPIRE", redisKey, windowSeconds],
			]),
		});

		if (!res.ok) return { limited: false, remaining: 999, reset: 0 };

		const data = (await res.json()) as [{ result: number }, unknown];
		const count = data[0]?.result ?? 0;
		const remaining = Math.max(0, requests - count);
		const reset = (window + 1) * windowSeconds;

		return { limited: count > requests, remaining, reset };
	} catch {
		// Redis unavailable — fail open
		return { limited: false, remaining: 999, reset: 0 };
	}
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Only rate-limit API routes
	if (!pathname.startsWith("/api/")) return NextResponse.next();

	// Cron routes: verify secret instead of rate limiting
	if (pathname.startsWith("/api/cron/")) {
		const secret = req.headers.get("authorization");
		const expected = `Bearer ${process.env.CRON_SECRET}`;
		if (!process.env.CRON_SECRET || secret !== expected) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		return NextResponse.next();
	}

	// Stripe webhooks: skip rate limiting (Stripe signs requests)
	if (pathname.startsWith("/api/webhooks/")) return NextResponse.next();

	const ip = getIp(req);
	const { limited, remaining, reset } = await checkRateLimit(ip, pathname);

	if (limited) {
		return NextResponse.json(
			{ error: "Too many requests", retryAfter: reset - Math.floor(Date.now() / 1000) },
			{
				status: 429,
				headers: {
					"Retry-After": String(reset - Math.floor(Date.now() / 1000)),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(reset),
				},
			},
		);
	}

	const res = NextResponse.next();
	res.headers.set("X-RateLimit-Remaining", String(remaining));
	res.headers.set("X-RateLimit-Reset", String(reset));
	return res;
}

export const config = {
	matcher: ["/api/:path*"],
};
