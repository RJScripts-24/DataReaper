import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { X, Play, Filter, Eye, EyeOff } from "lucide-react";

import { PressureFilter } from "../components/PressureFilter";
import { PressureText } from "../components/PressureText";
import {
  dataReaperQueryKeys,
  useIdentityGraphNodeQuery,
  useIdentityGraphQuery,
  useScanStatusQuery,
} from "../lib/hooks";
import { useScanContext, useRequireScan } from "../lib/scanContext";
import { useRealtimeSubscription, type RealtimeConnectionStatus } from "../lib/wsClient";

const COLORS = {
  bg: "#f5f3ef",
  card: "#f1eee8",
  paper: "#fdfbf7",
  blue: "#4a6fa5",
  orange: "#d17a22",
  red: "#b94a48",
  green: "#4f7d5c",
  purple: "#7b6fb5",
  text: "#1f1f1f",
  textSec: "#5a5a5a",
};

type GraphNode = {
  id: string;
  type: "seed" | "platform" | "username" | "identity" | "target";
  label: string;
  x: number;
  y: number;
  connections: string[];
  revealStep?: number;
  data?: {
    platform?: string;
    value?: string;
    status?: string;
    details?: string[];
  };
};

function ConnectionBanner({ status }: { status: RealtimeConnectionStatus }) {
  if (status === "connected" || status === "idle") {
    return null;
  }

  const text =
    status === "offline"
      ? "Offline mode enabled. Identity graph updates are paused."
      : status === "reconnecting"
        ? "Reconnecting to graph updates..."
        : status === "connecting"
          ? "Connecting to graph updates..."
          : "Realtime graph updates unavailable. Auto-retry is active.";

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8 lg:px-12 pt-3">
      <div className="hand-drawn-card px-4 py-2" style={{ backgroundColor: "rgba(74, 111, 165, 0.12)" }}>
        <p style={{ fontFamily: "'Patrick Hand', cursive", color: "#2b4e7e" }}>{text}</p>
      </div>
    </div>
  );
}

function getNodeColor(type: GraphNode["type"]) {
  switch (type) {
    case "seed":
      return COLORS.purple;
    case "platform":
      return COLORS.blue;
    case "username":
      return COLORS.green;
    case "identity":
      return COLORS.orange;
    case "target":
      return COLORS.red;
    default:
      return COLORS.text;
  }
}

function getNodeSize(type: GraphNode["type"]) {
  switch (type) {
    case "seed":
      return 24;
    case "platform":
      return 16;
    case "username":
      return 14;
    case "identity":
      return 16;
    case "target":
      return 18;
    default:
      return 12;
  }
}

function ToggleButton({
  label,
  enabled,
  onToggle,
  color,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 transition-colors"
      style={{
        border: "1.5px dashed rgba(0,0,0,0.1)",
        borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
        backgroundColor: enabled ? "rgba(0,0,0,0.02)" : "transparent",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: enabled ? color : "transparent" }} />
        <span style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, opacity: enabled ? 1 : 0.6 }}>{label}</span>
      </div>
      {enabled ? <Eye className="w-4 h-4" style={{ color }} /> : <EyeOff className="w-4 h-4" style={{ color: COLORS.textSec }} />}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: color }} />
      <span style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, fontSize: "15px" }}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-dashed border-black/10 pb-2">
      <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
        {label}
      </div>
      <div className="text-lg" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: COLORS.text }}>
        {value}
      </div>
    </div>
  );
}

