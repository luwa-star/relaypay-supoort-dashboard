"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
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
	DialogDescription,
} from "@/components/ui/dialog";
import { supabase, type ErrorLog } from "@/lib/supabase";
import { Activity, Link2, Ticket } from "lucide-react";

const PAGE_SIZE = 25;

export default function ErrorLogsPage() {
	const [errors, setErrors] = useState<ErrorLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [workflowFilter, setWorkflowFilter] = useState("all");
	const [selected, setSelected] = useState<ErrorLog | null>(null);
	const [page, setPage] = useState(1);

	const fetchErrors = useCallback(async () => {
		setLoading(true);
		const { data } = await supabase
			.from("Errors")
			.select("*")
			.order("created_at", { ascending: false });
		setErrors((data as ErrorLog[]) ?? []);
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchErrors();
	}, [fetchErrors]);

	const workflows = useMemo(
		() => Array.from(new Set(errors.map((e) => e.workflow).filter(Boolean))) as string[],
		[errors],
	);

	const filtered = useMemo(() => {
		let result = errors;
		if (workflowFilter !== "all") {
			result = result.filter((e) => e.workflow === workflowFilter);
		}
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(e) =>
					(e.message ?? "").toLowerCase().includes(q) ||
					(e.workflow ?? "").toLowerCase().includes(q) ||
					(e.step ?? "").toLowerCase().includes(q) ||
					(e.ticket_id ?? "").toLowerCase().includes(q) ||
					(e.call_id ?? "").toLowerCase().includes(q),
			);
		}
		return result;
	}, [errors, workflowFilter, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const withTicket = errors.filter((e) => e.ticket_id).length;
	const withCall = errors.filter((e) => e.call_id).length;
	const uniqueWorkflows = workflows.length;

	return (
		<>
			<Header
				title="Error Logs"
				description="Workflow errors captured during automated support processing"
			/>

			<div className="p-6 space-y-6">
				{/* KPIs */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<MetricCard
						title="Total Errors"
						value={errors.length}
						subtitle="All time"
						icon={AlertCircle}
					/>
					<MetricCard
						title="Workflows Affected"
						value={uniqueWorkflows}
						subtitle="Distinct workflows"
						icon={Activity}
					/>
					<MetricCard
						title="Linked to Tickets"
						value={withTicket}
						subtitle="With a ticket ID"
						icon={Ticket}
					/>
					<MetricCard
						title="Linked to Calls"
						value={withCall}
						subtitle="With a call ID"
						icon={Link2}
					/>
				</div>

				{/* Table */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3">
							<CardTitle className="text-sm font-semibold flex-1">
								All Errors
							</CardTitle>
							<div className="flex flex-wrap items-center gap-2">
								<div className="relative">
									<Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search message, step..."
										className="pl-8 h-8 w-52 text-sm"
										value={search}
										onChange={(e) => { setSearch(e.target.value); setPage(1); }}
									/>
								</div>
								<Select
									value={workflowFilter}
									onValueChange={(v) => { setWorkflowFilter(v); setPage(1); }}>
									<SelectTrigger className="h-8 w-40 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All workflows</SelectItem>
										{workflows.map((w) => (
											<SelectItem key={w} value={w}>
												{w}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="icon"
									onClick={fetchErrors}
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
								No errors found
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Time</TableHead>
										<TableHead>Workflow</TableHead>
										<TableHead>Step</TableHead>
										<TableHead>Message</TableHead>
										<TableHead>Ticket ID</TableHead>
										<TableHead>Call ID</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginated.map((err) => (
										<TableRow
											key={err.id}
											className="cursor-pointer"
											onClick={() => setSelected(err)}>
											<TableCell className="text-xs whitespace-nowrap text-muted-foreground">
												{format(new Date(err.created_at), "MMM d, yyyy HH:mm")}
											</TableCell>
											<TableCell>
												{err.workflow ? (
													<Badge variant="outline" className="text-xs font-mono">
														{err.workflow}
													</Badge>
												) : (
													<span className="text-xs text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
												{err.step ?? "—"}
											</TableCell>
											<TableCell className="text-sm max-w-[280px] truncate">
												{err.message ?? "—"}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">
												{err.ticket_id ?? "—"}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">
												{err.call_id ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						{!loading && filtered.length > 0 && (
							<div className="mt-3 flex items-center justify-between">
								<p className="text-xs text-muted-foreground">
									{filtered.length === errors.length
										? `${filtered.length} errors`
										: `${filtered.length} of ${errors.length} errors`}
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

			{/* Error Detail Dialog */}
			<Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
				{selected && (
					<DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<AlertCircle className="h-4 w-4 text-destructive" />
								Error Detail
							</DialogTitle>
							<DialogDescription className="font-mono text-xs">
								{format(new Date(selected.created_at), "PPpp")}
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
										Workflow
									</p>
									<p className="font-mono text-sm">{selected.workflow ?? "—"}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
										Step
									</p>
									<p className="font-mono text-sm">{selected.step ?? "—"}</p>
								</div>
								{selected.ticket_id && (
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
											Ticket ID
										</p>
										<p className="font-mono text-xs break-all">{selected.ticket_id}</p>
									</div>
								)}
								{selected.call_id && (
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
											Call ID
										</p>
										<p className="font-mono text-xs break-all">{selected.call_id}</p>
									</div>
								)}
							</div>

							{selected.message && (
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
										Message
									</p>
									<pre className="text-xs leading-relaxed bg-destructive/5 border border-destructive/20 rounded-md p-3 whitespace-pre-wrap break-words">
										{selected.message}
									</pre>
								</div>
							)}
						</div>
					</DialogContent>
				)}
			</Dialog>
		</>
	);
}
