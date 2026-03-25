export const US_STATES = [
	{ id: "AL", name: "Alabama", region: "South" },
	{ id: "AK", name: "Alaska", region: "West" },
	{ id: "AZ", name: "Arizona", region: "West" },
	{ id: "AR", name: "Arkansas", region: "South" },
	{ id: "CA", name: "California", region: "West" },
	{ id: "CO", name: "Colorado", region: "West" },
	{ id: "CT", name: "Connecticut", region: "Northeast" },
	{ id: "DE", name: "Delaware", region: "South" },
	{ id: "DC", name: "District of Columbia", region: "South" },
	{ id: "FL", name: "Florida", region: "South" },
	{ id: "GA", name: "Georgia", region: "South" },
	{ id: "HI", name: "Hawaii", region: "West" },
	{ id: "ID", name: "Idaho", region: "West" },
	{ id: "IL", name: "Illinois", region: "Midwest" },
	{ id: "IN", name: "Indiana", region: "Midwest" },
	{ id: "IA", name: "Iowa", region: "Midwest" },
	{ id: "KS", name: "Kansas", region: "Midwest" },
	{ id: "KY", name: "Kentucky", region: "South" },
	{ id: "LA", name: "Louisiana", region: "South" },
	{ id: "ME", name: "Maine", region: "Northeast" },
	{ id: "MD", name: "Maryland", region: "South" },
	{ id: "MA", name: "Massachusetts", region: "Northeast" },
	{ id: "MI", name: "Michigan", region: "Midwest" },
	{ id: "MN", name: "Minnesota", region: "Midwest" },
	{ id: "MS", name: "Mississippi", region: "South" },
	{ id: "MO", name: "Missouri", region: "Midwest" },
	{ id: "MT", name: "Montana", region: "West" },
	{ id: "NE", name: "Nebraska", region: "Midwest" },
	{ id: "NV", name: "Nevada", region: "West" },
	{ id: "NH", name: "New Hampshire", region: "Northeast" },
	{ id: "NJ", name: "New Jersey", region: "Northeast" },
	{ id: "NM", name: "New Mexico", region: "West" },
	{ id: "NY", name: "New York", region: "Northeast" },
	{ id: "NC", name: "North Carolina", region: "South" },
	{ id: "ND", name: "North Dakota", region: "Midwest" },
	{ id: "OH", name: "Ohio", region: "Midwest" },
	{ id: "OK", name: "Oklahoma", region: "South" },
	{ id: "OR", name: "Oregon", region: "West" },
	{ id: "PA", name: "Pennsylvania", region: "Northeast" },
	{ id: "RI", name: "Rhode Island", region: "Northeast" },
	{ id: "SC", name: "South Carolina", region: "South" },
	{ id: "SD", name: "South Dakota", region: "Midwest" },
	{ id: "TN", name: "Tennessee", region: "South" },
	{ id: "TX", name: "Texas", region: "South" },
	{ id: "UT", name: "Utah", region: "West" },
	{ id: "VT", name: "Vermont", region: "Northeast" },
	{ id: "VA", name: "Virginia", region: "South" },
	{ id: "WA", name: "Washington", region: "West" },
	{ id: "WV", name: "West Virginia", region: "South" },
	{ id: "WI", name: "Wisconsin", region: "Midwest" },
	{ id: "WY", name: "Wyoming", region: "West" },
] as const;

export const REGIONS = ["West", "South", "Midwest", "Northeast"] as const;

export const CITY_TIERS = {
	"major-city": "Major City (500K+)",
	"mid-size": "Mid-Size (100K–500K)",
	"small-city": "Small City (25K–100K)",
	town: "Town (<25K)",
} as const;

export const FILTER_CATEGORIES = {
	essentials: "Essentials",
	lifestyle: "Lifestyle",
	practical: "Practical",
	family: "Family",
	nature: "Nature & Climate",
} as const;

export const QUIZ_STEPS = 8;

export const GROK_MODEL = "grok-4-1-fast-reasoning";
