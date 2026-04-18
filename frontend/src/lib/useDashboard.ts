import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "./apiClient";
import type { RealtimeChannel } from "./api";
import { useRealtimeSubscription, type RealtimeConnectionStatus } from "./wsClient";
import type { SleuthEvent } from "../types/ws";

const DASHBOARD_LOG_PREFIX = "[datareaper:dashboard]";
const DASHBOARD_DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG_DASHBOARD === "true";

function dashboardDebug(message: string, context?: Record<string, unknown>): void {
  if (!DASHBOARD_DEBUG_ENABLED) {
    return;
  }
  if (context) {
    console.debug(`${DASHBOARD_LOG_PREFIX} ${message}`, context);
    return;
  }
  console.debug(`${DASHBOARD_LOG_PREFIX} ${message}`);
}

function dashboardWarn(message: string, context?: Record<string, unknown>): void {
  if (context) {
    console.warn(`${DASHBOARD_LOG_PREFIX} ${message}`, context);
    return;
  }
  console.warn(`${DASHBOARD_LOG_PREFIX} ${message}`);
}

function dashboardError(message: string, context?: Record<string, unknown>): void {
  if (context) {
    console.error(`${DASHBOARD_LOG_PREFIX} ${message}`, context);
    return;
  }
  console.error(`${DASHBOARD_LOG_PREFIX} ${message}`);
}

function toErrorContext(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) {
    return { error: String(error) };
  }

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    response?: { status?: unknown; data?: unknown };
    config?: { url?: unknown; method?: unknown };
  };

  return {
    name: typeof candidate.name === "string" ? candidate.name : "UnknownError",
    message: typeof candidate.message === "string" ? candidate.message : String(error),
    code: candidate.code,
    status: candidate.response?.status,
    url: candidate.config?.url,
    method: candidate.config?.method,
    responseData: candidate.response?.data,
  };
}

type DashboardStat = {
  title: string;
  value: number;
};

type DashboardRadarTarget = {
  id: string;
  broker: string;
  status: string;
  angle: number;
  distance: number;
  severity: string;
};

type DashboardActivityItem = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

type DashboardAgentStatus = {
  name: string;
  status: string;
  detail: string;
};

type DashboardResponse = {
  scan_id: string;
  stats: DashboardStat[];
  threat_breakdown: Record<string, number>;
  radar_targets: DashboardRadarTarget[];
  activity_feed: DashboardActivityItem[];
  agent_statuses: DashboardAgentStatus[];
};

type PivotChainResponse = {
  columns?: Array<{ label?: string; values?: string[] }>;
};

export type RadarDot = {
  id: string;
  angle: number;
  distance: number;
  broker: string;
  status: string;
  color: string;
  type: "email" | "phone" | "location";
};

export type ActivityItem = {
  id: string;
  type: string;
  message: string;
  color: string;
  createdAt: string;
};

export type AgentStatus = {
  mode: string;
  name: string;
  status: string;
  task: string;
  progress: number;
};

export interface LiveDashboardState {
  brokerCount: number;
  exposureCount: number;
  deletionCount: number;
  disputeCount: number;
  threatBreakdown: { email: number; phone: number; location: number };
  radarTargets: RadarDot[];
  activityFeed: ActivityItem[];
  agentStatuses: AgentStatus[];
  pivotGraph: {
    emails: string[];
    usernames: string[];
    platforms: string[];
    brokers: string[];
  };
  isLive: boolean;
}

const RADAR_COLORS: Record<"email" | "phone" | "location", string> = {
  email: "#4a6fa5",
  phone: "#d17a22",
  location: "#b94a48",
};

const EMPTY_STATE: LiveDashboardState = {
  brokerCount: 0,
  exposureCount: 0,
  deletionCount: 0,
  disputeCount: 0,
  threatBreakdown: { email: 0, phone: 0, location: 0 },
  radarTargets: [],
  activityFeed: [],
  agentStatuses: [],
  pivotGraph: {
    emails: [],
    usernames: [],
    platforms: [],
    brokers: [],
  },
  isLive: false,
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDistance(distance: number): number {
  if (distance <= 1) {
    return Math.max(5, Math.round(distance * 100));
  }
  return distance;
}

function inferThreatTypeFromData(dataTypes: string[]): "email" | "phone" | "location" {
  const joined = dataTypes.join(" ").toLowerCase();
  if (joined.includes("phone")) {
    return "phone";
  }
  if (joined.includes("location") || joined.includes("address")) {
    return "location";
  }
  return "email";
}

function inferThreatTypeFromSeverity(
  severity: string,
  index: number
): "email" | "phone" | "location" {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") {
    return "location";
  }
  if (normalized === "high") {
    return "phone";
  }
  if (normalized === "medium") {
    return "email";
  }

  const fallbackTypes: Array<"email" | "phone" | "location"> = ["email", "phone", "location"];
  return fallbackTypes[index % fallbackTypes.length] ?? "email";
}

