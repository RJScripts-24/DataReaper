import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { X, Play, Filter, Eye, EyeOff } from "lucide-react";

interface GraphNode {
  id: string;
  type: "seed" | "platform" | "username" | "identity" | "target";
  label: string;
  x: number;
  y: number;
  connections: string[];
  data?: {
    platform?: string;
    value?: string;
    status?: string;
    details?: string[];
  };
}

export default function IdentityGraph() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showIdentity, setShowIdentity] = useState(true);
  const [showTargets, setShowTargets] = useState(true);

  // Define all graph nodes
  const allNodes: GraphNode[] = [
    // Seed node (center)
    {
      id: "seed",
      type: "seed",
      label: "user@email.com",
      x: 400,
      y: 300,
      connections: ["github", "twitter", "linkedin"],
    },
    // Platform nodes
    {
      id: "github",
      type: "platform",
      label: "GitHub",
      x: 250,
      y: 200,
      connections: ["username1", "identity1"],
      data: { platform: "GitHub" },
    },
    {
      id: "twitter",
      type: "platform",
      label: "Twitter",
      x: 550,
      y: 200,
      connections: ["username2", "identity2"],
      data: { platform: "Twitter" },
    },
    {
      id: "linkedin",
      type: "platform",
      label: "LinkedIn",
      x: 400,
      y: 150,
      connections: ["identity1", "identity3"],
      data: { platform: "LinkedIn" },
    },
    // Username nodes
    {
      id: "username1",
      type: "username",
      label: "johndoe_dev",
      x: 150,
      y: 250,
      connections: ["identity1"],
      data: { value: "johndoe_dev", platform: "GitHub" },
    },
    {
      id: "username2",
      type: "username",
      label: "@john_doe",
      x: 650,
      y: 250,
      connections: ["identity2"],
      data: { value: "@john_doe", platform: "Twitter" },
    },
    // Identity nodes
    {
      id: "identity1",
      type: "identity",
      label: "John Doe",
      x: 200,
      y: 400,
      connections: ["target1"],
      data: {
        value: "John Doe",
        details: ["Location: Bangalore", "Company: Tech Corp", "Role: Engineer"],
      },
    },
    {
      id: "identity2",
      type: "identity",
      label: "+1-555-0123",
      x: 600,
      y: 400,
      connections: ["target2"],
      data: {
        value: "+1-555-0123",
        details: ["Type: Mobile", "Country: USA"],
      },
    },
    {
      id: "identity3",
      type: "identity",
      label: "Bangalore, IN",
      x: 400,
      y: 450,
      connections: ["target1", "target3"],
      data: {
        value: "Bangalore, India",
        details: ["Source: LinkedIn", "Verified: Yes"],
      },
    },
    // Target nodes (data brokers)
    {
      id: "target1",
      type: "target",
      label: "Apollo.io",
      x: 150,
      y: 500,
      connections: [],
      data: {
        platform: "Apollo.io",
        status: "Deletion Pending",
        details: ["Email", "Phone", "Company", "Location"],
      },
    },
    {
      id: "target2",
      type: "target",
      label: "Spokeo",
      x: 650,
      y: 500,
      connections: [],
      data: {
        platform: "Spokeo",
        status: "Identified",
        details: ["Phone", "Address", "Relatives"],
      },
    },
    {
      id: "target3",
      type: "target",
      label: "PeopleFinder",
      x: 400,
      y: 550,
      connections: [],
      data: {
        platform: "PeopleFinder",
        status: "Deletion In Progress",
        details: ["Name", "Location", "Age"],
      },
    },
  ];

  // Progressive animation
  useEffect(() => {
    const steps = [
      // Step 0: Seed only
      ["seed"],
      // Step 1: Add platforms
      ["seed", "github", "twitter", "linkedin"],
      // Step 2: Add usernames
      ["seed", "github", "twitter", "linkedin", "username1", "username2"],
      // Step 3: Add identity nodes
      ["seed", "github", "twitter", "linkedin", "username1", "username2", "identity1", "identity2", "identity3"],
      // Step 4: Add targets
      ["seed", "github", "twitter", "linkedin", "username1", "username2", "identity1", "identity2", "identity3", "target1", "target2", "target3"],
    ];

    if (animationStep < steps.length) {
      const timer = setTimeout(() => {
        const currentStepNodes = steps[animationStep];
        setNodes(allNodes.filter((node) => currentStepNodes.includes(node.id)));
        setAnimationStep(animationStep + 1);
      }, animationStep === 0 ? 500 : 1500);

      return () => clearTimeout(timer);
    }
  }, [animationStep]);

  const replayAnimation = () => {
    setAnimationStep(0);
    setNodes([]);
    setSelectedNode(null);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "seed":
        return "#6C63FF";
      case "platform":
        return "#4A90E2";
      case "username":
        return "#4FD1C5";
      case "identity":
        return "#717182";
      case "target":
        return "#FF6B6B";
      default:
        return "#FFFFFF";
    }
  };

  const getNodeSize = (type: string) => {
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
  };

  const filterNodes = (node: GraphNode) => {
    if (node.type === "platform" && !showPlatforms) return false;
    if (node.type === "identity" && !showIdentity) return false;
    if (node.type === "target" && !showTargets) return false;
    return true;
  };

  const filteredNodes = nodes.filter(filterNodes);

  const isConnected = (nodeId: string) => {
    if (!hoveredNode) return true;
    if (nodeId === hoveredNode) return true;
    
    const hovered = nodes.find((n) => n.id === hoveredNode);
    if (!hovered) return true;

    // Check if this node is connected to hovered
    if (hovered.connections.includes(nodeId)) return true;

    // Check if hovered is connected to this node
    const current = nodes.find((n) => n.id === nodeId);
    if (current?.connections.includes(hoveredNode)) return true;

    return false;
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#F7F7FB", fontFamily: "Inter, sans-serif" }}
    >
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderColor: "rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="max-w-[1600px] mx-auto px-32 py-4 flex items-center justify-between">
          <span
            className="text-xl tracking-tight cursor-pointer"
            style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
            onClick={() => navigate("/")}
          >
            DataReaper
          </span>

          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate("/command-center")}
              className="text-sm hover:text-[#6C63FF] transition-colors"
              style={{ color: "#717182" }}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate("/war-room")}
              className="text-sm hover:text-[#6C63FF] transition-colors"
              style={{ color: "#717182" }}
            >
              War Room
            </button>
            <button className="text-sm transition-colors" style={{ color: "#0B0F1A" }}>
              Identity Graph
            </button>
            <button className="text-sm hover:text-[#6C63FF] transition-colors" style={{ color: "#717182" }}>
              Reports
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#4FD1C5" }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm" style={{ color: "#4FD1C5" }}>
                Active Scan
              </span>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#6C63FF" }}
            >
              <span className="text-white text-sm">U</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Controls */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 border-r p-6 shadow-lg"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 className="text-lg mb-6" style={{ color: "#0B0F1A" }}>
            Graph Controls
          </h3>

          <div className="space-y-6">
            <div>
              <button
                onClick={replayAnimation}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[rgba(108,99,255,0.2)] transition-colors"
                style={{
                  backgroundColor: "rgba(108, 99, 255, 0.1)",
                  color: "#6C63FF",
                }}
              >
                <Play className="w-4 h-4" />
                Replay Animation
              </button>
            </div>

            <div>
              <h4 className="text-sm mb-3" style={{ color: "#717182" }}>
                <Filter className="w-4 h-4 inline mr-2" />
                Filter Nodes
              </h4>
              <div className="space-y-2">
                <ToggleButton
                  label="Platforms"
                  enabled={showPlatforms}
                  onToggle={() => setShowPlatforms(!showPlatforms)}
                  color="#4A90E2"
                />
                <ToggleButton
                  label="Identity Data"
                  enabled={showIdentity}
                  onToggle={() => setShowIdentity(!showIdentity)}
                  color="#717182"
                />
                <ToggleButton
                  label="Data Brokers"
                  enabled={showTargets}
                  onToggle={() => setShowTargets(!showTargets)}
                  color="#FF6B6B"
                />
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: "rgba(0, 0, 0, 0.1)" }}>
              <h4 className="text-sm mb-2" style={{ color: "#717182" }}>
                Legend
              </h4>
              <div className="space-y-2 text-xs">
                <LegendItem color="#6C63FF" label="Seed Email" />
                <LegendItem color="#4A90E2" label="Platform" />
                <LegendItem color="#4FD1C5" label="Username" />
                <LegendItem color="#717182" label="Identity" />
                <LegendItem color="#FF6B6B" label="Target Broker" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Graph Canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: "#FFFFFF" }}>
          {/* Background Grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(108, 99, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(108, 99, 255, 0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 40%, rgba(247, 247, 251, 0.6) 100%)",
            }}
          />

          {/* SVG Canvas for edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Draw edges */}
            {filteredNodes.map((node) =>
              node.connections
                .filter((connId) => filteredNodes.find((n) => n.id === connId))
                .map((connId) => {
                  const targetNode = nodes.find((n) => n.id === connId);
                  if (!targetNode) return null;

                  const isHighlighted = hoveredNode
                    ? node.id === hoveredNode || connId === hoveredNode
                    : false;

                  return (
                    <motion.line
                      key={`${node.id}-${connId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? getNodeColor(node.type) : "rgba(108, 99, 255, 0.2)"}
                      strokeWidth={isHighlighted ? 2 : 1}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: isHighlighted ? 0.8 : 0.4 }}
                      transition={{ duration: 0.5 }}
                      filter={isHighlighted ? "url(#glow)" : undefined}
                    />
                  );
                })
            )}
          </svg>

          {/* Nodes */}
          <div className="absolute inset-0">
            <AnimatePresence>
              {filteredNodes.map((node) => {
                const color = getNodeColor(node.type);
                const size = getNodeSize(node.type);
                const connected = isConnected(node.id);

                return (
                  <motion.div
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: connected ? 1 : 0.6,
                      opacity: connected ? 1 : 0.3,
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="absolute cursor-pointer"
                    style={{
                      left: node.x,
                      top: node.y,
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Node circle */}
                    <motion.div
                      className="rounded-full relative"
                      style={{
                        width: size * 2,
                        height: size * 2,
                        backgroundColor: color,
                        boxShadow: `0 0 ${size}px ${color}`,
                      }}
                      animate={
                        node.type === "target"
                          ? { scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }
                          : {}
                      }
                      transition={
                        node.type === "target"
                          ? { duration: 2, repeat: Infinity }
                          : {}
                      }
                    >
                      {node.type === "target" && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: color }}
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>

                    {/* Label */}
                    <div
                      className="absolute top-full mt-2 whitespace-nowrap text-xs text-center"
                      style={{
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: "#0B0F1A",
                        textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      {node.label}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Center message */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div
                  className="text-2xl mb-2"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
                >
                  Building Identity Graph...
                </div>
                <div className="text-sm" style={{ color: "#717182" }}>
                  Watch as we reconstruct the digital footprint
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Right Panel - Node Details */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="w-80 border-l p-6 relative"
              style={{
                backgroundColor: "rgba(15, 22, 41, 0.9)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                style={{ color: "#A0AEC0" }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: getNodeColor(selectedNode.type),
                      boxShadow: `0 0 10px ${getNodeColor(selectedNode.type)}`,
                    }}
                  />
                  <h3 className="text-lg" style={{ color: "#FFFFFF" }}>
                    {selectedNode.label}
                  </h3>
                </div>

                <div
                  className="text-xs uppercase tracking-wider mb-4 px-2 py-1 rounded inline-block"
                  style={{
                    backgroundColor: `${getNodeColor(selectedNode.type)}20`,
                    color: getNodeColor(selectedNode.type),
                  }}
                >
                  {selectedNode.type}
                </div>
              </div>

              {selectedNode.data && (
                <div className="space-y-4">
                  {selectedNode.type === "target" && (
                    <>
                      <div>
                        <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                          Broker Platform
                        </div>
                        <div className="text-sm" style={{ color: "#FFFFFF" }}>
                          {selectedNode.data.platform}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                          Status
                        </div>
                        <div
                          className="text-sm px-2 py-1 rounded inline-block"
                          style={{
                            backgroundColor:
                              selectedNode.data.status === "Deletion Pending"
                                ? "rgba(255, 159, 67, 0.2)"
                                : selectedNode.data.status === "Identified"
                                ? "rgba(255, 107, 107, 0.2)"
                                : "rgba(79, 209, 197, 0.2)",
                            color:
                              selectedNode.data.status === "Deletion Pending"
                                ? "#FF9F43"
                                : selectedNode.data.status === "Identified"
                                ? "#FF6B6B"
                                : "#4FD1C5",
                          }}
                        >
                          {selectedNode.data.status}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs mb-2" style={{ color: "#A0AEC0" }}>
                          Data Found
                        </div>
                        <div className="space-y-1">
                          {selectedNode.data.details?.map((detail, index) => (
                            <div
                              key={index}
                              className="text-sm px-2 py-1 rounded"
                              style={{
                                backgroundColor: "rgba(255, 107, 107, 0.1)",
                                color: "#FFFFFF",
                              }}
                            >
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedNode.type === "identity" && (
                    <>
                      <div>
                        <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                          Value
                        </div>
                        <div className="text-sm" style={{ color: "#FFFFFF" }}>
                          {selectedNode.data.value}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs mb-2" style={{ color: "#A0AEC0" }}>
                          Details
                        </div>
                        <div className="space-y-1">
                          {selectedNode.data.details?.map((detail, index) => (
                            <div
                              key={index}
                              className="text-sm"
                              style={{ color: "#E0E0E0" }}
                            >
                              • {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedNode.type === "platform" || selectedNode.type === "username") && (
                    <>
                      {selectedNode.data.platform && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                            Platform
                          </div>
                          <div className="text-sm" style={{ color: "#FFFFFF" }}>
                            {selectedNode.data.platform}
                          </div>
                        </div>
                      )}

                      {selectedNode.data.value && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                            Username
                          </div>
                          <div
                            className="text-sm font-mono"
                            style={{ color: "#4FD1C5" }}
                          >
                            {selectedNode.data.value}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedNode.type === "seed" && (
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#A0AEC0" }}>
                        Seed Email
                      </div>
                      <div className="text-sm font-mono" style={{ color: "#6C63FF" }}>
                        {selectedNode.label}
                      </div>
                      <div className="text-xs mt-2" style={{ color: "#717182" }}>
                        This is the starting point for identity discovery
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <div className="text-xs mb-2" style={{ color: "#A0AEC0" }}>
                  Connections
                </div>
                <div className="text-sm" style={{ color: "#FFFFFF" }}>
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
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(108,99,255,0.1)] transition-colors"
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm" style={{ color: "#0B0F1A" }}>
          {label}
        </span>
      </div>
      {enabled ? (
        <Eye className="w-4 h-4" style={{ color: "#4FD1C5" }} />
      ) : (
        <EyeOff className="w-4 h-4" style={{ color: "#717182" }} />
      )}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
      />
      <span style={{ color: "#717182" }}>{label}</span>
    </div>
  );
}