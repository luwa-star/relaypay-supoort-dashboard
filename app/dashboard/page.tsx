"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
	Phone,
	Ticket,
	Clock,
	TrendingUp,
	AlertTriangle,
	CheckCircle2,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
} from "recharts";
import { Header } from "@/components/dashboard/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, type VapiCall } from "@/lib/vapi-api";
import { type Ticket as SupaTicket } from "@/lib/supabase";
import { format, subDays } from "date-fns";

interface DailyCallData {
	date: string;
	calls: number;
	avgDuration: number;
}

interface TicketCategoryData {
	category: string;
	count: number;
}

function buildDailyCallData(calls: VapiCall[]): DailyCallData[] {
	const days = Array.from({ length: 7 }, (_, i) => {
		const d = subDays(new Date(), 6 - i);
		return {
			date: format(d, "MMM d"),
			key: format(d, "yyyy-MM-dd"),
			calls: 0,
			totalDuration: 0,
		};
	});

	calls.forEach((call) => {
		if (!call.createdAt) return;
		const dateKey = format(new Date(call.createdAt), "yyyy-MM-dd");
		const day = days.find((d) => d.key === dateKey);
		if (day) {
			day.calls += 1;
			day.totalDuration += call.durationSeconds ?? 0;
		}
	});

	return days.map(({ date, calls, totalDuration }) => ({
		date,
		calls,
		avgDuration: calls > 0 ? Math.round(totalDuration / calls / 60) : 0,
	}));
}

function buildCategoryData(tickets: SupaTicket[]): TicketCategoryData[] {
	const counts: Record<string, number> = {};
	tickets.forEach((t) => {
		counts[t.category] = (counts[t.category] ?? 0) + 1;
	});
	return Object.entries(counts)
		.map(([category, count]) => ({ category, count }))
		.sort((a, b) => b.count - a.count);
}

function ticketStatusVariant(
	status: string,
): "default" | "success" | "warning" | "destructive" | "outline" | "accent" {
	switch (status) {
		case "open":
			return "accent";
		case "in_progress":
			return "warning";
		case "resolved":
			return "success";
		case "escalated":
			return "destructive";
		case "closed":
			return "outline";
		default:
			return "outline";
	}
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
	avgDurationSec: number;
	openTickets: number;
	resolvedTickets: number;
	totalTickets: number;
	resolutionRate: string;
}

export default function OverviewPage() {
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
		avgDurationSec: 0,
		openTickets: 0,
		resolvedTickets: 0,
		totalTickets: 0,
		resolutionRate: "0.0",
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
					avgDurationSec: data.avgDurationSec,
					openTickets: data.openTickets,
					resolvedTickets: data.resolvedTickets,
					totalTickets: data.totalTickets,
					resolutionRate: data.resolutionRate,
				});
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const {
		total: totalCalls,
		escalated: escalatedCalls,
		escalationRate,
		avgDurationSec,
		openTickets,
		resolvedTickets,
		resolutionRate,
	} = analytics;

	const dailyCallData = buildDailyCallData(calls);
	const categoryData = buildCategoryData(tickets);
	const recentTickets = tickets.slice(0, 6);
	const recentCalls = calls.slice(0, 6);

	if (loading) {
		return (
			<>
				<Header title="Overview" description="Support operation summary" />
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
			<Header title="Overview" description="Support operation summary" />
			<div className="p-6 space-y-6">
				{/* KPI Cards */}
				<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
					<MetricCard
						title="Total Calls"
						value={totalCalls}
						subtitle="All time"
						icon={Phone}
					/>
					<MetricCard
						title="Open Tickets"
						value={openTickets}
						subtitle={`${tickets.length} total`}
						icon={Ticket}
						accent
					/>
					<MetricCard
						title="Avg Call Duration"
						value={formatDuration(avgDurationSec)}
						subtitle="Per completed call"
						icon={Clock}
					/>
					<MetricCard
						title="Resolution Rate"
						value={`${resolutionRate}%`}
						subtitle={`${resolvedTickets} resolved`}
						icon={CheckCircle2}
					/>
					<MetricCard
						title="Escalation Rate"
						value={`${escalationRate}%`}
						subtitle={`${escalatedCalls} escalated`}
						icon={AlertTriangle}
					/>
					<MetricCard
						title="Escalated Tickets"
						value={openTickets}
						subtitle="Needs attention"
						icon={TrendingUp}
					/>
				</div>

				{/* Charts Row */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Call Volume — Last 7 Days
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							<ResponsiveContainer width="100%" height={200}>
								<AreaChart data={dailyCallData}>
									<defs>
										<linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor="oklch(0.28 0.14 258)"
												stopOpacity={0.2}
											/>
											<stop
												offset="95%"
												stopColor="oklch(0.28 0.14 258)"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<Tooltip
										contentStyle={{ fontSize: 12, borderRadius: 6 }}
										formatter={(v) => [v, "Calls"]}
									/>
									<Area
										type="monotone"
										dataKey="calls"
										stroke="oklch(0.28 0.14 258)"
										strokeWidth={2}
										fill="url(#callsFill)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Tickets by Category
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-4">
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={categoryData} layout="vertical">
									<CartesianGrid
										strokeDasharray="3 3"
										horizontal={false}
										stroke="oklch(0.88 0.015 255)"
									/>
									<XAxis
										type="number"
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										allowDecimals={false}
									/>
									<YAxis
										type="category"
										dataKey="category"
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										width={80}
									/>
									<Tooltip
										contentStyle={{ fontSize: 12, borderRadius: 6 }}
										formatter={(v) => [v, "Tickets"]}
									/>
									<Bar
										dataKey="count"
										fill="oklch(0.63 0.12 196)"
										radius={[0, 4, 4, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</div>

				{/* Recent activity row */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{/* Recent Tickets */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Recent Tickets
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							{recentTickets.length === 0 ? (
								<p className="text-sm text-muted-foreground py-4 text-center">
									No tickets yet
								</p>
							) : (
								<ul className="divide-y divide-border">
									{recentTickets.map((ticket) => (
										<li
											key={ticket.id}
											className="flex items-start justify-between py-3 gap-3">
											<div className="min-w-0">
												<p className="text-sm capitalize font-medium truncate">
													{ticket.category} - {ticket.reason}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{ticket.user_email}
												</p>
											</div>
											<Badge
												variant={ticketStatusVariant(ticket.status)}
												className="shrink-0">
												{ticket.status.replace("_", " ")}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					{/* Recent Calls */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-semibold">
								Recent Calls
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							{recentCalls.length === 0 ? (
								<p className="text-sm text-muted-foreground py-4 text-center">
									No calls yet
								</p>
							) : (
								<ul className="divide-y divide-border">
									{recentCalls.map((call) => (
										<li
											key={call.id}
											className="flex items-start justify-between py-3 gap-3">
											<div className="min-w-0">
												<p className="text-xs font-mono text-muted-foreground truncate">
													{call.id}
												</p>
												<p className="text-xs text-muted-foreground">
													{call.createdAt
														? format(new Date(call.createdAt), "MMM d, HH:mm")
														: "—"}
												</p>
											</div>
											<div className="flex flex-col items-end gap-1 shrink-0">
												<Badge
													variant={
														call.status === "ended"
															? "success"
															: call.status === "in-progress"
																? "accent"
																: "outline"
													}>
													{call.status}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatDuration(call.durationSeconds)}
												</span>
											</div>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