function colorForType(type: "email" | "phone" | "location"): string {
  return RADAR_COLORS[type];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function modeFromAgentName(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes("sleuth")) {
    return "sleuth";
  }
  if (normalized.includes("legal")) {
    return "legal";
  }
  if (normalized.includes("comm")) {
    return "communications";
  }
  return "agent";
}

function progressFromStatus(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("resolved")) {
    return 100;
  }
  if (normalized.includes("active") || normalized.includes("processing") || normalized.includes("engaged")) {
    return 65;
  }
  if (normalized.includes("draft")) {
    return 40;
  }
  return 30;
}

function activityColorForEventType(eventType: string): string {
  if (eventType === "exposure_found") {
    return "#b94a48";
  }
  if (eventType === "broker_contacted" || eventType === "stage_complete") {
    return "#d17a22";
  }
  if (eventType === "deletion_confirmed" || eventType === "agent_resumed") {
    return "#4f7d5c";
  }
  if (eventType === "captcha_block") {
    return "#b94a48";
  }
  return "#4a6fa5";
}

function statValue(stats: DashboardStat[], title: string): number {
  const found = stats.find((item) => item.title === title);
  return found ? toNumber(found.value) : 0;
}

function mapDashboardResponse(response: DashboardResponse): LiveDashboardState {
  const radarTargets = response.radar_targets.map((target, index) => {
    const type = inferThreatTypeFromSeverity(target.severity, index);

    return {
      id: target.id,
      angle: toNumber(target.angle),
      distance: normalizeDistance(toNumber(target.distance)),
      broker: String(target.broker || "Unknown Broker"),
      status: String(target.status || "active"),
      type,
      color: colorForType(type),
    } satisfies RadarDot;
  });

  const brokers = uniqueStrings(radarTargets.map((target) => target.broker));

  return {
    brokerCount: statValue(response.stats, "Brokers Scanned"),
    exposureCount: statValue(response.stats, "Exposures Found"),
    deletionCount: statValue(response.stats, "Deletions Secured"),
    disputeCount: statValue(response.stats, "Active Legal Disputes"),
    threatBreakdown: {
      email: toNumber(response.threat_breakdown.emails_exposed),
      phone: toNumber(response.threat_breakdown.phone_leaks),
      location: toNumber(response.threat_breakdown.location_traces),
    },
    radarTargets,
    activityFeed: response.activity_feed.map((item) => ({
      id: item.id,
      type: String(item.type || "System"),
      message: String(item.message || "No message"),
      color: activityColorForEventType("stage_complete"),
      createdAt: String(item.created_at || new Date().toISOString()),
    })),
    agentStatuses: response.agent_statuses.map((agent) => ({
      mode: modeFromAgentName(String(agent.name || "Agent")),
      name: String(agent.name || "Agent"),
      status: String(agent.status || "Active"),
      task: String(agent.detail || "Processing"),
      progress: progressFromStatus(String(agent.status || "Active")),
    })),
    pivotGraph: {
      emails: [],
      usernames: [],
      platforms: [],
      brokers,
    },
    isLive: false,
  };
}

