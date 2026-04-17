import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { X, Play, Filter, Eye, EyeOff } from "lucide-react";
import { PressureFilter } from "../components/PressureFilter";
import { PressureText } from "../components/PressureText";

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
  const [scale, setScale] = useState(1);

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
      className="min-h-screen relative w-full overflow-x-hidden"
      style={{ backgroundColor: COLORS.bg }}
    >
      <PressureFilter />

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 pt-4 pb-3 px-6 md:px-12 lg:px-16 flex items-center justify-between backdrop-blur-sm"
        style={{ backgroundColor: "rgba(245, 243, 239, 0.8)", borderBottom: "1.5px dashed rgba(0,0,0,0.15)" }}
      >
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
          <PressureText
            as="span"
            className="text-3xl tracking-tight cursor-pointer"
            style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
            onClick={() => navigate("/")}
          >
            DataReaper
          </PressureText>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate("/command-center")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">Dashboard</button>
            <button onClick={() => navigate("/war-room")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">War Room</button>
            <button className="text-xl pencil-text transition-colors opacity-100 hover:opacity-70">Identity Graph</button>
            <button className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">Reports</button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}44` }}
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <PressureText as="span" className="text-xl" style={{ color: COLORS.green, fontWeight: 700, fontFamily: "'Patrick Hand', cursive" }}>Active Scan</PressureText>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1a1a1a] shadow-sm cursor-pointer"
              style={{ filter: "url(#pencil-sketch)", backgroundColor: "#e2e8f0" }}
            >
              <span className="pencil-heading text-lg font-bold">U</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Controls */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 p-5 hand-drawn-card"
          style={{
            backgroundColor: COLORS.card,
            borderRight: "1.5px dashed rgba(0,0,0,0.15)",
            borderRadius: "0",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <PressureText as="h3" className="text-2xl mb-5" style={{ fontFamily: "'Caveat', cursive" }}>
            Graph Controls
          </PressureText>

          <div className="space-y-5">
            <div>
              <motion.button
                onClick={replayAnimation}
                whileHover={{ scale: 1.02, rotate: -0.5 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 hand-drawn-button text-lg"
              >
                <Play className="w-4 h-4" />
                <PressureText className="paper-text">Replay Animation</PressureText>
              </motion.button>
            </div>

            <div>
              <h4 className="text-base mb-3 flex items-center gap-2" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                <Filter className="w-4 h-4" />
                Filter Nodes
              </h4>
              <div className="space-y-2">
                <ToggleButton
                  label="Platforms"
                  enabled={showPlatforms}
                  onToggle={() => setShowPlatforms(!showPlatforms)}
                  color={COLORS.blue}
                />
                <ToggleButton
                  label="Identity Data"
                  enabled={showIdentity}
                  onToggle={() => setShowIdentity(!showIdentity)}
                  color={COLORS.orange}
                />
                <ToggleButton
                  label="Data Brokers"
                  enabled={showTargets}
                  onToggle={() => setShowTargets(!showTargets)}
                  color={COLORS.red}
                />
              </div>
            </div>

            <div className="pt-4" style={{ borderTop: "1.5px dashed rgba(0,0,0,0.12)" }}>
              <h4 className="text-base mb-3" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
                Legend
              </h4>
              <div className="space-y-2 text-sm">
                <LegendItem color={COLORS.purple} label="Seed Email" />
                <LegendItem color={COLORS.blue} label="Platform" />
                <LegendItem color={COLORS.green} label="Username" />
                <LegendItem color={COLORS.orange} label="Identity" />
                <LegendItem color={COLORS.red} label="Target Broker" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Graph Canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: COLORS.paper }}>
          {/* Paper texture grid */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(rgba(74, 111, 165, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 111, 165, 0.08) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
              filter: "url(#pencil-sketch)",
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 40%, rgba(245, 243, 239, 0.7) 100%)",
            }}
          />

          {/* Zoomable & Panning Container */}
          <motion.div
            drag
            dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{ 
               width: 800, height: 600,
               left: "50%", top: "50%",
               marginLeft: -400, marginTop: -300
            }}
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onWheel={(e) => {
              if (e.deltaY < 0) {
                setScale(s => Math.min(s + 0.05, 2.5));
              } else {
                setScale(s => Math.max(s - 0.05, 0.4));
              }
            }}
          >
            {/* SVG Canvas for edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: "url(#pencil-sketch)" }}>
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
                      stroke={getNodeColor(node.type)}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      strokeDasharray={isHighlighted ? "none" : "6,4"}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: isHighlighted ? 0.9 : 0.35 }}
                      transition={{ duration: 0.5 }}
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
                        backgroundColor: COLORS.paper,
                        border: selectedNode?.id === node.id ? `3.5px solid ${color}` : `2.5px solid ${color}`,
                        filter: "url(#pencil-sketch)",
                        boxShadow: selectedNode?.id === node.id ? `0 0 12px ${color}80` : "none",
                      }}
                      animate={
                        node.type === "target"
                          ? { scale: [1, 1.15, 1] }
                          : {}
                      }
                      transition={
                        node.type === "target"
                          ? { duration: 2.5, repeat: Infinity }
                          : {}
                      }
                    >
                      {node.type === "target" && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: color }}
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        />
                      )}
                      <motion.div
                        className="absolute rounded-full"
                        style={{
                          width: selectedNode?.id === node.id ? size * 0.9 : size * 0.85,
                          height: selectedNode?.id === node.id ? size * 0.9 : size * 0.85,
                          backgroundColor: color,
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          opacity: 1,
                        }}
                      />
                    </motion.div>

                    {/* Label */}
                    <div
                      className="absolute top-full mt-2 whitespace-nowrap text-center"
                      style={{
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontFamily: "'Patrick Hand', cursive",
                        fontSize: "15px",
                        fontWeight: "bold",
                        color: COLORS.text,
                        opacity: 1,
                        textShadow: `0 0 6px ${COLORS.paper}, 0 0 6px ${COLORS.paper}, 0 0 6px ${COLORS.paper}`,
                      }}
                    >
                      {node.label}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          </motion.div>

          {/* Center message */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center hand-drawn-card p-8"
                style={{ backgroundColor: COLORS.paper }}
              >
                <PressureText
                  as="div"
                  variant="strong"
                  className="text-3xl mb-2 paper-text"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Building Identity Graph...
                </PressureText>
                <div className="text-lg" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>
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
              className="w-80 p-5 relative hand-drawn-card"
              style={{
                backgroundColor: COLORS.card,
                borderLeft: "1.5px dashed rgba(0,0,0,0.15)",
                borderRadius: "0",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), -2px 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-1.5 transition-colors"
                style={{ color: COLORS.textSec, border: "1px solid rgba(0,0,0,0.2)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px" }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{ borderColor: getNodeColor(selectedNode.type), backgroundColor: COLORS.paper, filter: "url(#pencil-sketch)" }}
                  >
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
                  {selectedNode.type === "target" && (
                    <>
                      <DetailRow label="Broker Platform" value={selectedNode.data.platform || ""} />
                      <div>
                        <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Status</div>
                        <div
                          className="text-base px-2 py-1 inline-block"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,0.15)",
                            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
                            color: selectedNode.data.status === "Deletion Pending" ? COLORS.orange : selectedNode.data.status === "Identified" ? COLORS.red : COLORS.green,
                          }}
                        >
                          {selectedNode.data.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm mb-2" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Data Found</div>
                        <div className="space-y-1">
                          {selectedNode.data.details?.map((detail, index) => (
                            <div key={index} className="text-base px-2 py-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, borderBottom: "1px dashed rgba(0,0,0,0.1)" }}>
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedNode.type === "identity" && (
                    <>
                      <DetailRow label="Value" value={selectedNode.data.value || ""} />
                      <div>
                        <div className="text-sm mb-2" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Details</div>
                        <div className="space-y-1">
                          {selectedNode.data.details?.map((detail, index) => (
                            <div key={index} className="text-base" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, opacity: 0.8 }}>• {detail}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedNode.type === "platform" || selectedNode.type === "username") && (
                    <>
                      {selectedNode.data.platform && <DetailRow label="Platform" value={selectedNode.data.platform} />}
                      {selectedNode.data.value && (
                        <div>
                          <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Username</div>
                          <div className="text-lg" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: COLORS.green }}>{selectedNode.data.value}</div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedNode.type === "seed" && (
                    <div>
                      <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Seed Email</div>
                      <div className="text-lg" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: COLORS.purple }}>{selectedNode.label}</div>
                      <div className="text-sm mt-2 italic" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>This is the starting point for identity discovery</div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 pt-4" style={{ borderTop: "1.5px dashed rgba(0,0,0,0.12)" }}>
                <div className="text-sm mb-1" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec }}>Connections</div>
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
      className="w-full flex items-center justify-between px-3 py-2 transition-colors"
      style={{
        border: "1.5px dashed rgba(0,0,0,0.1)",
        borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
        backgroundColor: enabled ? "rgba(0,0,0,0.02)" : "transparent",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full border border-black/20"
          style={{ backgroundColor: enabled ? color : "transparent" }}
        />
        <span className="text-base" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, opacity: enabled ? 1 : 0.6 }}>
          {label}
        </span>
      </div>
      {enabled ? (
        <Eye className="w-4 h-4" style={{ color: color }} />
      ) : (
        <EyeOff className="w-4 h-4" style={{ color: COLORS.textSec, opacity: 0.5 }} />
      )}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2.5 h-2.5 rounded-full border border-black/20"
        style={{ backgroundColor: color }}
      />
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