import { useEffect, useMemo, useRef, useState } from "react";

import { createRealtimeConnection, type RealtimeChannel } from "./api";

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error"
  | "disconnected";

export type RealtimeEventEnvelope = {
  event: string;
  occurredAt: string;
  scanId: string;
  payload: Record<string, unknown>;
};

type UseRealtimeSubscriptionOptions = {
  scanId: string | null;
  channels: RealtimeChannel[];
  onEvent?: (event: RealtimeEventEnvelope) => void;
  enabled?: boolean;
};

export function useRealtimeSubscription({
  scanId,
  channels,
  onEvent,
  enabled = true,
}: UseRealtimeSubscriptionOptions): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const channelKey = useMemo(
    () => [...channels].sort((left, right) => left.localeCompare(right)).join("|"),
    [channels]
  );

  useEffect(() => {
    if (!enabled || !scanId) {
      setStatus("idle");
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) {
        return;
      }
      clearReconnectTimer();
      const delayMs = Math.min(1000 * 2 ** reconnectAttempt, 12000);
      reconnectAttempt += 1;
      setStatus(navigator.onLine ? "reconnecting" : "offline");
      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, delayMs);
    };

    const connect = async () => {
      if (disposed) {
        return;
      }

      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      setStatus(reconnectAttempt === 0 ? "connecting" : "reconnecting");

      try {
        const descriptor = await createRealtimeConnection({
          scanId,
          channels,
          preferredTransport: "websocket",
        });

        if (disposed) {
          return;
        }

        if (descriptor.transport !== "websocket") {
          setStatus("error");
          return;
        }

        const endpointUrl = new URL(descriptor.endpoint);
        endpointUrl.searchParams.set("token", descriptor.token);

        socket = new WebSocket(endpointUrl.toString());

        socket.onopen = () => {
          reconnectAttempt = 0;
          setStatus("connected");
        };

        socket.onmessage = (rawEvent) => {
          try {
            const parsed = JSON.parse(String(rawEvent.data)) as Partial<RealtimeEventEnvelope>;
            if (typeof parsed.event !== "string" || typeof parsed.scanId !== "string") {
              return;
            }

            onEventRef.current?.({
              event: parsed.event,
              occurredAt: typeof parsed.occurredAt === "string" ? parsed.occurredAt : new Date().toISOString(),
              scanId: parsed.scanId,
              payload: typeof parsed.payload === "object" && parsed.payload ? parsed.payload : {},
            });
          } catch {
            // Ignore malformed messages to keep the stream alive.
          }
        };

        socket.onerror = () => {
          setStatus("error");
        };

        socket.onclose = () => {
          if (disposed) {
            return;
          }
          scheduleReconnect();
        };
      } catch {
        if (disposed) {
          return;
        }
        setStatus("error");
        scheduleReconnect();
      }
    };

    const handleOnline = () => {
      if (disposed) {
        return;
      }
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }
      reconnectAttempt = 0;
      void connect();
    };

    const handleOffline = () => {
      setStatus("offline");
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [scanId, channelKey, enabled]);

  return status;
}