function eventMessage(event: SleuthEvent): string {
  switch (event.event) {
    case "stage_complete": {
      if (event.payload.stage === "osint_cycle") {
        return "OSINT cycle complete. Continuing live reconnaissance.";
      }
      if (event.payload.stage === "username_pivot") {
        const count = toNumber(event.payload.count ?? event.payload.usernames?.length ?? 0);
        return `Username pivot complete: ${count} usernames discovered.`;
      }
      if (event.payload.stage === "email_probe") {
        return `Email probe matched platform ${event.payload.platform ?? "unknown"}.`;
      }
      if (event.payload.stage === "broker_discovery") {
        return "Broker discovery updated.";
      }
      if (event.payload.stage === "identity_assembly") {
        return "Identity assembly refreshed.";
      }
      return `Stage complete: ${event.payload.stage}`;
    }
    case "exposure_found":
      return `Exposure confirmed at ${event.payload.broker_name}.`;
    case "broker_contacted":
      return `Contacted ${event.payload.broker_name} via ${event.payload.legal_framework}.`;
    case "deletion_confirmed":
      return `Deletion confirmed by ${event.payload.broker_name}.`;
    case "agent_status_change":
      return `${event.payload.agent}: ${event.payload.status} - ${event.payload.detail}`;
    case "captcha_block":
      return `CAPTCHA encountered at ${event.payload.broker}.`;
    case "agent_resumed":
      return "Agent resumed after CAPTCHA resolution.";
    case "scan_stopped":
      return "Scan stopped by user command.";
    case "scan_lifecycle_updated":
      return `Scan lifecycle updated: ${event.payload.status}${
        event.payload.current_stage ? ` (${event.payload.current_stage})` : ""
      }.`;
    default:
      return "Realtime update received.";
  }
}

function pushActivity(
  previous: ActivityItem[],
  event: SleuthEvent,
  occurredAt: string
): ActivityItem[] {
  const entry: ActivityItem = {
    id: `${event.event}-${occurredAt}`,
    type: event.event,
    message: eventMessage(event),
    color: activityColorForEventType(event.event),
    createdAt: occurredAt,
  };

  return [entry, ...previous].slice(0, 120);
}

function parseSleuthEvent(raw: { event: string; payload: Record<string, unknown> }): SleuthEvent | null {
  const { event, payload } = raw;

  switch (event) {
    case "stage_complete":
      return {
        event,
        payload: {
          stage: String(payload.stage ?? "unknown"),
          platform: typeof payload.platform === "string" ? payload.platform : undefined,
          username: typeof payload.username === "string" ? payload.username : undefined,
          usernames: Array.isArray(payload.usernames)
            ? payload.usernames.map((item) => String(item))
            : undefined,
          count: typeof payload.count === "number" ? payload.count : undefined,
          emails: Array.isArray(payload.emails) ? payload.emails.map((item) => String(item)) : undefined,
          broker_name: typeof payload.broker_name === "string" ? payload.broker_name : undefined,
          angle: typeof payload.angle === "number" ? payload.angle : undefined,
          distance: typeof payload.distance === "number" ? payload.distance : undefined,
        },
      };
    case "exposure_found":
      return {
        event,
        payload: {
          broker_name: String(payload.broker_name ?? "Unknown Broker"),
          data_types: Array.isArray(payload.data_types) ? payload.data_types.map((item) => String(item)) : [],
          priority_score: toNumber(payload.priority_score),
          angle: toNumber(payload.angle),
          distance: toNumber(payload.distance),
        },
      };
    case "broker_contacted":
      return {
        event,
        payload: {
          broker_name: String(payload.broker_name ?? "Data Broker"),
          legal_framework: String(payload.legal_framework ?? "DPDP"),
          status: String(payload.status ?? "sent"),
        },
      };
    case "deletion_confirmed":
      return {
        event,
        payload: {
          broker_name: String(payload.broker_name ?? "Data Broker"),
        },
      };
    case "agent_status_change":
      return {
        event,
        payload: {
          agent: String(payload.agent ?? "agent"),
          status: String(payload.status ?? "active"),
          detail: String(payload.detail ?? "Working"),
        },
      };
    case "captcha_block":
      return {
        event,
        payload: {
          broker: String(payload.broker ?? "Unknown"),
          type: String(payload.type ?? "captcha"),
        },
      };
    case "agent_resumed":
      return {
        event,
        payload: {},
      };
    case "scan_stopped":
      return {
        event,
        payload: {
          status: String(payload.status ?? "cancelled"),
          current_stage: String(payload.current_stage ?? "stopped_by_user"),
          reason: String(payload.reason ?? "manual"),
        },
      };
    case "scans.lifecycle.updated":
      return {
        event: "scan_lifecycle_updated",
        payload: {
          status: String(payload.status ?? "unknown"),
          current_stage:
            payload.current_stage === undefined
              ? undefined
              : String(payload.current_stage),
          reason: payload.reason === undefined ? undefined : String(payload.reason),
        },
      };
    default:
      return null;
  }
}

