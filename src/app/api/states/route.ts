import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
	const states = await db.query.states.findMany({
		orderBy: (s, { asc }) => [asc(s.name)],
	});
	return NextResponse.json(states, {
		headers: { "Cache-Control": "public, s-maxage=86400" },
	});
}
