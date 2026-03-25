import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { aiSummaries } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { GROK_MODEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const PROMPT_VERSION = "v1";
const TTL_DAYS = 30;

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const city = await db.query.cities.findFirst({
		where: (c, { eq }) => eq(c.slug, slug),
		with: {
			state: true, housing: true, jobs: true, climate: true,
			safety: true, schools: true, walkability: true, lifestyle: true,
		},
	});

	if (!city) return NextResponse.json({ error: "City not found" }, { status: 404 });

	// Check cache
	const cached = await db.query.aiSummaries.findFirst({
		where: (t, { eq, and, gt }) =>
			and(
				eq(t.cityId, city.id),
				eq(t.summaryType, "overview"),
				eq(t.promptVersion, PROMPT_VERSION),
				gt(t.expiresAt, new Date().toISOString()),
			),
	});

	if (cached) {
		return NextResponse.json({ summary: cached.content, cached: true });
	}

	// Generate via Grok
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ summary: null, cached: false });
	}

	const h = city.housing;
	const j = city.jobs;
	const c = city.climate;
	const s = city.safety;
	const sc = city.schools;
	const w = city.walkability;
	const l = city.lifestyle;

	const cityContext = [
		`City: ${city.name}, ${city.state?.name}`,
		`Population: ${city.population?.toLocaleString() ?? "unknown"}`,
		h?.medianHomePrice ? `Median home price: ${formatCurrency(h.medianHomePrice)}` : null,
		h?.medianRent2Bed ? `Median 2BR rent: ${formatCurrency(h.medianRent2Bed)}/month` : null,
		j?.unemploymentRate ? `Unemployment: ${j.unemploymentRate}%` : null,
		j?.medianHouseholdIncome ? `Median household income: ${formatCurrency(j.medianHouseholdIncome)}` : null,
		j?.jobGrowthRate ? `Job growth rate: ${j.jobGrowthRate}%/yr` : null,
		c?.avgTempJan ? `January avg temp: ${c.avgTempJan}°F` : null,
		c?.avgTempJul ? `July avg temp: ${c.avgTempJul}°F` : null,
		c?.sunnyDaysPerYear ? `Sunny days/year: ${c.sunnyDaysPerYear}` : null,
		c?.airQualityIndex ? `Air quality index: ${c.airQualityIndex}` : null,
		s?.violentCrimeRate ? `Violent crime rate: ${s.violentCrimeRate}/100k (national avg ~380)` : null,
		sc?.greatSchoolsRating ? `School district rating: ${sc.greatSchoolsRating}/10` : null,
		w?.walkScore ? `Walk Score: ${w.walkScore}/100` : null,
		l?.nearOcean ? "Near ocean: yes" : null,
		l?.nearMountains ? "Near mountains: yes" : null,
		l?.lgbtqFriendlyScore ? `LGBTQ+ friendliness: ${l.lgbtqFriendlyScore}/100` : null,
		c?.tornadoRisk !== "low" ? `Tornado risk: ${c?.tornadoRisk}` : null,
		c?.hurricaneRisk !== "low" ? `Hurricane risk: ${c?.hurricaneRisk}` : null,
		c?.wildfireRisk !== "low" ? `Wildfire risk: ${c?.wildfireRisk}` : null,
	].filter(Boolean).join("\n");

	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				model: GROK_MODEL,
				messages: [
					{
						role: "system",
						content: `You are a relocation advisor writing concise, honest city overviews for people considering moving there.
Write 2-3 short paragraphs (total ~120 words). Be specific and factual. Mention both strengths AND real trade-offs — avoid generic praise.
Use plain English, no markdown, no bullet points. Write directly to the reader ("you'll find...").`,
					},
					{ role: "user", content: `Write an overview for someone considering moving to ${city.name}, ${city.state?.name}.\n\n${cityContext}` },
				],
				temperature: 0.6,
				max_tokens: 250,
			}),
			signal: AbortSignal.timeout(12_000),
		});

		if (!res.ok) return NextResponse.json({ summary: null, cached: false });

		const data = await res.json() as { choices: Array<{ message: { content: string } }> };
		const content = data.choices[0]?.message?.content?.trim() ?? "";

		if (!content) return NextResponse.json({ summary: null, cached: false });

		// Store in DB
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + TTL_DAYS);

		// Upsert (delete old + insert new)
		await db.delete(aiSummaries).where(
			and(eq(aiSummaries.cityId, city.id), eq(aiSummaries.summaryType, "overview")),
		);
		await db.insert(aiSummaries).values({
			id: createId(),
			cityId: city.id,
			summaryType: "overview",
			content,
			model: GROK_MODEL,
			promptVersion: PROMPT_VERSION,
			expiresAt: expiresAt.toISOString(),
		});

		return NextResponse.json({ summary: content, cached: false });
	} catch {
		return NextResponse.json({ summary: null, cached: false });
	}
}