export function useDashboard(scanId: string | null): {
  state: LiveDashboardState;
  connectionStatus: RealtimeConnectionStatus;
  hasError: boolean;
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<LiveDashboardState>(EMPTY_STATE);
  const [hasError, setHasError] = useState(false);

  const realtimeChannels = useMemo<RealtimeChannel[]>(
    () => ["dashboard.summary", "dashboard.radar", "dashboard.activity", "dashboard.agents", "scans.lifecycle"],
    []
  );

  const connectionStatus = useRealtimeSubscription({
    scanId,
    enabled: Boolean(scanId),
    channels: realtimeChannels,
    onEvent: (event) => {
      if (!scanId || event.scanId !== scanId) {
        dashboardDebug("ignoring realtime event for different scan", {
          activeScanId: scanId,
          eventScanId: event.scanId,
          event: event.event,
        });
        return;
      }

      const sleuthEvent = parseSleuthEvent({ event: event.event, payload: event.payload });
      if (!sleuthEvent) {
        dashboardDebug("received unsupported realtime event", {
          scanId,
          event: event.event,
          payload: event.payload,
        });
        return;
      }

      dashboardDebug("processing realtime event", {
        scanId,
        event: sleuthEvent.event,
        occurredAt: event.occurredAt,
      });

      setState((previous) => {
        let next = previous;

        switch (sleuthEvent.event) {
          case "stage_complete": {
            if (sleuthEvent.payload.stage === "username_pivot") {
              const usernames = sleuthEvent.payload.usernames ?? [];
              next = {
                ...next,
                pivotGraph: {
                  ...next.pivotGraph,
                  usernames: uniqueStrings([...next.pivotGraph.usernames, ...usernames]),
                },
              };
            }

            if (sleuthEvent.payload.stage === "email_probe" && sleuthEvent.payload.platform) {
              next = {
                ...next,
                pivotGraph: {
                  ...next.pivotGraph,
                  platforms: uniqueStrings([...next.pivotGraph.platforms, sleuthEvent.payload.platform]),
                },
              };
            }

            if (sleuthEvent.payload.stage === "broker_discovery") {
              const brokerName = sleuthEvent.payload.broker_name ?? "Discovered Broker";
              const angle = toNumber(sleuthEvent.payload.angle ?? 0);
              const distance = normalizeDistance(toNumber(sleuthEvent.payload.distance ?? 0.6));
              const radarTarget: RadarDot = {
                id: `broker-discovery-${event.occurredAt}-${brokerName}`,
                angle,
                distance,
                broker: brokerName,
                status: "active",
                type: "email",
                color: colorForType("email"),
              };

              next = {
                ...next,
                brokerCount: next.brokerCount + 1,
                radarTargets: [radarTarget, ...next.radarTargets].slice(0, 200),
                pivotGraph: {
                  ...next.pivotGraph,
                  brokers: uniqueStrings([...next.pivotGraph.brokers, brokerName]),
                },
              };
            }

            if (sleuthEvent.payload.stage === "identity_assembly") {
              const emails = sleuthEvent.payload.emails ?? [];
              next = {
                ...next,
                pivotGraph: {
                  ...next.pivotGraph,
                  emails: uniqueStrings([...next.pivotGraph.emails, ...emails]),
                },
              };
            }
            break;
          }

          case "exposure_found": {
            const threatType = inferThreatTypeFromData(sleuthEvent.payload.data_types);
            const radarTarget: RadarDot = {
              id: `exposure-${event.occurredAt}-${sleuthEvent.payload.broker_name}`,
              angle: toNumber(sleuthEvent.payload.angle),
              distance: normalizeDistance(toNumber(sleuthEvent.payload.distance)),
              broker: sleuthEvent.payload.broker_name,
              status: "active",
              type: threatType,
              color: colorForType(threatType),
            };

            next = {
              ...next,
              exposureCount: next.exposureCount + 1,
              radarTargets: [radarTarget, ...next.radarTargets].slice(0, 200),
              pivotGraph: {
                ...next.pivotGraph,
                brokers: uniqueStrings([...next.pivotGraph.brokers, sleuthEvent.payload.broker_name]),
              },
              threatBreakdown: {
                ...next.threatBreakdown,
                [threatType]: next.threatBreakdown[threatType] + 1,
              },
            };
            break;
          }

          case "broker_contacted": {
            next = {
              ...next,
              disputeCount: next.disputeCount + 1,
            };
            break;
          }

          case "deletion_confirmed": {
            next = {
              ...next,
              deletionCount: next.deletionCount + 1,
              disputeCount: Math.max(0, next.disputeCount - 1),
            };
            break;
          }

          case "agent_status_change": {
            const normalizedAgent = sleuthEvent.payload.agent.toLowerCase();
            const existingIndex = next.agentStatuses.findIndex((entry) =>
              entry.name.toLowerCase().includes(normalizedAgent)
            );

            const updatedStatus: AgentStatus = {
              mode: modeFromAgentName(sleuthEvent.payload.agent),
              name:
                existingIndex >= 0
                  ? next.agentStatuses[existingIndex]?.name ?? sleuthEvent.payload.agent
                  : sleuthEvent.payload.agent,
              status: sleuthEvent.payload.status,
              task: sleuthEvent.payload.detail,
              progress: progressFromStatus(sleuthEvent.payload.status),
            };

            if (existingIndex >= 0) {
              const cloned = [...next.agentStatuses];
              cloned[existingIndex] = updatedStatus;
              next = {
                ...next,
                agentStatuses: cloned,
              };
            } else {
              next = {
                ...next,
                agentStatuses: [...next.agentStatuses, updatedStatus],
              };
            }
            break;
          }

          case "captcha_block":
          case "agent_resumed":
          case "scan_stopped":
          case "scan_lifecycle_updated":
            break;
        }

        return {
          ...next,
          activityFeed: pushActivity(next.activityFeed, sleuthEvent, event.occurredAt),
        };
      });
    },
  });

  const refetch = useCallback(async () => {
    if (!scanId) {
      dashboardDebug("refetch skipped because scanId is missing");
      setState(EMPTY_STATE);
      setHasError(false);
      return;
    }

    dashboardDebug("dashboard refetch started", { scanId });

    try {
      const [dashboardResponse, pivotResponse] = await Promise.all([
        apiClient.get<DashboardResponse>(`/api/dashboard/${scanId}`),
        apiClient.get<PivotChainResponse>(`/v1/scans/${scanId}/dashboard/pivot-chain`),
      ]);

      const mappedDashboard = mapDashboardResponse(dashboardResponse.data);
      const pivotColumns = Array.isArray(pivotResponse.data?.columns)
        ? pivotResponse.data.columns
        : [];

      const columnValues = (label: string) => {
        const found = pivotColumns.find(
          (column) => String(column?.label || "").trim().toLowerCase() === label
        );
        return Array.isArray(found?.values) ? found.values.map((value) => String(value)) : [];
      };

      setState((previous) => ({
        ...mappedDashboard,
        pivotGraph: {
          emails: uniqueStrings(columnValues("emails")),
          usernames: uniqueStrings(columnValues("usernames")),
          platforms: uniqueStrings(columnValues("platforms")),
          brokers: uniqueStrings([
            ...mappedDashboard.pivotGraph.brokers,
            ...columnValues("brokers"),
          ]),
        },
        isLive: previous.isLive,
      }));
      setHasError(false);
      dashboardDebug("dashboard refetch succeeded", {
        scanId,
        brokers: mappedDashboard.brokerCount,
        exposures: mappedDashboard.exposureCount,
        activityCount: mappedDashboard.activityFeed.length,
        radarCount: mappedDashboard.radarTargets.length,
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLive: false,
      }));
      setHasError(true);
      dashboardError("dashboard refetch failed", {
        scanId,
        ...toErrorContext(error),
      });
    }
  }, [scanId]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (cancelled) {
        dashboardDebug("initial dashboard load skipped because effect was cancelled", { scanId });
        return;
      }
      await refetch();
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refetch]);

  useEffect(() => {
    dashboardDebug("realtime connection status changed", {
      scanId,
      connectionStatus,
    });
    setState((previous) => ({
      ...previous,
      isLive: connectionStatus === "connected",
    }));
  }, [connectionStatus, scanId]);

  return {
    state,
    connectionStatus,
    hasError,
    refetch,
  };
}
