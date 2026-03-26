/**
 * EPA AirNow API — real-time + forecast air quality data.
 * Docs: https://docs.airnowapi.org/
 * Get a free key at: https://docs.airnowapi.org/account/request/
 *
 * When AIRNOW_API_KEY is not set, returns null and the app falls back to seeded data.
 *
 * Returns current AQI category (Good/Moderate/Unhealthy) and PM2.5 value.
 */

export interface AirQualityResult {
	aqi: number;                     // 0–500
	category: string;                // "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous"
	categoryNumber: number;          // 1–6
	pollutant: string;               // "PM2.5" | "PM10" | "Ozone"
	reportingArea: string;
	fetchedAt: string;
}

interface AirNowObservation {
	AQI: number;
	Category: { Name: string; Number: number };
	ParameterName: string;
	ReportingArea: string;
}

export async function getAirQuality(
	lat: number,
	lng: number,
): Promise<AirQualityResult | null> {
	const key = process.env.AIRNOW_API_KEY;
	if (!key) return null;

	try {
		const url = new URL("https://www.airnowapi.org/aq/observation/latLong/current/");
		url.searchParams.set("format", "application/json");
		url.searchParams.set("latitude", lat.toFixed(4));
		url.searchParams.set("longitude", lng.toFixed(4));
		url.searchParams.set("distance", "50");
		url.searchParams.set("API_KEY", key);

		const res = await fetch(url.toString(), {
			signal: AbortSignal.timeout(8000),
			next: { revalidate: 3600 }, // cache 1 hour
		} as RequestInit);

		if (!res.ok) return null;

		const data = (await res.json()) as AirNowObservation[];
		if (!data.length) return null;

		// Pick worst AQI reading
		const worst = data.sort((a, b) => b.AQI - a.AQI)[0];

		return {
			aqi: worst.AQI,
			category: worst.Category.Name,
			categoryNumber: worst.Category.Number,
			pollutant: worst.ParameterName,
			reportingArea: worst.ReportingArea,
			fetchedAt: new Date().toISOString(),
		};
	} catch {
		return null;
	}
}

// AQI color for UI display
export function aqiColor(categoryNumber: number): string {
	const colors: Record<number, string> = {
		1: "#00e400", // Good — green
		2: "#ffff00", // Moderate — yellow
		3: "#ff7e00", // USG — orange
		4: "#ff0000", // Unhealthy — red
		5: "#8f3f97", // Very Unhealthy — purple
		6: "#7e0023", // Hazardous — maroon
	};
	return colors[categoryNumber] ?? "#888";
}
