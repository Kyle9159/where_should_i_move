"use client";

import {
	RadarChart, Radar, PolarGrid, PolarAngleAxis,
	BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
	LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";

// ── Shared ────────────────────────────────────────────────────────────────────

const ACCENT = "#00d4ff";
const MUTED = "#555";
const SURFACE = "#111";
const TEXT = "#e0e0e0";

const tooltipStyle = {
	background: "#1a1a1a",
	border: "1px solid #2a2a2a",
	borderRadius: 8,
	color: TEXT,
	fontSize: 12,
};

// ── Score Radar ───────────────────────────────────────────────────────────────

interface RadarProps {
	essentials: number;
	lifestyle: number;
	practical: number;
	family: number;
	nature: number;
}

export function ScoreRadarChart({ essentials, lifestyle, practical, family, nature }: RadarProps) {
	const data = [
		{ subject: "Essentials", value: essentials },
		{ subject: "Lifestyle", value: lifestyle },
		{ subject: "Practical", value: practical },
		{ subject: "Family", value: family },
		{ subject: "Nature", value: nature },
	];

	return (
		<ResponsiveContainer width="100%" height={220}>
			<RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
				<PolarGrid stroke="#2a2a2a" />
				<PolarAngleAxis dataKey="subject" tick={{ fill: MUTED, fontSize: 11 }} />
				<Radar
					dataKey="value"
					stroke={ACCENT}
					fill={ACCENT}
					fillOpacity={0.15}
					strokeWidth={2}
				/>
			</RadarChart>
		</ResponsiveContainer>
	);
}

// ── Cost Breakdown Bar ────────────────────────────────────────────────────────

interface CostProps {
	medianHomePrice: number | null;
	medianRent: number | null;
	medianIncome: number | null;
}

const NATIONAL_HOME = 412000;
const NATIONAL_RENT = 1830;
const NATIONAL_INCOME = 77540;

export function CostBreakdownChart({ medianHomePrice, medianRent, medianIncome }: CostProps) {
	const data = [
		{
			label: "Median Home",
			city: medianHomePrice ? Math.round(medianHomePrice / 1000) : null,
			national: Math.round(NATIONAL_HOME / 1000),
			suffix: "K",
		},
		{
			label: "Monthly Rent",
			city: medianRent ?? null,
			national: NATIONAL_RENT,
			suffix: "",
		},
		{
			label: "Household Income",
			city: medianIncome ? Math.round(medianIncome / 1000) : null,
			national: Math.round(NATIONAL_INCOME / 1000),
			suffix: "K",
		},
	].filter((d) => d.city !== null);

	if (data.length === 0) return null;

	return (
		<ResponsiveContainer width="100%" height={200}>
			<BarChart data={data} layout="vertical" margin={{ left: 90, right: 30, top: 5, bottom: 5 }}>
				<XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
					tickFormatter={(v) => `$${v}`} />
				<YAxis type="category" dataKey="label" tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} width={85} />
				<Tooltip
					contentStyle={tooltipStyle}
					formatter={(val: unknown, name: unknown, props: any) => [
						`$${val}${props?.payload?.suffix ?? ""}`,
						name === "city" ? "This city" : "National avg",
					] as [string, string]}
				/>
				<Bar dataKey="city" name="city" radius={[0, 4, 4, 0]} barSize={10}>
					{data.map((_, i) => <Cell key={i} fill={ACCENT} />)}
				</Bar>
				<Bar dataKey="national" name="national" radius={[0, 4, 4, 0]} barSize={10} fill={MUTED} />
			</BarChart>
		</ResponsiveContainer>
	);
}

// ── Climate Monthly Line ──────────────────────────────────────────────────────

interface ClimateProps {
	avgTempJan: number | null;
	avgTempJul: number | null;
	sunnyDaysPerYear: number | null;
	avgRainfallInches: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlyTemps(jan: number, jul: number): number[] {
	// Simple sinusoidal interpolation between Jan and Jul
	return MONTHS.map((_, i) => {
		const t = i / 11;
		const midpoint = (jan + jul) / 2;
		const amplitude = (jul - jan) / 2;
		return Math.round(midpoint + amplitude * Math.sin((t - 0.25) * 2 * Math.PI));
	});
}

export function ClimateLineChart({ avgTempJan, avgTempJul, sunnyDaysPerYear, avgRainfallInches }: ClimateProps) {
	if (!avgTempJan || !avgTempJul) return null;

	const temps = buildMonthlyTemps(avgTempJan, avgTempJul);
	const data = MONTHS.map((month, i) => ({ month, temp: temps[i] }));

	const comfortMin = 45;
	const comfortMax = 85;

	return (
		<div className="space-y-3">
			<ResponsiveContainer width="100%" height={160}>
				<LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
					<CartesianGrid stroke="#1e1e1e" vertical={false} />
					<XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
					<YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
						tickFormatter={(v) => `${v}°`} domain={["auto", "auto"]} />
					<Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}°F`, "Avg Temp"] as [string, string]} />
					<ReferenceLine y={comfortMin} stroke="#2a2a2a" strokeDasharray="3 3" />
					<ReferenceLine y={comfortMax} stroke="#2a2a2a" strokeDasharray="3 3" />
					<Line
						type="monotone" dataKey="temp" stroke={ACCENT}
						strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT }}
					/>
				</LineChart>
			</ResponsiveContainer>
			<div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
				{sunnyDaysPerYear && <span>☀️ {sunnyDaysPerYear} sunny days/yr</span>}
				{avgRainfallInches && <span>🌧 {avgRainfallInches}" rainfall/yr</span>}
			</div>
		</div>
	);
}

// ── Demographics Donut (race/ethnicity) ───────────────────────────────────────

import { PieChart, Pie, Legend } from "recharts";

interface DemoProps {
	pctWhite: number | null;
	pctBlack: number | null;
	pctHispanic: number | null;
	pctAsian: number | null;
	pctOther: number | null;
}

const DEMO_COLORS = ["#00d4ff", "#7c3aed", "#10b981", "#f59e0b", "#6b7280"];

export function DemographicsDonut({ pctWhite, pctBlack, pctHispanic, pctAsian, pctOther }: DemoProps) {
	const raw = [
		{ name: "White", value: pctWhite ?? 0 },
		{ name: "Hispanic", value: pctHispanic ?? 0 },
		{ name: "Black", value: pctBlack ?? 0 },
		{ name: "Asian", value: pctAsian ?? 0 },
		{ name: "Other", value: pctOther ?? 0 },
	].filter((d) => d.value > 0);

	if (raw.length === 0) return null;

	return (
		<ResponsiveContainer width="100%" height={200}>
			<PieChart>
				<Pie
					data={raw} dataKey="value" cx="50%" cy="50%"
					innerRadius={50} outerRadius={80} paddingAngle={2}
					label={({ name, value }) => `${name} ${Math.round(value)}%`}
					labelLine={false}
				>
					{raw.map((_, i) => <Cell key={i} fill={DEMO_COLORS[i % DEMO_COLORS.length]} />)}
				</Pie>
				<Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`] as [string]} />
			</PieChart>
		</ResponsiveContainer>
	);
}
