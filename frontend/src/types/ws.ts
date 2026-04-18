export type AgentEvent =
  | { event: "captcha_block"; broker: string; type: string }
  | { event: "agent_resumed" }
  | { event: "threat_found"; broker: string; data: Record<string, unknown> }
  | { event: "request_sent"; broker: string; legal_framework: string }
  | { event: "email_reply"; broker: string; intent: "success" | "stall" | "illegal" };
