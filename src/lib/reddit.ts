/**
 * Reddit community sentiment for cities.
 * Uses Reddit's public JSON API — no key required.
 * Searches r/moving, r/SameGrassGreener, r/relocating, and the city's own subreddit.
 *
 * Returns aggregated sentiment signals: post count, avg upvotes,
 * top positive/negative themes extracted from post titles.
 */

export interface RedditSentiment {
	postCount: number;
	avgUpvotes: number;
	positiveThemes: string[];
	negativeThemes: string[];
	topPosts: Array<{ title: string; upvotes: number; url: string; subreddit: string }>;
	fetchedAt: string;
}

interface RedditPost {
	data: {
		title: string;
		score: number;
		permalink: string;
		subreddit: string;
		selftext: string;
		num_comments: number;
	};
}

interface RedditListing {
	data: { children: RedditPost[] };
}

const POSITIVE_KEYWORDS = [
	"love", "great", "amazing", "excellent", "affordable", "friendly", "safe",
	"beautiful", "recommend", "wonderful", "best", "thriving", "vibrant",
	"clean", "low crime", "good schools", "job market", "growing",
];

const NEGATIVE_KEYWORDS = [
	"avoid", "dangerous", "expensive", "traffic", "crime", "boring", "hot",
	"humid", "flooding", "homeless", "bad schools", "high taxes", "sprawl",
	"overrated", "leaving", "moved away", "regret", "tornado", "hurricane",
];

function extractThemes(posts: RedditPost[], keywords: string[]): string[] {
	const counts: Record<string, number> = {};
	const allText = posts.map((p) => `${p.data.title} ${p.data.selftext}`.toLowerCase()).join(" ");

	for (const kw of keywords) {
		const matches = (allText.match(new RegExp(kw, "gi")) ?? []).length;
		if (matches > 0) counts[kw] = matches;
	}

	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([kw]) => kw);
}

async function searchReddit(query: string): Promise<RedditPost[]> {
	try {
		const url = new URL("https://www.reddit.com/search.json");
		url.searchParams.set("q", query);
		url.searchParams.set("sort", "relevance");
		url.searchParams.set("limit", "25");
		url.searchParams.set("type", "link");

		const res = await fetch(url.toString(), {
			headers: { "User-Agent": "NextHomeUSA/1.0 (relocation research app)" },
			signal: AbortSignal.timeout(10000),
			next: { revalidate: 86400 * 3 }, // cache 3 days
		} as RequestInit);

		if (!res.ok) return [];
		const data = (await res.json()) as RedditListing;
		return data.data?.children ?? [];
	} catch {
		return [];
	}
}

/** Fetches top posts from the city's own subreddit (e.g. r/Austin, r/Denver). */
async function fetchCitySubredditPosts(cityName: string): Promise<RedditPost[]> {
	// Most city subreddits drop spaces: "Los Angeles" → r/LosAngeles
	const slug = cityName.replace(/\s+/g, "");
	try {
		const url = `https://www.reddit.com/r/${slug}/search.json?q=living+moving+worth+it+pros+cons&sort=relevance&t=all&limit=25&restrict_sr=1`;
		const res = await fetch(url, {
			headers: { "User-Agent": "NextHomeUSA/1.0 (relocation research app)" },
			signal: AbortSignal.timeout(10000),
			next: { revalidate: 86400 * 3 },
		} as RequestInit);
		if (!res.ok) return []; // 404 = subreddit doesn't exist; silently skip
		const data = (await res.json()) as RedditListing;
		return data.data?.children ?? [];
	} catch {
		return [];
	}
}

export async function getCityRedditSentiment(
	cityName: string,
	stateId: string,
): Promise<RedditSentiment | null> {
	// Query 1+2: relocation subreddits (general moving discussions)
	const queries = [
		`"${cityName}" site:reddit.com/r/SameGrassGreener OR site:reddit.com/r/moving OR site:reddit.com/r/relocating`,
		`"${cityName} ${stateId}" moving living`,
	];

	const allPosts: RedditPost[] = [];

	for (const q of queries) {
		const posts = await searchReddit(q);
		allPosts.push(...posts);
		await new Promise((r) => setTimeout(r, 1000));
	}

	// Query 3: city's own subreddit (r/Austin, r/Denver, etc.) — richer lived-experience posts
	const cityPosts = await fetchCitySubredditPosts(cityName);
	allPosts.push(...cityPosts);

	if (allPosts.length === 0) return null;

	// Deduplicate by permalink
	const seen = new Set<string>();
	const unique = allPosts.filter((p) => {
		if (seen.has(p.data.permalink)) return false;
		seen.add(p.data.permalink);
		return true;
	});

	const avgUpvotes = Math.round(
		unique.reduce((s, p) => s + p.data.score, 0) / unique.length,
	);

	const topPosts = unique
		.sort((a, b) => b.data.score - a.data.score)
		.slice(0, 5)
		.map((p) => ({
			title: p.data.title,
			upvotes: p.data.score,
			url: `https://reddit.com${p.data.permalink}`,
			subreddit: p.data.subreddit,
		}));

	return {
		postCount: unique.length,
		avgUpvotes,
		positiveThemes: extractThemes(unique, POSITIVE_KEYWORDS),
		negativeThemes: extractThemes(unique, NEGATIVE_KEYWORDS),
		topPosts,
		fetchedAt: new Date().toISOString(),
	};
}
