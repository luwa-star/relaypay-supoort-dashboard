"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { Header } from "@/components/dashboard/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { type VapiCall } from "@/lib/vapi-api";
import { type Ticket as SupaTicket } from "@/lib/supabase";
import {
	TrendingUp,
	TrendingDown,
	BarChart3,
	Clock,
	Target,
	Zap,
} from "lucide-react";

// Brand colors
const BRAND_PRIMARY = "#1B3A6B"; // deep blue
const BRAND_ACCENT = "#18A8BB"; // teal
const BRAND_COLORS = [
	BRAND_PRIMARY,
	BRAND_ACCENT,
	"#4A7DB5",
	"#5BC4D5",
	"#2D5A9E",
	"#0E8FA0",
];

interface DailyMetric {
	date: string;
	calls: number;
	successRate: number;
	avgDuration: number;
	escalations: number;
	tickets: number;
	resolved: number;
}

function buildDailyMetrics(
	calls: VapiCall[],
	tickets: SupaTicket[],
): DailyMetric[] {
	const days = eachDayOfInterval({
		start: subDays(new Date(), 13),
		end: new Date(),
	});

	return days.map((day) => {
		const dayKey = format(day, "yyyy-MM-dd");
		const dayCalls = calls.filter(
			(c) =>
				c.createdAt && format(new Date(c.createdAt), "yyyy-MM-dd") === dayKey,
		);
		const dayTickets = tickets.filter(
			(t) =>
				t.created_at && format(new Date(t.created_at), "yyyy-MM-dd") === dayKey,
		);

		const successCalls = dayCalls.filter(
			(c) => c.analysis?.successEvaluation === "true",
		).length;
		const successRate =
			dayCalls.length > 0
				? Math.round((successCalls / dayCalls.length) * 100)
				: 0;

		const totalDuration = dayCalls.reduce(
			(s, c) => s + (c.durationSeconds ?? 0),
			0,
		);
		const avgDuration =
			dayCalls.filter((c) => c.durationSeconds).length > 0
				? Math.round(
						totalDuration /
							dayCalls.filter((c) => c.durationSeconds).length /
							60,
					)
				: 0;

		const escalations = dayCalls.filter(
			(c) => c.endedReason === "transfer-failed",
		).length;

		const resolvedTickets = dayTickets.filter(
			(t) => t.status === "Closed",
		).length;

		return {
			date: format(day, "MMM d"),
			calls: dayCalls.length,
			successRate,
			avgDuration,
			escalations,
			tickets: dayTickets.length,
			resolved: resolvedTickets,
		};
	});
}

function buildHourlyDistribution(calls: VapiCall[]) {
	const hours = Array.from({ length: 24 }, (_, h) => ({
		hour: `${h.toString().padStart(2, "0")}:00`,
		calls: 0,
	}));
	calls.forEach((c) => {
		if (!c.createdAt) return;
		const h = new Date(c.createdAt).getHours();
		hours[h].calls += 1;
	});
	return hours;
}

