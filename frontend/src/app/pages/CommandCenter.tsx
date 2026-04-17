import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Activity, Shield, Trash2, Scale } from "lucide-react";

interface RadarDot {
  id: number;
  angle: number;
  distance: number;
  broker: string;
  status: "Scanning" | "Identified" | "Deletion in progress";
  color: string;
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const [sweepAngle, setSweepAngle] = useState(0);
  const [radarDots, setRadarDots] = useState<RadarDot[]>([]);
  const [activityLogs, setActivityLogs] = useState<Array<{ type: string; message: string; id: number }>>([]);
  const [stats, setStats] = useState({
    brokers: 0,
    exposures: 0,
    deletions: 0,
    disputes: 0,
  });
  const [dotIdCounter, setDotIdCounter] = useState(0);

  // Animate stats counters
  useEffect(() => {
    const timers = [
      setTimeout(() => animateCounter("brokers", 124), 300),
      setTimeout(() => animateCounter("exposures", 38), 500),
      setTimeout(() => animateCounter("deletions", 12), 700),
      setTimeout(() => animateCounter("disputes", 5), 900),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const animateCounter = (key: string, target: number) => {
    let current = 0;
    const increment = Math.ceil(target / 20);
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setStats((prev) => ({ ...prev, [key]: current }));
    }, 50);
  };

  // Rotate radar sweep
  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle((prev) => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Add radar dots periodically
  useEffect(() => {
    const brokers = [
      { name: "Apollo", color: "#6C63FF" },
      { name: "ZoomInfo", color: "#4FD1C5" },
      { name: "PeopleFinder", color: "#8B85FF" },
      { name: "Spokeo", color: "#6C63FF" },
      { name: "BeenVerified", color: "#4FD1C5" },
      { name: "Whitepages", color: "#8B85FF" },
    ];

    const interval = setInterval(() => {
      if (radarDots.length < 12) {
        const broker = brokers[Math.floor(Math.random() * brokers.length)];
        const statuses: Array<"Scanning" | "Identified" | "Deletion in progress"> = ["Scanning", "Identified", "Deletion in progress"];
        
        setRadarDots((prev) => [
          ...prev,
          {
            id: dotIdCounter,
            angle: Math.random() * 360,
            distance: 30 + Math.random() * 60,
            broker: broker.name,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            color: broker.color,
          },
        ]);
        setDotIdCounter(dotIdCounter + 1);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [radarDots.length, dotIdCounter]);

  // Add activity logs
  useEffect(() => {
    const logs = [
      { type: "System", message: "Sleuth Agent accessing Apollo directory...", color: "#A0AEC0" },
      { type: "Scan", message: "Username pivot detected on GitHub...", color: "#6C63FF" },
      { type: "Match", message: "Identity link confirmed (confidence 92%)...", color: "#4FD1C5" },
      { type: "Legal", message: "Drafting DPDP-compliant request...", color: "#8B85FF" },
      { type: "Comm", message: "Broker response received — analyzing...", color: "#FF9F43" },
      { type: "System", message: "Proxy tunnel established...", color: "#A0AEC0" },
      { type: "Scan", message: "Cross-referencing 120+ platforms...", color: "#6C63FF" },
      { type: "Match", message: "Email exposure detected on Spokeo...", color: "#4FD1C5" },
      { type: "Legal", message: "GDPR deletion request sent...", color: "#8B85FF" },
      { type: "Comm", message: "Awaiting broker confirmation...", color: "#FF9F43" },
    ];

    let logId = 0;
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setActivityLogs((prev) => [
        { ...randomLog, id: logId++ },
        ...prev.slice(0, 19),
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
            className="text-xl tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
          >
            DataReaper
          </span>

          <div className="flex items-center gap-8">
            <button className="text-sm hover:text-[#6C63FF] transition-colors" style={{ color: "#0B0F1A" }}>
              Dashboard
            </button>
            <button
              onClick={() => navigate("/war-room")}
              className="text-sm hover:text-[#6C63FF] transition-colors"
              style={{ color: "#717182" }}
            >
              War Room
            </button>
            <button
              onClick={() => navigate("/identity-graph")}
              className="text-sm hover:text-[#6C63FF] transition-colors"
              style={{ color: "#717182" }}
            >
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

      {/* Main Content */}
      <div className="max-w-[1300px] mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            title="Brokers Scanned"
            value={`${stats.brokers}+`}
            subtext="Active reconnaissance"
            color="#6C63FF"
          />
          <StatCard
            icon={<Shield className="w-6 h-6" />}
            title="Exposures Found"
            value={stats.exposures.toString()}
            subtext="Active threats detected"
            color="#FF6B6B"
          />
          <StatCard
            icon={<Trash2 className="w-6 h-6" />}
            title="Deletions Secured"
            value={stats.deletions.toString()}
            subtext="Successfully removed"
            color="#4FD1C5"
          />
          <StatCard
            icon={<Scale className="w-6 h-6" />}
            title="Active Legal Disputes"
            value={stats.disputes.toString()}
            subtext="Awaiting response"
            color="#8B85FF"
          />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Threat Breakdown */}
          <div className="col-span-12 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 border shadow-lg"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(108, 99, 255, 0.3)",
              }}
            >
              <h3 className="text-lg mb-4" style={{ color: "#0B0F1A" }}>
                Threat Breakdown
              </h3>
              <div className="space-y-4">
                <ThreatItem label="Emails Exposed" value="14" color="#FF6B6B" />
                <ThreatItem label="Phone Leaks" value="8" color="#FF9F43" />
                <ThreatItem label="Location Traces" value="6" color="#6C63FF" />
                <ThreatItem label="Social Profiles" value="10" color="#4FD1C5" />
              </div>
            </motion.div>
          </div>

          {/* Center - Radar */}
          <div className="col-span-12 lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-8 border relative shadow-lg"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(108, 99, 255, 0.3)",
                minHeight: "500px",
              }}
            >
              <div className="flex items-center justify-center h-full">
                <div className="relative w-full max-w-[400px] aspect-square">
                  {/* Radar Grid */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
                    {/* Concentric circles */}
                    {[100, 150, 200].map((r) => (
                      <circle
                        key={r}
                        cx="200"
                        cy="200"
                        r={r}
                        fill="none"
                        stroke="rgba(108, 99, 255, 0.3)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Grid lines */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                      const rad = (angle * Math.PI) / 180;
                      const x2 = 200 + Math.cos(rad) * 200;
                      const y2 = 200 + Math.sin(rad) * 200;
                      return (
                        <line
                          key={angle}
                          x1="200"
                          y1="200"
                          x2={x2}
                          y2={y2}
                          stroke="rgba(108, 99, 255, 0.15)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Sweep line */}
                    <motion.line
                      x1="200"
                      y1="200"
                      x2={200 + Math.cos((sweepAngle * Math.PI) / 180) * 200}
                      y2={200 + Math.sin((sweepAngle * Math.PI) / 180) * 200}
                      stroke="rgba(79, 209, 197, 0.8)"
                      strokeWidth="2"
                      style={{
                        filter: "drop-shadow(0 0 8px rgba(79, 209, 197, 0.8))",
                      }}
                    />

                    {/* Sweep gradient */}
                    <defs>
                      <radialGradient id="sweepGradient">
                        <stop offset="0%" stopColor="rgba(79, 209, 197, 0.2)" />
                        <stop offset="100%" stopColor="rgba(79, 209, 197, 0)" />
                      </radialGradient>
                    </defs>
                    <motion.path
                      d={`M 200 200 L ${200 + Math.cos((sweepAngle * Math.PI) / 180) * 200} ${
                        200 + Math.sin((sweepAngle * Math.PI) / 180) * 200
                      } A 200 200 0 0 0 ${200 + Math.cos(((sweepAngle - 45) * Math.PI) / 180) * 200} ${
                        200 + Math.sin(((sweepAngle - 45) * Math.PI) / 180) * 200
                      } Z`}
                      fill="url(#sweepGradient)"
                    />

                    {/* Radar dots */}
                    {radarDots.map((dot) => {
                      const rad = (dot.angle * Math.PI) / 180;
                      const x = 200 + Math.cos(rad) * (dot.distance * 2);
                      const y = 200 + Math.sin(rad) * (dot.distance * 2);

                      return (
                        <g key={dot.id}>
                          <motion.circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={dot.color}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                              filter: `drop-shadow(0 0 8px ${dot.color})`,
                            }}
                          />
                          {/* Pulse ring */}
                          <motion.circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="none"
                            stroke={dot.color}
                            strokeWidth="2"
                            initial={{ scale: 1, opacity: 0.8 }}
                            animate={{ scale: 3, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Center Label */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div
                        className="text-2xl mb-2"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          color: "#0B0F1A",
                        }}
                      >
                        ACTIVE SCAN
                      </div>
                      <div className="text-sm" style={{ color: "#717182" }}>
                        Monitoring global data exposure
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Agent Status */}
          <div className="col-span-12 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 border shadow-lg"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(108, 99, 255, 0.3)",
              }}
            >
              <h3 className="text-lg mb-4" style={{ color: "#0B0F1A" }}>
                Agent Status
              </h3>
              <div className="space-y-4">
                <AgentStatus name="Sleuth Agent" status="Active" statusColor="#4FD1C5" />
                <AgentStatus name="Legal Agent" status="Drafting notices" statusColor="#FF9F43" />
                <AgentStatus name="Communications Agent" status="Engaged" statusColor="#4FD1C5" />
                <AgentStatus name="Deletion Agent" status="Processing" statusColor="#6C63FF" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl p-6 border shadow-lg"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "rgba(108, 99, 255, 0.3)",
          }}
        >
          <h3 className="text-lg mb-4" style={{ color: "#0B0F1A" }}>
            Live Activity Feed
          </h3>
          <div
            className="space-y-2 max-h-[200px] overflow-y-auto"
            style={{ fontFamily: "'Courier New', monospace", fontSize: "13px" }}
          >
            {activityLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: `${log.type === "System" ? "#A0AEC0" : log.type === "Scan" ? "#6C63FF" : log.type === "Match" ? "#4FD1C5" : log.type === "Legal" ? "#8B85FF" : "#FF9F43"}20`,
                    color: log.type === "System" ? "#A0AEC0" : log.type === "Scan" ? "#6C63FF" : log.type === "Match" ? "#4FD1C5" : log.type === "Legal" ? "#8B85FF" : "#FF9F43",
                  }}
                >
                  {log.type}
                </span>
                <span style={{ color: "#717182" }}>{log.message}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl p-6 border relative overflow-hidden group shadow-lg"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "rgba(108, 99, 255, 0.3)",
      }}
    >
      <motion.div
        className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div style={{ color }}>{icon}</div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="text-3xl mb-1" style={{ color: "#0B0F1A" }}>
          {value}
        </div>
        <div className="text-sm mb-1" style={{ color: "#717182" }}>
          {title}
        </div>
        <div className="text-xs" style={{ color: "#A0AEC0" }}>
          {subtext}
        </div>
      </div>
    </motion.div>
  );
}

function ThreatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "#717182" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-lg" style={{ color: "#0B0F1A" }}>
          {value}
        </span>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color, filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </div>
    </div>
  );
}

function AgentStatus({
  name,
  status,
  statusColor,
}: {
  name: string;
  status: string;
  statusColor: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm mb-1" style={{ color: "#0B0F1A" }}>
          {name}
        </div>
        <div className="text-xs" style={{ color: "#717182" }}>
          {status}
        </div>
      </div>
      <motion.div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: statusColor }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}