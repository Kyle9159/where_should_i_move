import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GROK_MODEL } from "@/lib/constants";
import { type FilterWeights, normalizeWeights, encodeWeights } from "@/lib/ranking";
import { buildDeterministicWeights, type QuizAnswers } from "@/lib/quizConfig";

const QuizAnswersSchema = z.object({
	sessionId: z.string(),
	answers: z.object({
		q1_priorities: z.array(z.string()).max(3),
		q2_housing: z.enum(["buy", "rent", "flexible"]),
		q3_climate: z.enum(["warm", "four-seasons", "mild", "any"]),
		q4_children: z.enum(["have-now", "planning", "no"]),
		q5_walkability: z.number().min(0).max(10),
		q6_work: z.enum(["remote", "find-local", "self-employed", "retired"]),
		q7_outdoors: z.array(z.string()),
		q8_budget: z.object({ min: z.number(), max: z.number() }),
		q9_vibe: z.enum(["urban", "suburban", "college-town", "tech-hub"]),
		q10_healthcare: z.number().min(0).max(10),
		q11_taxes: z.enum(["sensitive", "somewhat", "not-a-factor"]),
	}),
});

const FILTER_KEYS = [
	"scoreMedianHomePrice", "scoreMedianRent", "scorePriceToRent", "scoreCostOfLiving",
	"scoreTaxBurden", "scoreJobMarket", "scoreUnemployment", "scoreIncomeGrowth",
	"scoreMedianIncome", "scoreAffordabilityIndex",
	"scoreWalkability", "scoreTransit", "scoreBikeability", "scoreRestaurants",
	"scoreNightlife", "scoreArtsAndCulture", "scoreDiversity", "scoreLgbtqFriendly",
	"scoreCollegeEducated", "scoreMedAge", "scoreHomeownership", "scoreCollegeTown", "scoreTechHub",
	"scoreWeather", "scoreAirQuality", "scoreSunnyDays", "scoreWarmClimate", "scoreLowHumidity",
	"scoreNaturalDisasterRisk", "scoreViolentCrime", "scorePropertyCrime",
	"scoreSchoolQuality", "scoreHighSchool", "scoreGraduationRate", "scoreChildcare", "scorePupilSpending",
	"scoreHealthcare", "scoreBroadband", "scorePopulationGrowth",
	"scoreNearOcean", "scoreNearMountains", "scoreNearLake", "scoreTrails",
	"scoreNationalPark", "scoreGreenSpace",
] as const;

const SYSTEM_PROMPT = `You are a relocation advisor AI. Given quiz answers about someone's ideal place to live, produce a JSON object where:
- Keys are filter score column names from the provided list
- Values are importance weights from 0.0 to 1.0 (all weights must sum to 1.0)
- Only include weights > 0.02 (omit irrelevant filters)
- Include a "reasoning" field: array of 3 short strings explaining key recommendations

Available filter keys: ${FILTER_KEYS.join(", ")}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

export async function POST(req: NextRequest) {
	const body = await req.json();
	const parsed = QuizAnswersSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid quiz answers" }, { status: 400 });
	}

	const { answers } = parsed.data;
	let filterWeights: FilterWeights;
	let reasoning: string[] = [];

	const apiKey = process.env.XAI_API_KEY;

	if (apiKey) {
		try {
			const grokResp = await fetch("https://api.x.ai/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: GROK_MODEL,
					response_format: { type: "json_object" },
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						{
							role: "user",
							content: `Quiz answers: ${JSON.stringify(answers, null, 2)}\n\nGenerate FilterWeights for this person.`,
						},
					],
					temperature: 0.3,
				}),
				signal: AbortSignal.timeout(10_000),
			});

			if (grokResp.ok) {
				const data = await grokResp.json() as { choices: Array<{ message: { content: string } }> };
				const content = data.choices[0]?.message?.content ?? "{}";
				const result = JSON.parse(content) as Record<string, unknown>;
				reasoning = Array.isArray(result.reasoning) ? result.reasoning as string[] : [];
				delete result.reasoning;

				// Extract only valid filter keys and normalize
				const raw: FilterWeights = {};
				for (const key of FILTER_KEYS) {
					if (typeof result[key] === "number") {
						raw[key as keyof FilterWeights] = result[key] as number;
					}
				}
				filterWeights = normalizeWeights(raw);
			} else {
				filterWeights = buildDeterministicWeights(answers as QuizAnswers);
			}
		} catch {
			filterWeights = buildDeterministicWeights(answers as QuizAnswers);
		}
	} else {
		// No API key — use deterministic fallback
		filterWeights = buildDeterministicWeights(answers as QuizAnswers);
		reasoning = [
			"Your priorities have been matched to the most relevant city metrics.",
			"Housing budget and climate preferences weighted appropriately.",
			"Safety and job market factors included as baseline weights.",
		];
	}

	return NextResponse.json({
		filterWeights,
		reasoning,
		weightsEncoded: encodeWeights(filterWeights),
	});
}