function buildEndReasonData(calls: VapiCall[]) {
	const counts: Record<string, number> = {};
	calls.forEach((c) => {
		const reason = c.endedReason ?? "unknown";
		counts[reason] = (counts[reason] ?? 0) + 1;
	});
	return Object.entries(counts)
		.map(([name, value]) => ({ name: name.replace(/-/g, " "), value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 6);
}

interface AnalyticsData {
	calls: VapiCall[];
	tickets: SupaTicket[];
	total: number;
	successful: number;
	escalated: number;
	dropped: number;
	successRate: string;
	escalationRate: string;
}

export default function PerformancePage() {
	const [calls, setCalls] = useState<VapiCall[]>([]);
	const [tickets, setTickets] = useState<SupaTicket[]>([]);
	const [analytics, setAnalytics] = useState<
		Omit<AnalyticsData, "calls" | "tickets">
	>({
		total: 0,
		successful: 0,
		escalated: 0,
		dropped: 0,
		successRate: "0.0",
		escalationRate: "0.0",
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const { data } = await axios.get<AnalyticsData>("/api/analytics");
				setCalls(data.calls ?? []);
				setTickets(data.tickets ?? []);
				setAnalytics({
					total: data.total,
					successful: data.successful,
					escalated: data.escalated,
					dropped: data.dropped,
					successRate: data.successRate,
					escalationRate: data.escalationRate,
				});
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const {
		total: totalCalls,
		successful: successCalls,
		escalated: escalatedCalls,
		successRate,
		escalationRate,
	} = analytics;

	const avgDurationSec =
		calls.filter((c) => c.durationSeconds).length > 0
			? Math.round(
					calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
						calls.filter((c) => c.durationSeconds).length,
				)
			: 0;

	const totalTickets = tickets.length;
	const resolvedTickets = tickets.filter((t) => t.status === "Closed").length;
	const resolutionRate =
		totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

	const avgResolutionMs = tickets
		.filter((t) => t.resolved_at && t.created_at)
		.reduce(
			(acc, t, _, arr) =>
				acc +
				(new Date(t.resolved_at!).getTime() -
					new Date(t.created_at).getTime()) /
					arr.length,
			0,
		);
	const avgResolutionHours =
		avgResolutionMs > 0 ? (avgResolutionMs / 1000 / 60 / 60).toFixed(1) : "—";

	const totalCost = calls.reduce((s, c) => s + (c.cost ?? 0), 0);
	const costPerCall =
		totalCalls > 0 ? (totalCost / totalCalls).toFixed(4) : "0";

	const dailyData = buildDailyMetrics(calls, tickets);
	const hourlyData = buildHourlyDistribution(calls);
	const endReasonData = buildEndReasonData(calls);

	const categoryBreakdown = tickets.reduce<Record<string, number>>((acc, t) => {
		acc[t.category] = (acc[t.category] ?? 0) + 1;
		return acc;
	}, {});
	const categoryPieData = Object.entries(categoryBreakdown).map(
		([name, value]) => ({
			name,
			value,
		}),
	);

	if (loading) {
		return (
			<>
				<Header
					title="Performance"
					description="Voice agent analytics and quality metrics"
				/>
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-28 rounded-lg" />
						))}
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header
				title="Performance"
				description="Voice agent analytics and quality metrics"
			/>

			<div className="p-6 space-y-6">
				{/* KPI Row */}
				<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
					<MetricCard
						title="Success Rate"
						value={`${successRate}%`}
						subtitle={`${successCalls} successful calls`}
						icon={Target}
					/>
					<MetricCard
						title="Escalation Rate"
						value={`${escalationRate}%`}
						subtitle={`${escalatedCalls} escalated`}
						icon={TrendingUp}
					/>
					<MetricCard
						title="Avg Call Duration"
						value={`${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`}
						subtitle="Per call"
						icon={Clock}
					/>
					<MetricCard
						title="Resolution Rate"
						value={`${resolutionRate}%`}
						subtitle={`${resolvedTickets}/${totalTickets} tickets`}
						icon={Zap}
						accent
					/>
					<MetricCard
						title="Avg Resolution Time"
						value={`${avgResolutionHours}h`}
						subtitle="Ticket resolution"
						icon={TrendingDown}
					/>
					<MetricCard
						title="Cost per Call"
						value={`$${costPerCall}`}
						subtitle={`$${totalCost.toFixed(2)} total`}
						icon={BarChart3}
					/>
				</div>

				{/* Quality gauges */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{[
						{
							label: "Call Success Rate",
							value: successRate,
							color: "bg-primary",
						},
						{
							label: "Ticket Resolution Rate",
							value: resolutionRate,
							color: "bg-accent",
						},
						{
							label: "First Contact Rate",
							value: Math.max(0, 100 - escalatedCalls),
							color: "bg-emerald-500",
						},
					].map(({ label, value, color }) => (
						<Card key={label}>
							<CardContent className="p-5">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
									{label}
								</p>
								<div className="flex items-end justify-between mb-2">
									<span className="text-2xl font-bold">{value}%</span>
								</div>
								<Progress
									value={value as number}
									className={`h-2 [&>[data-slot=progress-indicator]]:${color}`}
								/>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Trend charts */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Success Rate — 14 Days
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							<ResponsiveContainer width="100%" height={220}>
								<LineChart data={dailyData}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										interval={1}
									/>
									<YAxis
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										domain={[0, 100]}
										unit="%"
									/>
									<Tooltip
										contentStyle={{ fontSize: 11, borderRadius: 6 }}
										formatter={(v) => [`${v}%`, "Success Rate"]}
									/>
									<Line
										type="monotone"
										dataKey="successRate"
										stroke={BRAND_PRIMARY}
										strokeWidth={2}
										dot={{ r: 3, fill: BRAND_PRIMARY }}
										activeDot={{ r: 5 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Daily Call & Ticket Volume — 14 Days
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							<ResponsiveContainer width="100%" height={220}>
								<BarChart data={dailyData}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										interval={1}
									/>
									<YAxis
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
									<Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
									<Bar
										dataKey="calls"
										name="Calls"
										fill={BRAND_PRIMARY}
										radius={[3, 3, 0, 0]}
									/>
									<Bar
										dataKey="tickets"
										name="Tickets"
										fill={BRAND_ACCENT}
										radius={[3, 3, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{/* Hourly distribution */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Call Volume by Hour of Day
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={hourlyData}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										dataKey="hour"
										tick={{ fontSize: 9 }}
										tickLine={false}
										axisLine={false}
										interval={2}
									/>
									<YAxis
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<Tooltip
										contentStyle={{ fontSize: 11, borderRadius: 6 }}
										formatter={(v) => [v, "Calls"]}
									/>
									<Bar
										dataKey="calls"
										fill={BRAND_ACCENT}
										radius={[3, 3, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Ticket category pie */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Ticket Category Breakdown
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							{categoryPieData.length === 0 ? (
								<div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
									No data
								</div>
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={categoryPieData}
											cx="50%"
											cy="50%"
											outerRadius={75}
											dataKey="value"
											label={({ name, percent }) =>
												`${name} ${((percent ?? 0) * 100).toFixed(0)}%`
											}
											labelLine={false}>
											{categoryPieData.map((_, index) => (
												<Cell
													key={index}
													fill={BRAND_COLORS[index % BRAND_COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip
											contentStyle={{ fontSize: 11, borderRadius: 6 }}
											formatter={(v) => [v, "Tickets"]}
										/>
									</PieChart>
								</ResponsiveContainer>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Call end reasons */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-semibold">
							Call End Reason Distribution
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4">
						{endReasonData.length === 0 ? (
							<div className="py-8 text-center text-sm text-muted-foreground">
								No data
							</div>
						) : (
							<ResponsiveContainer width="100%" height={180}>
								<BarChart data={endReasonData} layout="vertical">
									<CartesianGrid
										strokeDasharray="3 3"
										horizontal={false}
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										type="number"
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<YAxis
										type="category"
										dataKey="name"
										tick={{ fontSize: 10 }}
										tickLine={false}
										axisLine={false}
										width={160}
									/>
									<Tooltip
										contentStyle={{ fontSize: 11, borderRadius: 6 }}
										formatter={(v) => [v, "Calls"]}
									/>
									<Bar
										dataKey="value"
										fill={BRAND_PRIMARY}
										radius={[0, 4, 4, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
