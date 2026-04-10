import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — auth-aware (reads session from cookies automatically).
 * Safe to use in "use client" components.
 */
export const supabase = createBrowserClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type TicketStatus =
	| "Open"
	| "In Progress"
	| "Closed"
	| "Backlog"
	| "Canceled";

export type TicketPriorityValue =
	| "no priority"
	| "low"
	| "medium"
	| "high"
	| "urgent";

export const TicketPriority: Record<number, string> = {
	0: "no priority",
	1: "urgent",
	2: "high",
	3: "medium",
	4: "low",
};

export type TicketCategory =
	| "onboarding"
	| "payment"
	| "invoice"
	| "compliance"
	| "technical"
	| "other";

export interface ErrorLog {
	id: string;
	created_at: string;
	workflow: string | null;
	message: string | null;
	step: string | null;
	ticket_id: string | null;
	call_id: string | null;
}

export interface Ticket {
	id: string;
	ticket_id: string;
	ticket_url: string;
	ticket_identifier: string;
	vapi_call_id: string | null;
	user_email: string;
	reason: string;
	summary: string;
	status: TicketStatus;
	urgency: number;
	category: TicketCategory;
	assigned_agent: string | null;
	assigned_agent_id: string | null;
	transaction_details: Record<string, string | number>;
	created_at: Date | string;
	updated_at: Date | string;
	resolved_at: Date | string | null;
}
