"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Search, RefreshCw, Mic, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import axios from "axios";
import { formatDuration, computeDuration, type VapiCall } from "@/lib/vapi-api";
import { Phone, Clock, CheckCircle2, AlertTriangle, DollarSign } from "lucide-react";

function callStatusVariant(
  status: string,
  endedReason?: string | null
): "success" | "warning" | "destructive" | "accent" | "outline" {
  if (status === "ended") {
    if (endedReason === "assistant-ended-call" || endedReason === "customer-ended-call") return "success";
    if (endedReason === "exceeded-max-duration") return "warning";
    if (endedReason === "transfer-failed" || endedReason === "customer-did-not-answer") return "destructive";
    return "outline";
  }
  if (status === "in-progress") return "accent";
  if (status === "ringing") return "warning";
  return "outline";
}

function callStatusLabel(status: string, endedReason?: string | null): string {
  if (status === "ended" && endedReason) {
    return endedReason
      .replace(/-/g, " ")
      .replace(/^./, (c) => c.toUpperCase());
  }
  return status.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 20;

export default function CallsPage() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [filtered, setFiltered] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<VapiCall | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchCalls = useCallback(async () => {
    const isInitial = !hasFetchedRef.current;
    if (isInitial) setLoading(true);
    try {
      const { data } = await axios.get<{ calls: VapiCall[] }>("/api/vapi/calls?limit=200");
      const raw = data.calls ?? [];
      setCalls(raw.map((c) => ({
        ...c,
        durationSeconds: computeDuration(c),
      })));
      hasFetchedRef.current = true;
      setLastUpdated(new Date());
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
    intervalRef.current = setInterval(fetchCalls, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCalls]);

  useEffect(() => {
    let result = calls;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          (c.summary ?? "").toLowerCase().includes(q) ||
          (c.endedReason ?? "").toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    setPage(1);
  }, [calls, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === "ended").length;
  const avgDuration =
    calls.filter((c) => c.durationSeconds).length > 0
      ? Math.round(
          calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
            calls.filter((c) => c.durationSeconds).length
        )
      : null;
  const failedCalls = calls.filter(
    (c) => c.endedReason === "transfer-failed" || c.endedReason === "customer-did-not-answer"
  ).length;
  const callsWithCost = calls.filter((c) => c.cost != null);
  const avgCost =
    callsWithCost.length > 0
      ? callsWithCost.reduce((s, c) => s + c.cost!, 0) / callsWithCost.length
      : null;

  return (
    <>
      <Header
        title="Call Logs"
        description="Voice interactions handled by the support agent"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Total Calls" value={totalCalls} icon={Phone} />
          <MetricCard
            title="Completed"
            value={completedCalls}
            subtitle={`${totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}% completion rate`}
            icon={CheckCircle2}
          />
          <MetricCard
            title="Avg Duration"
            value={formatDuration(avgDuration)}
            icon={Clock}
          />
          <MetricCard
            title="Failed / Unanswered"
            value={failedCalls}
            icon={AlertTriangle}
          />
          <MetricCard
            title="Avg Call Cost"
            value={avgCost != null ? `$${avgCost.toFixed(4)}` : "—"}
            subtitle={callsWithCost.length > 0 ? `across ${callsWithCost.length} calls` : "No cost data"}
            icon={DollarSign}
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="text-sm font-semibold flex-1">All Calls</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search call ID or summary..."
                    className="pl-8 h-8 w-56 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="ringing">Ringing</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                  </SelectContent>
                </Select>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Updated {format(lastUpdated, "HH:mm:ss")}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchCalls}
                  title="Refresh"
                >
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
                No calls found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>AI Evaluation</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(call)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                        {call.id}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {call.createdAt
                          ? format(new Date(call.createdAt), "MMM d, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDuration(call.durationSeconds)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={callStatusVariant(call.status, call.endedReason)}
                          className="text-xs"
                        >
                          {call.status === "ended"
                            ? call.endedReason
                              ? callStatusLabel(call.status, call.endedReason).substring(0, 22)
                              : "Ended"
                            : callStatusLabel(call.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {call.cost != null ? `$${call.cost.toFixed(4)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {call.analysis?.successEvaluation ? (
                          <Badge
                            variant={
                              call.analysis.successEvaluation === "true"
                                ? "success"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {call.analysis.successEvaluation === "true" ? "Successful" : "Unsuccessful"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && filtered.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} calls
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Call Detail
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {selected.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Started</p>
                  <p>{selected.startedAt ? format(new Date(selected.startedAt), "PPpp") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Ended</p>
                  <p>{selected.endedAt ? format(new Date(selected.endedAt), "PPpp") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Duration</p>
                  <p>{formatDuration(selected.durationSeconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Cost</p>
                  <p>{selected.cost != null ? `$${selected.cost.toFixed(4)}` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">End Reason</p>
                  <p>{selected.endedReason?.replace(/-/g, " ") ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">AI Evaluation</p>
                  <p>{selected.analysis?.successEvaluation ?? "—"}</p>
                </div>
              </div>

              {/* Summary */}
              {selected.summary && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Summary</p>
                  <p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
                    {selected.summary}
                  </p>
                </div>
              )}

              {/* AI Analysis Summary */}
              {selected.analysis?.summary && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">AI Analysis</p>
                  <p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
                    {selected.analysis.summary}
                  </p>
                </div>
              )}

              {/* Transcript */}
              {selected.transcript && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Transcript</p>
                  <pre className="text-xs leading-relaxed bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selected.transcript}
                  </pre>
                </div>
              )}

              {/* Recording */}
              {selected.recordingUrl && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Recording</p>
                  <audio controls className="w-full" src={selected.recordingUrl} />
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
