export type CallStatus = "queued" | "ringing" | "in-progress" | "forwarding" | "ended";

export type CallEndedReason =
  | "assistant-ended-call"
  | "customer-ended-call"
  | "customer-did-not-answer"
  | "exceeded-max-duration"
  | "pipeline-error-openai-llm-failed"
  | "pipeline-error-azure-openai-llm-failed"
  | "voicemail"
  | "customer-busy"
  | "silence-timed-out"
  | "worker-shutdown"
  | "assistant-not-found"
  | "call-start-error-vapi-request-failed"
  | "assistant-error"
  | "assistant-said-end-call-phrase"
  | "transfer-failed"
  | string;

export interface VapiCallAnalysis {
  summary?: string;
  successEvaluation?: string;
  structuredData?: Record<string, unknown>;
}

export interface VapiCall {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  type: string;
  status: CallStatus;
  endedReason: CallEndedReason | null;
  transcript: string | null;
  recordingUrl: string | null;
  summary: string | null;
  assistantId: string | null;
  cost: number | null;
  costBreakdown: Record<string, number> | null;
  analysis: VapiCallAnalysis | null;
  metadata: Record<string, unknown> | null;
  /** Duration in seconds — computed from startedAt/endedAt */
  durationSeconds: number | null;
}

export function computeDuration(call: VapiCall): number | null {
  if (!call.startedAt || !call.endedAt) return null;
  const start = new Date(call.startedAt).getTime();
  const end = new Date(call.endedAt).getTime();
  return Math.round((end - start) / 1000);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
