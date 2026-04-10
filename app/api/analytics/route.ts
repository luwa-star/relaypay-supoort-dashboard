import { NextResponse } from "next/server";
import { computeDuration, type VapiCall } from "@/lib/vapi-api";
import { supabase, type Ticket } from "@/lib/supabase";

const COMPLETED_REASONS = new Set([
	"customer-ended-call",
	"assistant-ended-call",
]);

export async function GET() {
	const [vapiData, { data: tickets }] = await Promise.all([
		fetch(
			`https://api.vapi.ai/call?assistantId=${process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID}&limit=1000`,
			{
				headers: {
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_VAPI_PRIVATE_KEY}`,
				},
				next: { revalidate: 60 },
			},
		).then((r) => r.json()),
		supabase.from("tickets").select("*"),
	]);

	const calls: VapiCall[] = (Array.isArray(vapiData) ? vapiData : []).map(
		(c) => ({
			...c,
			durationSeconds: computeDuration(c),
		}),
	);
	const safeTickets: Ticket[] = tickets ?? [];

	const escalatedCallIds = new Set(
		safeTickets.map((t) => t.vapi_call_id).filter(Boolean),
	);

	const successful = calls.filter((c) =>
		COMPLETED_REASONS.has(c.endedReason ?? ""),
	);
	const escalated = calls.filter((c) => escalatedCallIds.has(c.id));
	const dropped = calls.filter(
		(c) => !COMPLETED_REASONS.has(c.endedReason ?? ""),
	);

	const callsWithDuration = calls.filter((c) => c.durationSeconds);
	const avgDurationSec =
		callsWithDuration.length > 0
			? Math.round(
					calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
						callsWithDuration.length,
				)
			: 0;

	const openTickets = safeTickets.filter((t) => t.status === "Open").length;
	const resolvedTickets = safeTickets.filter((t) => t.status === "Closed").length;
	const totalTickets = safeTickets.length;

	return NextResponse.json({
		calls,
		tickets: safeTickets,
		total: calls.length,
		successful: successful.length,
		escalated: escalated.length,
		dropped: dropped.length,
		successRate:
			calls.length > 0
				? ((successful.length / calls.length) * 100).toFixed(1)
				: "0.0",
		escalationRate:
			calls.length > 0
				? ((escalated.length / calls.length) * 100).toFixed(1)
				: "0.0",
		avgDurationSec,
		openTickets,
		resolvedTickets,
		totalTickets,
		resolutionRate:
			totalTickets > 0
				? ((resolvedTickets / totalTickets) * 100).toFixed(1)
				: "0.0",
	});
}
