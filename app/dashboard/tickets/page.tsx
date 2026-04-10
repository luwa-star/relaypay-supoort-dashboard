"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Search, RefreshCw, ExternalLink, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Ticket,
	XCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
} from "lucide-react";
import {
	supabase,
	TicketPriority,
	TicketPriorityValue,
	type Ticket as SupaTicket,
	type TicketStatus,
} from "@/lib/supabase";

function statusVariant(
	s: TicketStatus,
): "default" | "success" | "warning" | "destructive" | "outline" | "accent" {
	switch (s) {
		case "Open":
			return "accent";
		case "In Progress":
			return "warning";
		case "Closed":
			return "success";
		case "Canceled":
			return "outline";
		case "Backlog":
			return "destructive";
		default:
			return "outline";
	}
}

function priorityVariant(
	p: TicketPriorityValue,
): "default" | "success" | "warning" | "destructive" | "outline" {
	switch (p) {
		case "urgent":
			return "destructive";
		case "high":
			return "warning";
		case "medium":
			return "default";
		case "low":
			return "outline";
		default:
			return "outline";
	}
}

export default function TicketsPage() {
	const [tickets, setTickets] = useState<SupaTicket[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string | TicketStatus>(
		"all",
	);
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [selected, setSelected] = useState<SupaTicket | null>(null);
	const [copiedCallId, setCopiedCallId] = useState(false);
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 25;

	const fetchTickets = useCallback(async () => {
		setLoading(true);
		const { data } = await supabase
			.from("tickets")
			.select("*")
			.order("created_at", { ascending: false });
		setTickets((data as SupaTicket[]) ?? []);
		setLoading(false);
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchTickets();
	}, [fetchTickets]);

	const filtered = useMemo(() => {
		let result = tickets;
		if (statusFilter !== "all")
			result = result.filter((t) => t.status === statusFilter);
		if (priorityFilter !== "all")
			result = result.filter((t) => t.urgency === Number(priorityFilter));
		if (categoryFilter !== "all")
			result = result.filter((t) => t.category === categoryFilter);
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(t) =>
					t.reason.toLowerCase().includes(q) ||
					t.category.toLowerCase().includes(q) ||
					t.summary.toLowerCase().includes(q) ||
					t.user_email.toLowerCase().includes(q) ||
					(t.vapi_call_id ?? "").toLowerCase().includes(q) ||
					(t.ticket_identifier ?? "").toLowerCase().includes(q),
			);
		}
		return result;
	}, [tickets, statusFilter, priorityFilter, categoryFilter, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const open = tickets.filter((t) => t.status === "Open").length;
	const inProgress = tickets.filter((t) => t.status === "In Progress").length;
	const resolved = tickets.filter((t) => t.status === "Closed").length;
	const canceled = tickets.filter((t) => t.status === "Canceled").length;
	const backlog = tickets.filter((t) => t.status === "Backlog").length;

	const avgResolutionMs = tickets
		.filter((t) => t.resolved_at && t.created_at)
		.map(
			(t) =>
				new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime(),
		)
		.reduce((a, b, _, arr) => a + b / arr.length, 0);

	const avgResolutionHours =
		avgResolutionMs > 0 ? (avgResolutionMs / 1000 / 60 / 60).toFixed(1) : null;

	return (
		<>
			<Header
				title="Tickets"
				description="Support tickets linked to voice interactions"
			/>

			<div className="p-6 space-y-6">
				{/* KPIs */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<MetricCard
						title="Open"
						value={open}
						subtitle="Awaiting human review"
						icon={Ticket}
						accent
					/>
					<MetricCard
						title="In Progress"
						value={inProgress}
						subtitle="Being handled"
						icon={Clock}
					/>
					<MetricCard
						title="Resolved"
						value={resolved}
						subtitle="Completed tickets"
						icon={CheckCircle2}
					/>
					<MetricCard
						title="Canceled"
						value={canceled}
						subtitle="Canceled tickets"
						icon={XCircle}
					/>
					<MetricCard
						title="Backlog"
						value={backlog}
						subtitle="Backlog tickets"
						icon={AlertTriangle}
					/>
				</div>

				{/* Avg resolution time callout */}
				{avgResolutionHours && (
					<div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-4 py-2.5 text-sm text-primary">
						<CheckCircle2 className="h-4 w-4 shrink-0" />
						Average resolution time: <strong>{avgResolutionHours}h</strong>
					</div>
				)}

				{/* Table */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3">
							<CardTitle className="text-sm font-semibold flex-1">
								All Tickets
							</CardTitle>
							<div className="flex flex-wrap items-center gap-2">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search tickets..."
										className="pl-8 h-8 w-44 text-sm"
										value={search}
										onChange={(e) => { setSearch(e.target.value); setPage(1); }}
									/>
								</div>
								<Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
									<SelectTrigger className="h-8 w-32 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All statuses</SelectItem>
										<SelectItem value="Open">Open</SelectItem>
										<SelectItem value="In Progress">In Progress</SelectItem>
										<SelectItem value="Closed">Resolved</SelectItem>
										<SelectItem value="Canceled">Canceled</SelectItem>
										<SelectItem value="Backlog">Backlog</SelectItem>
									</SelectContent>
								</Select>
								<Select
									value={priorityFilter as string}
									onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
									<SelectTrigger className="h-8 w-32 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All priorities</SelectItem>
										<SelectItem value="1">Urgent</SelectItem>
										<SelectItem value="2">High</SelectItem>
										<SelectItem value="3">Medium</SelectItem>
										<SelectItem value="4">Low</SelectItem>
									</SelectContent>
								</Select>
								<Select
									value={categoryFilter}
									onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
									<SelectTrigger className="h-8 w-32 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All categories</SelectItem>
										<SelectItem value="onboarding">Onboarding</SelectItem>
										<SelectItem value="payment">Payment</SelectItem>
										<SelectItem value="invoice">Invoice</SelectItem>
										<SelectItem value="compliance">Compliance</SelectItem>
										<SelectItem value="technical">Technical</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="icon"
									onClick={fetchTickets}
									title="Refresh">
									<RefreshCw className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						{loading ? (
							<div className="space-y-2">
								{Array.from({ length: 8 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : filtered.length === 0 ? (
							<div className="py-12 text-center text-sm text-muted-foreground">
								No tickets found
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Subject</TableHead>
										<TableHead>Customer</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Priority</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Call ID</TableHead>
										<TableHead>Created</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginated.map((ticket) => (
										<TableRow
											key={ticket.id}
											className="cursor-pointer"
											onClick={() => setSelected(ticket)}>
											<TableCell className="font-medium text-sm max-w-[200px] truncate">
												{ticket.category} - {ticket.reason}
											</TableCell>
											<TableCell className="text-sm">
												<div>
													<p className="font-medium">
														{ticket.user_email || "-"}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<span className="text-xs capitalize">
													{ticket.category}
												</span>
											</TableCell>
											<TableCell>
												<Badge
													variant={priorityVariant(
														TicketPriority[
															ticket.urgency
														] as TicketPriorityValue,
													)}
													className="text-xs capitalize">
													{TicketPriority[ticket.urgency]}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={statusVariant(ticket.status)}
													className="text-xs">
													{ticket.status.replace("_", " ")}
												</Badge>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">
												{ticket.vapi_call_id ?? "—"}
											</TableCell>
											<TableCell className="text-xs whitespace-nowrap text-muted-foreground">
												{format(new Date(ticket.created_at), "MMM d, yyyy")}
											</TableCell>
											<TableCell>
												<ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						{!loading && filtered.length > 0 && (
							<div className="mt-3 flex items-center justify-between">
								<p className="text-xs text-muted-foreground">
									{filtered.length === tickets.length
										? `${filtered.length} tickets`
										: `${filtered.length} of ${tickets.length} tickets`}
								</p>
								{totalPages > 1 && (
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="icon"
											className="h-7 w-7"
											onClick={() => setPage((p) => p - 1)}
											disabled={safePage === 1}>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="text-xs px-2 tabular-nums">
											{safePage} / {totalPages}
										</span>
										<Button
											variant="outline"
											size="icon"
											className="h-7 w-7"
											onClick={() => setPage((p) => p + 1)}
											disabled={safePage === totalPages}>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Ticket Detail Dialog */}
			<Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
				{selected && (
					<DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>
								{selected.category} - {selected.reason}
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							<div className="flex flex-wrap gap-2">
								<Badge variant={statusVariant(selected.status)}>
									{selected.status.replace("_", " ")}
								</Badge>
								<Badge
									variant={priorityVariant(
										TicketPriority[selected.urgency] as TicketPriorityValue,
									)}
									className="capitalize">
									{TicketPriority[selected.urgency]}
								</Badge>
								<Badge variant="outline" className="capitalize">
									{selected.category}
								</Badge>
							</div>

							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
										Customer
									</p>
									<p className="font-medium">{selected.user_email}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
										Created
									</p>
									<p>{format(new Date(selected.created_at), "PPpp")}</p>
								</div>
								{selected.resolved_at && (
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
											Resolved
										</p>
										<p>{format(new Date(selected.resolved_at), "PPpp")}</p>
									</div>
								)}
								{selected.vapi_call_id && (
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
											Linked Call
										</p>
										<div className="flex items-center gap-1.5">
											<p className="font-mono text-xs break-all">
												{selected.vapi_call_id}
											</p>
											<button
												onClick={() => {
													navigator.clipboard.writeText(selected.vapi_call_id!);
													setCopiedCallId(true);
													setTimeout(() => setCopiedCallId(false), 2000);
												}}
												className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
												title="Copy call ID">
												{copiedCallId ? (
													<Check className="h-3 w-3" />
												) : (
													<Copy className="h-3 w-3" />
												)}
											</button>
										</div>
									</div>
								)}
								{selected.ticket_url && selected.ticket_id && (
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
											Ticket URL
										</p>
										<div className="flex items-center gap-1.5">
											<p className="font-mono text-xs break-all">
												{selected.ticket_identifier || selected.ticket_id}
											</p>
											<a
												href={selected.ticket_url}
												target="_blank"
												rel="noopener noreferrer"
												className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
												title="Open ticket in new tab">
												<ExternalLink className="h-3 w-3" />
											</a>
										</div>
									</div>
								)}
							</div>

							{selected.summary && selected.reason && (
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
										Description
									</p>
									<p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
										{selected.summary}
									</p>
									<p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
										{selected.reason}
									</p>
									{(() => {
										const entries = Object.entries(selected.transaction_details ?? {}).filter(
											([, value]) => value !== null && value !== undefined && value !== ""
										);
										return entries.length > 0 ? (
											<div className="p-3 bg-muted/50 rounded-md">
												<p className="text-xs uppercase tracking-wide mb-2">
													Transaction Details
												</p>
												<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
													{entries.map(([key, value]) => (
														<>
															<dt key={`${key}-key`} className="text-xs text-muted-foreground capitalize">
																{key.replace(/_/g, " ")}
															</dt>
															<dd key={`${key}-val`} className="text-xs font-mono break-all">
																{String(value)}
															</dd>
														</>
													))}
												</dl>
											</div>
										) : null;
									})()}
								</div>
							)}

							{selected.assigned_agent_id && (
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
										Agent
									</p>
									<p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
										{selected.assigned_agent}
									</p>
								</div>
							)}
						</div>
					</DialogContent>
				)}
			</Dialog>
		</>
	);
}