export default function IdentityGraph() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearActiveScan } = useScanContext();
  const scanId = useRequireScan();

  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showIdentity, setShowIdentity] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [animationStep, setAnimationStep] = useState(0);

  const filters = useMemo(
    () => ({
      includePlatforms: showPlatforms,
      includeIdentity: showIdentity,
      includeTargets: showTargets,
    }),
    [showPlatforms, showIdentity, showTargets]
  );

  const scanQuery = useScanStatusQuery(scanId);
  const graphQuery = useIdentityGraphQuery(scanId, filters);

  const graphNodes = (graphQuery.data?.nodes ?? []) as GraphNode[];
  const selectedNodeQuery = useIdentityGraphNodeQuery(scanId, selectedNodeId);

  const realtimeStatus = useRealtimeSubscription({
    scanId,
    enabled: Boolean(scanId),
    channels: ["identity.graph", "scans.lifecycle"],
    onEvent: (event) => {
      if (!scanId || event.scanId !== scanId) {
        return;
      }

      if (event.event.startsWith("identity.graph")) {
        void queryClient.invalidateQueries({ queryKey: dataReaperQueryKeys.identityGraph(scanId, filters) });
      }

      if (event.event.startsWith("scans.lifecycle")) {
        void queryClient.invalidateQueries({ queryKey: dataReaperQueryKeys.scan(scanId) });
      }
    },
  });

  useEffect(() => {
    const maxStep = graphNodes.reduce((highest, node) => Math.max(highest, node.revealStep ?? 0), 0);
    setAnimationStep(0);

    if (graphNodes.length === 0) {
      return;
    }

    let currentStep = 0;
    const timer = window.setInterval(() => {
      currentStep += 1;
      setAnimationStep(currentStep);
      if (currentStep > maxStep + 1) {
        window.clearInterval(timer);
      }
    }, 420);

    return () => {
      window.clearInterval(timer);
    };
  }, [graphNodes]);

  if (!scanId) {
    return null;
  }

  const visibleNodes = graphNodes.filter((node) => (node.revealStep ?? 0) <= animationStep);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const edges = (graphQuery.data?.edges ?? []).filter(
    (edge) => visibleNodeIds.has(edge.fromNodeId) && visibleNodeIds.has(edge.toNodeId)
  );

  const selectedNode = selectedNodeQuery.data ?? visibleNodes.find((node) => node.id === selectedNodeId) ?? null;

  const isConnectedToHovered = (nodeId: string) => {
    if (!hoveredNodeId) {
      return true;
    }
    if (hoveredNodeId === nodeId) {
      return true;
    }

    const hovered = visibleNodes.find((node) => node.id === hoveredNodeId);
    if (!hovered) {
      return true;
    }

    if (hovered.connections.includes(nodeId)) {
      return true;
    }

    const current = visibleNodes.find((node) => node.id === nodeId);
    return Boolean(current?.connections.includes(hoveredNodeId));
  };

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden" style={{ backgroundColor: COLORS.bg }}>
      <PressureFilter />
      <ConnectionBanner status={realtimeStatus} />

      <nav
        className="sticky top-0 z-50 pt-4 pb-3 px-6 md:px-12 lg:px-16 flex items-center justify-between backdrop-blur-sm"
        style={{ backgroundColor: "rgba(245, 243, 239, 0.85)", borderBottom: "1.5px dashed rgba(0,0,0,0.15)" }}
      >
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}> 
            <img
              src="/images/logo.png"
              alt="DataReaper logo"
              style={{ width: "104px", height: "60px", objectFit: "contain", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}
            />
            <PressureText as="span" className="text-3xl tracking-tight" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}>
              DataReaper
            </PressureText>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate("/command-center")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">
              Dashboard
            </button>
            <button onClick={() => navigate("/war-room")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">
              War Room
            </button>
            <button className="text-xl pencil-text transition-colors opacity-100 hover:opacity-70">Identity Graph</button>
          </div>

          <div className="flex items-center gap-3">
            <PressureText as="span" className="text-base hidden lg:block" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
              {scanQuery.data?.status ? `Lifecycle: ${scanQuery.data.status}` : "Loading scan"}
            </PressureText>
            <button
              type="button"
              className="hand-drawn-button px-3 py-2"
              onClick={() => {
                clearActiveScan();
                navigate("/onboarding");
              }}
            >
              Start New Scan
            </button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        <motion.div
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 p-5 hand-drawn-card"
          style={{
            backgroundColor: COLORS.card,
            borderRight: "1.5px dashed rgba(0,0,0,0.15)",
            borderRadius: "0",
          }}
        >
          <PressureText as="h3" className="text-2xl mb-5" style={{ fontFamily: "'Caveat', cursive" }}>
            Graph Controls
          </PressureText>

          <div className="space-y-5">
            <motion.button
              type="button"
              onClick={() => setAnimationStep(0)}
              whileHover={{ scale: 1.02, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 hand-drawn-button text-lg"
            >
              <Play className="w-4 h-4" />
              <PressureText className="paper-text">Replay Animation</PressureText>
            </motion.button>

            <div>
              <h4 className="text-base mb-3 flex items-center gap-2" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                <Filter className="w-4 h-4" />
                Filter Nodes
              </h4>
              <div className="space-y-2">
                <ToggleButton label="Platforms" enabled={showPlatforms} onToggle={() => setShowPlatforms((value) => !value)} color={COLORS.blue} />
                <ToggleButton label="Identity Data" enabled={showIdentity} onToggle={() => setShowIdentity((value) => !value)} color={COLORS.orange} />
                <ToggleButton label="Data Brokers" enabled={showTargets} onToggle={() => setShowTargets((value) => !value)} color={COLORS.red} />
              </div>
            </div>

            <div className="pt-4" style={{ borderTop: "1.5px dashed rgba(0,0,0,0.12)" }}>
              <h4 className="text-base mb-3" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                Legend
              </h4>
              <div className="space-y-2 text-sm">
                <LegendItem color={COLORS.purple} label="Seed" />
                <LegendItem color={COLORS.blue} label="Platform" />
                <LegendItem color={COLORS.green} label="Username" />
                <LegendItem color={COLORS.orange} label="Identity" />
                <LegendItem color={COLORS.red} label="Broker Target" />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: COLORS.paper }}>
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(rgba(74, 111, 165, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 111, 165, 0.08) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
              filter: "url(#pencil-sketch)",
            }}
          />

          <motion.div
            drag
            dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{ width: 820, height: 620, left: "50%", top: "50%", marginLeft: -410, marginTop: -310 }}
            animate={{ scale }}
            onWheel={(event) => {
              if (event.deltaY < 0) {
                setScale((value) => Math.min(value + 0.05, 2.5));
              } else {
                setScale((value) => Math.max(value - 0.05, 0.4));
              }
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: "url(#pencil-sketch)" }}>
              {edges.map((edge) => {
                const fromNode = visibleNodes.find((node) => node.id === edge.fromNodeId);
                const toNode = visibleNodes.find((node) => node.id === edge.toNodeId);

                if (!fromNode || !toNode) {
                  return null;
                }

                const highlighted = hoveredNodeId ? edge.fromNodeId === hoveredNodeId || edge.toNodeId === hoveredNodeId : false;

                return (
                  <motion.line
                    key={`${edge.fromNodeId}-${edge.toNodeId}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={getNodeColor(fromNode.type)}
                    strokeWidth={highlighted ? 2.4 : 1.2}
                    strokeDasharray={highlighted ? "none" : "6,4"}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: highlighted ? 0.9 : 0.35 }}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0">
              <AnimatePresence>
                {visibleNodes.map((node) => {
                  const color = getNodeColor(node.type);
                  const size = getNodeSize(node.type);
                  const connected = isConnectedToHovered(node.id);

                  return (
                    <motion.div
                      key={node.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: connected ? 1 : 0.6, opacity: connected ? 1 : 0.25 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute cursor-pointer"
                      style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
                      onClick={() => setSelectedNodeId(node.id)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      <motion.div
                        className="rounded-full relative"
                        style={{
                          width: size * 2,
                          height: size * 2,
                          backgroundColor: COLORS.paper,
                          border: selectedNode?.id === node.id ? `3.4px solid ${color}` : `2.4px solid ${color}`,
                          boxShadow: selectedNode?.id === node.id ? `0 0 12px ${color}88` : "none",
                        }}
                      >
                        <motion.div
                          className="absolute rounded-full"
                          style={{
                            width: size * 0.85,
                            height: size * 0.85,
                            backgroundColor: color,
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      </motion.div>

                      <div
                        className="absolute top-full mt-2 whitespace-nowrap text-center"
                        style={{ left: "50%", transform: "translateX(-50%)", fontFamily: "'Patrick Hand', cursive", color: COLORS.text }}
                      >
                        {node.label}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {(graphQuery.isLoading || visibleNodes.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center hand-drawn-card p-8"
                style={{ backgroundColor: COLORS.paper }}
              >
                <PressureText as="div" variant="strong" className="text-3xl mb-2 paper-text" style={{ fontFamily: "'Caveat', cursive" }}>
                  Building Identity Graph...
                </PressureText>
                <div style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                  Correlating platforms, identities, and broker exposures.
                </div>
              </motion.div>
            </div>
          )}

          {graphQuery.isError && (
            <div className="absolute inset-x-8 top-6 hand-drawn-card p-4" style={{ backgroundColor: "rgba(185, 74, 72, 0.08)" }}>
              <p style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.red }}>
                Failed to load identity graph.
              </p>
              <button type="button" className="hand-drawn-button mt-2 px-3 py-1" onClick={() => graphQuery.refetch()}>
                Retry
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="w-80 p-5 relative hand-drawn-card"
              style={{
                backgroundColor: COLORS.card,
                borderLeft: "1.5px dashed rgba(0,0,0,0.15)",
                borderRadius: "0",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="absolute top-4 right-4 p-1.5 transition-colors"
                style={{ color: COLORS.textSec, border: "1px solid rgba(0,0,0,0.2)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px" }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: getNodeColor(selectedNode.type), backgroundColor: COLORS.paper }}>
                    <div className="w-2 h-2 rounded-full m-auto mt-[3px]" style={{ backgroundColor: getNodeColor(selectedNode.type), opacity: 0.7 }} />
                  </div>
                  <PressureText as="h3" className="text-2xl" style={{ fontFamily: "'Caveat', cursive" }}>
                    {selectedNode.label}
                  </PressureText>
                </div>

                <div
                  className="text-sm uppercase tracking-wider mb-3 px-2 py-1 inline-block"
                  style={{
                    fontFamily: "'Patrick Hand', cursive",
                    border: `1.5px solid ${getNodeColor(selectedNode.type)}`,
                    borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
                    color: getNodeColor(selectedNode.type),
                  }}
                >
                  {selectedNode.type}
                </div>
              </div>

              {selectedNode.data && (
                <div className="space-y-4">
                  {selectedNode.data.platform && <DetailRow label="Platform" value={selectedNode.data.platform} />}
                  {selectedNode.data.value && <DetailRow label="Value" value={selectedNode.data.value} />}
                  {selectedNode.data.status && <DetailRow label="Status" value={selectedNode.data.status} />}

                  {selectedNode.data.details && selectedNode.data.details.length > 0 && (
                    <div>
                      <div className="text-sm mb-2" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                        Details
                      </div>
                      <div className="space-y-1">
                        {selectedNode.data.details.map((detail) => (
                          <div key={detail} style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text }}>
                            • {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 pt-4" style={{ borderTop: "1.5px dashed rgba(0,0,0,0.12)" }}>
                <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                  Connections
                </div>
                <div className="text-2xl" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: COLORS.text }}>
                  {selectedNode.connections.length} linked node{selectedNode.connections.length !== 1 ? "s" : ""}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
