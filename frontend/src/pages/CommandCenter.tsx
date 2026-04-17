import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Activity, Shield, Trash2, Scale, Zap, Users, Globe, Database, Maximize2, Minimize2, X } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { PressureFilter } from "../components/PressureFilter";
import { PressureText } from "../components/PressureText";

// â”€â”€ Constants & Colors â”€â”€
const COLORS = {
  bg: "#f5f3ef",
  card: "#f1eee8",
  blue: "#4a6fa5",
  orange: "#d17a22",
  red: "#b94a48",
  green: "#4f7d5c",
  text: "#1f1f1f",
  textSec: "#5a5a5a",
};

// â”€â”€ Types â”€â”€
interface RadarDot {
  id: number;
  angle: number;
  distance: number;
  broker: string;
  status: "Scanning" | "Identified" | "Deletion in progress";
  color: string;
  type: "email" | "phone" | "location";
  confidence: number;
}

interface BattleMessage {
  id: number;
  sender: "ai" | "broker";
  text: string;
  timestamp: string;
}

// â”€â”€ Mock data generators â”€â”€
const generateSparkline = (base: number, variance: number, len = 8) =>
  Array.from({ length: len }, (_, i) => ({
    v: Math.max(0, base + Math.floor((Math.random() - 0.4) * variance * (1 + i * 0.1))),
  }));

const PIVOT_DATA = {
  emails: ["target_alpha@gmail.com", "ceo_leaked@proton.me", "admin@corp.io"],
  usernames: ["sys_admin_99", "ops_lead_x", "dev_master", "db_admin", "network_sec", "infra_eng"],
  platforms: ["Okta Logs", "AWS S3 Bucket", "Slack Archive", "GitHub Repo", "Jira Board", "Confluence", "Discord", "Telegram Group"],
  brokers: ["DarkWeb Market", "Ransomware Blog", "Telegram Bot", "Pastebin Leak", "BreachForums"],
};

const PIVOT_EDGES: [number, number, number, number][] = [
  [0, 0, 0, 0], [0, 0, 1, 1], [0, 1, 2, 0], [0, 1, 3, 1], [0, 2, 4, 2], [1, 2, 5, 3], [1, 3, 6, 2], [2, 4, 7, 4], [2, 5, 5, 3], [1, 3, 4, 1], [0, 1, 2, 2], [2, 5, 7, 4],
];

const BATTLE_SCENARIOS: BattleMessage[][] = [
  [
    { id: 1, sender: "ai", text: "Initiating DPDP deletion request to BeenVerified...", timestamp: "14:32:01" },
    { id: 2, sender: "broker", text: "Request received. Verification required.", timestamp: "14:32:15" },
    { id: 3, sender: "ai", text: "Identity verified. Attaching compliance documentation.", timestamp: "14:32:28" },
    { id: 4, sender: "broker", text: "Processing deletion. ETA: 48 hours.", timestamp: "14:32:45" },
    { id: 5, sender: "ai", text: "Acknowledged. Setting follow-up timer.", timestamp: "14:32:52" },
    { id: 6, sender: "broker", text: "Data deletion confirmed âœ“", timestamp: "14:33:10" },
  ],
  [
    { id: 7, sender: "ai", text: "Sending GDPR Art.17 request to Spokeo...", timestamp: "15:01:03" },
    { id: 8, sender: "broker", text: "Automated response: Reviewing request.", timestamp: "15:01:18" },
    { id: 9, sender: "ai", text: "Escalating â€” non-compliant delay detected.", timestamp: "15:02:44" },
    { id: 10, sender: "broker", text: "Escalation acknowledged. Prioritizing.", timestamp: "15:03:01" },
    { id: 11, sender: "ai", text: "Reminder: 72h deadline per regulation.", timestamp: "15:03:15" },
    { id: 12, sender: "broker", text: "Records removed. Confirmation sent âœ“", timestamp: "15:04:00" },
  ],
  [
    { id: 13, sender: "ai", text: "Targeting Whitepages profile #4829...", timestamp: "16:12:00" },
    { id: 14, sender: "broker", text: "Profile located. Opt-out initiated.", timestamp: "16:12:22" },
    { id: 15, sender: "ai", text: "Verifying removal from cache layers...", timestamp: "16:12:40" },
    { id: 16, sender: "broker", text: "Cache purge complete.", timestamp: "16:13:05" },
    { id: 17, sender: "ai", text: "Cross-referencing mirror sites...", timestamp: "16:13:20" },
    { id: 18, sender: "broker", text: "All mirrors cleared âœ“", timestamp: "16:13:55" },
  ],
];

const AGENT_DATA = [
  { name: "Sleuth Agent", status: "Active", task: "Scraping Apollo directory...", progress: 72 },
  { name: "Legal Agent", status: "Drafting", task: "DPDP notice for Spokeo...", progress: 45 },
  { name: "Comms Agent", status: "Engaged", task: "Negotiating with broker...", progress: 88 },
  { name: "Deletion Agent", status: "Processing", task: "Purging cached records...", progress: 33 },
];

const THREAT_COLORS = { email: COLORS.blue, phone: COLORS.orange, location: COLORS.red };

// â”€â”€ Sub-components â”€â”€

function MiniSparkline({ data, color = COLORS.blue }: { data: { v: number }[]; color?: string }) {
  return (
    <div style={{ width: "100%", height: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EnhancedStatCard({
  icon, title, value, trend, trendUp, sparkData, tintColor, accentColor
}: {
  icon: React.ReactNode; title: string; value: string; trend: string; trendUp: boolean; sparkData: { v: number }[]; tintColor?: string; accentColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01, filter: "brightness(0.98)" }}
      transition={{ duration: 0.2 }}
      className="hand-drawn-card p-4 relative overflow-hidden"
      style={{
        backgroundColor: tintColor || COLORS.card,
        border: "1px solid rgba(31,31,31,0.06)",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div style={{ filter: "url(#pencil-sketch)", color: accentColor || COLORS.textSec, opacity: 0.9 }}>{icon}</div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "'Patrick Hand', cursive", color: trendUp ? COLORS.green : COLORS.red }}
            >
              {trend}
            </span>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ filter: "url(#pencil-sketch)", backgroundColor: accentColor || COLORS.text }}
            />
          </div>
        </div>
        <div className="text-3xl mb-1 font-bold" style={{ fontFamily: "'Dancing Script', cursive", color: accentColor || COLORS.text }}>
          {value}
        </div>
        <div className="text-lg" style={{ fontFamily: "'Caveat', cursive", color: COLORS.text, opacity: 0.9 }}>
          {title}
        </div>
        <div className="mt-2">
          <MiniSparkline data={sparkData} color={accentColor || COLORS.blue} />
        </div>
      </div>
    </motion.div>
  );
}

function ThreatItem({ label, value, pct, color }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
      className="border-b-[1.5px] border-dashed border-black/10 pb-2 px-1 transition-colors duration-200"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, opacity: 0.8 }}>
          {label}
        </span>
        <span className="text-xl font-bold" style={{ fontFamily: "'Caveat', cursive", color: color || COLORS.text }}>
          {value}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color || "rgba(26,26,26,0.3)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

function EnhancedAgentStatus({ name, status, task, progress }: { name: string; status: string; task: string; progress: number }) {
  let statusColor = COLORS.textSec;
  if (status.toLowerCase().includes("active") || status.toLowerCase().includes("engaged")) statusColor = COLORS.green;
  if (status.toLowerCase().includes("processing") || status.toLowerCase().includes("drafting")) statusColor = COLORS.blue;
  if (status.toLowerCase().includes("warning")) statusColor = COLORS.orange;

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
      className="border-b-[1.5px] border-dashed border-black/10 pb-3 px-1 transition-colors duration-200"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-lg" style={{ fontFamily: "'Caveat', cursive", color: COLORS.text }}>
          {name}
        </div>
        <motion.div
          className="w-2.5 h-2.5 rounded-full border-2"
          style={{ filter: "url(#pencil-sketch)", borderColor: statusColor }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            style={{ backgroundColor: statusColor }}
            animate={{ scale: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
      <div className="text-sm mb-1.5 italic" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.textSec, opacity: 0.8 }}>
        {task}
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px" }}>
        <motion.div
          className="h-full"
          style={{ background: statusColor, borderRadius: "inherit", opacity: 0.75 }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs" style={{ fontFamily: "'Patrick Hand', cursive", color: statusColor }}>{status}</span>
        <span className="text-xs" style={{ fontFamily: "'Patrick Hand', cursive", color: COLORS.text, opacity: 0.7 }}>{progress}%</span>
      </div>
    </motion.div>
  );
}

function PivotSummary({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? "rgba(255,255,255,0.85)" : COLORS.text;
  const barBg = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const barFill = dark ? "rgba(255,255,255,0.3)" : "rgba(26,26,26,0.25)";

  const items = [
    { label: "Total Identities", value: 47, max: 60 },
    { label: "Usernames Extracted", value: 23, max: 60 },
    { label: "Platforms Scanned", value: 124, max: 150 },
    { label: "Brokers Matched", value: 38, max: 60 },
  ];
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-end justify-between mb-1">
            <span className="text-sm" style={{ fontFamily: "'Patrick Hand', cursive", color: textColor, opacity: 0.7 }}>
              {item.label}
            </span>
            <motion.span
              className="text-2xl font-bold leading-none"
              style={{ fontFamily: "'Caveat', cursive", color: textColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {item.value}
            </motion.span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: barBg }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: dark ? COLORS.orange : barFill, opacity: dark ? 0.7 : 1 }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / item.max) * 100}%` }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
function PivotTreeGraph() {
  const cols = [PIVOT_DATA.emails, PIVOT_DATA.usernames, PIVOT_DATA.platforms, PIVOT_DATA.brokers];
  const colLabels = ["Emails", "Usernames", "Platforms", "Brokers"];
  const colColors = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.red];
  const svgW = 520, svgH = 200;
  const colX = [60, 190, 320, 450];

  const getY = (colIdx: number, itemIdx: number) => {
    const count = cols[colIdx].length;
    const spacing = svgH / (count + 1);
    return spacing * (itemIdx + 1);
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Column labels */}
        {colLabels.map((label, ci) => (
          <text key={label} x={colX[ci]} y={16} textAnchor="middle" fontSize="11" fontFamily="'Patrick Hand', cursive" fill="#1a1a1a" opacity={0.6}>
            {label}
          </text>
        ))}
        {/* Edges */}
        {PIVOT_EDGES.map((edge, ei) => {
          const [c1, i1, c2, i2] = [edge[0], edge[1], edge[0] + 1, edge[2] < cols[edge[0] + 1].length ? edge[2] : 0];
          const realC2 = edge[0] + 1;
          const realI2 = edge[2] < cols[realC2].length ? edge[2] : edge[2] % cols[realC2].length;
          const x1 = colX[edge[0]], y1 = getY(edge[0], edge[1]);
          const x2 = colX[realC2], y2 = getY(realC2, realI2);
          const mx = (x1 + x2) / 2;
          return (
            <motion.path
              key={ei}
              d={`M ${x1 + 8} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 8} ${y2}`}
              stroke={colColors[edge[0]]}
              strokeWidth="1.2"
              strokeDasharray="4,3"
              fill="none"
              opacity={0.35}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.3 + ei * 0.08, ease: "easeOut" }}
            />
          );
        })}
        {/* Second layer edges (usernamesâ†’platforms) */}
        {[
          [1, 0, 2, 1], [1, 1, 2, 3], [1, 2, 2, 0], [1, 3, 2, 5], [1, 4, 2, 2], [1, 5, 2, 6], [1, 0, 2, 4], [1, 2, 2, 7],
        ].map((edge, ei) => {
          const realI2 = edge[2] < cols[edge[0] + 1]?.length ? edge[2] : (edge[2] % (cols[edge[0] + 1]?.length || 1));
          const x1 = colX[edge[0]], y1 = getY(edge[0], edge[1]);
          const x2 = colX[edge[0] + 1], y2 = getY(edge[0] + 1, realI2);
          const mx = (x1 + x2) / 2;
          return (
            <motion.path
              key={`l2-${ei}`}
              d={`M ${x1 + 8} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 8} ${y2}`}
              stroke={colColors[1]} strokeWidth="1.2" strokeDasharray="4,3" fill="none" opacity={0.3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 1.0 + ei * 0.06, ease: "easeOut" }}
            />
          );
        })}
        {/* Third layer edges (platformsâ†’brokers) */}
        {[
          [2, 0, 3, 0], [2, 1, 3, 1], [2, 2, 3, 2], [2, 3, 3, 0], [2, 4, 3, 3], [2, 5, 3, 4], [2, 6, 3, 1], [2, 7, 3, 2],
        ].map((edge, ei) => {
          const realI2 = edge[2] < cols[edge[0] + 1]?.length ? edge[2] : (edge[2] % (cols[edge[0] + 1]?.length || 1));
          const x1 = colX[edge[0]], y1 = getY(edge[0], edge[1]);
          const x2 = colX[edge[0] + 1], y2 = getY(edge[0] + 1, realI2);
          const mx = (x1 + x2) / 2;
          return (
            <motion.path
              key={`l3-${ei}`}
              d={`M ${x1 + 8} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 8} ${y2}`}
              stroke={colColors[2]} strokeWidth="1.2" strokeDasharray="4,3" fill="none" opacity={0.3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 1.6 + ei * 0.06, ease: "easeOut" }}
            />
          );
        })}
        {/* Nodes */}
        {cols.map((col, ci) =>
          col.map((item, ii) => {
            const x = colX[ci], y = getY(ci, ii);
            return (
              <g key={`${ci}-${ii}`}>
                <motion.circle
                  cx={x} cy={y} r={6}
                  fill="#fdfbf7" stroke={colColors[ci]} strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + ci * 0.3 + ii * 0.05, type: "spring", stiffness: 200 }}
                />
                <text
                  x={x} y={y + 16} textAnchor="middle" fontSize="7"
                  fontFamily="'Patrick Hand', cursive" fill="#1a1a1a" opacity={0.6}
                >
                  {item.length > 10 ? item.slice(0, 9) + "..." : item}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

function LiveBattleViewer() {
  const [messages, setMessages] = useState<BattleMessage[]>([]);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        const scenario = BATTLE_SCENARIOS[scenarioIdx % BATTLE_SCENARIOS.length];
        if (msgIdx < scenario.length) {
          setMsgIdx((p) => p + 1);
          const newMsgs = [...prev, scenario[msgIdx]].slice(-10);
          return newMsgs;
        } else {
          setScenarioIdx((p) => p + 1);
          setMsgIdx(0);
          return [];
        }
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [scenarioIdx, msgIdx]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={scrollRef} className="space-y-2 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] max-h-[320px]">
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.sender === "broker" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="px-3 py-2 max-w-[85%]"
              style={{
                borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: msg.sender === "ai"
                  ? "rgba(74, 158, 255, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold" style={{ fontFamily: "'Caveat', cursive", color: msg.sender === "ai" ? "#7bb8ff" : "#fbbf24" }}>
                  {msg.sender === "ai" ? "âš¡ AI" : "ðŸ¢ Broker"}
                </span>
                <span className="text-xs opacity-40" style={{ fontFamily: "'Patrick Hand', cursive", color: "#fff" }}>
                  {msg.timestamp}
                </span>
              </div>
              <span className="text-sm" style={{ fontFamily: "'Patrick Hand', cursive", color: "rgba(255,255,255,0.85)" }}>
                {msg.text}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RadarTooltip({ dot, x, y, isMagnified }: { dot: RadarDot; x: number; y: number; isMagnified: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute pointer-events-none z-50 px-4 py-3"
      style={{
        left: `${(x / 400) * 100}%`,
        top: `${(y / 400) * 100}%`,
        transform: "translate(-50%, -120%)",
        background: "rgba(253, 251, 247, 0.98)",
        backdropFilter: "blur(8px)",
        border: "1.5px solid rgba(0,0,0,0.6)",
        borderRadius: "2px 15px 2px 15px",
        boxShadow: "6px 6px 0 rgba(0,0,0,0.15)",
        minWidth: isMagnified ? "220px" : "150px",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-base font-bold" style={{ fontFamily: "'Caveat', cursive", color: "#1a1a1a" }}>{dot.broker}</div>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dot.color }} />
      </div>

      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "'Patrick Hand', cursive", color: dot.color }}>
        {dot.status}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
          <span className="opacity-60">Category:</span>
          <span className="capitalize">{dot.type}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
          <span className="opacity-60">Reliability:</span>
          <span>{dot.confidence}%</span>
        </div>

        {isMagnified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-2 mt-2 border-t border-black/10 space-y-1.5"
          >
            <div className="flex justify-between text-[11px]" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
              <span className="opacity-60">Discovery:</span>
              <span>May 12, 14:02</span>
            </div>
            <div className="flex justify-between text-[11px]" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
              <span className="opacity-60">Data Nodes:</span>
              <span>12 Sensitive</span>
            </div>
            <div className="flex justify-between text-[11px]" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
              <span className="opacity-60">Legal status:</span>
              <span style={{ color: COLORS.red }}>Unresolved</span>
            </div>
            <div className="mt-2 text-[10px] italic opacity-50" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a" }}>
              Full extraction signature verified.
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
// â”€â”€ Main Component â”€â”€
export default function CommandCenter() {
  const navigate = useNavigate();
  const [isMagnified, setIsMagnified] = useState(false);
  const [isFeedExpanded, setIsFeedExpanded] = useState(false);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [radarDots, setRadarDots] = useState<RadarDot[]>([]);
  const [activityLogs, setActivityLogs] = useState<Array<{ type: string; message: string; id: number; color: string }>>([]);
  const [hoveredDot, setHoveredDot] = useState<RadarDot | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({ brokers: 0, exposures: 0, deletions: 0, disputes: 0 });
  const [dotIdCounter, setDotIdCounter] = useState(0);
  const [sparkData] = useState({
    brokers: generateSparkline(100, 30),
    exposures: generateSparkline(30, 12),
    deletions: generateSparkline(8, 5),
    disputes: generateSparkline(3, 3),
  });

  // Animate stats counters
  useEffect(() => {
    const animateCounter = (key: string, target: number) => {
      let current = 0;
      const increment = Math.ceil(target / 20);
      const interval = setInterval(() => {
        current += increment;
        if (current >= target) { current = target; clearInterval(interval); }
        setStats((prev) => ({ ...prev, [key]: current }));
      }, 50);
    };
    const timers = [
      setTimeout(() => animateCounter("brokers", 124), 300),
      setTimeout(() => animateCounter("exposures", 38), 500),
      setTimeout(() => animateCounter("deletions", 12), 700),
      setTimeout(() => animateCounter("disputes", 5), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate radar sweep
  useEffect(() => {
    const interval = setInterval(() => { setSweepAngle((prev) => (prev + 2) % 360); }, 50);
    return () => clearInterval(interval);
  }, []);

  // Add radar dots periodically
  useEffect(() => {
    const brokers = [
      { name: "DarkWeb Market", color: "#4a9eff", type: "email" as const },
      { name: "BreachForums", color: "#4a9eff", type: "email" as const },
      { name: "Telegram Bot", color: "#ff8c42", type: "phone" as const },
      { name: "Ransomware Blog", color: "#ff8c42", type: "phone" as const },
      { name: "Pastebin Leak", color: "#ef4444", type: "location" as const },
      { name: "Underground Forum", color: "#ef4444", type: "location" as const },
    ];
    const interval = setInterval(() => {
      if (radarDots.length < 14) {
        const broker = brokers[Math.floor(Math.random() * brokers.length)];
        const statuses: Array<"Scanning" | "Identified" | "Deletion in progress"> = ["Scanning", "Identified", "Deletion in progress"];
        setRadarDots((prev) => [
          ...prev,
          {
            id: dotIdCounter,
            angle: Math.random() * 360,
            distance: 25 + Math.random() * 65,
            broker: broker.name,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            color: broker.color,
            type: broker.type,
            confidence: 60 + Math.floor(Math.random() * 38),
          },
        ]);
        setDotIdCounter(dotIdCounter + 1);
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [radarDots.length, dotIdCounter]);

  // Add activity logs
  useEffect(() => {
    const logs = [
      { type: "System", message: "Sleuth Agent accessing Apollo directory...", color: "#a0a0a0" },
      { type: "Scan", message: "Username pivot detected on GitHub...", color: COLORS.green },
      { type: "Match", message: "Identity link confirmed (confidence 92%)...", color: COLORS.green },
      { type: "Legal", message: "Drafting DPDP-compliant request...", color: COLORS.red },
      { type: "Comm", message: "Broker response received - analyzing...", color: COLORS.orange },
      { type: "System", message: "Proxy tunnel established...", color: "#a0a0a0" },
      { type: "Scan", message: "Cross-referencing 120+ platforms...", color: COLORS.green },
      { type: "Match", message: "Email exposure detected on Spokeo...", color: COLORS.green },
      { type: "Legal", message: "GDPR deletion request sent...", color: COLORS.red },
      { type: "Comm", message: "Awaiting broker confirmation...", color: COLORS.orange },
      { type: "Scan", message: "Dark web scan initiated...", color: COLORS.green },
      { type: "Match", message: "Phone linked to 3 broker records...", color: COLORS.green },
      { type: "System", message: "Cache layer purge in progress...", color: "#a0a0a0" },
      { type: "Legal", message: "Follow-up notice escalated...", color: COLORS.red },
    ];
    let logId = 0;
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setActivityLogs((prev) => [{ ...randomLog, id: logId++ }, ...prev.slice(0, 24)]);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const threatCounts = radarDots.reduce(
    (acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const renderRadarSVG = (magnified: boolean) => (
    <div className={`relative w-full ${magnified ? 'max-w-[700px]' : 'max-w-[400px]'} aspect-square mx-auto`}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" style={{ filter: "url(#pencil-sketch)" }}>
        {[80, 120, 160, 200].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={COLORS.blue}
            strokeWidth={i === 3 ? "1.5" : "0.8"} strokeDasharray={i === 3 ? "none" : "6,6"} opacity={i === 3 ? "0.15" : "0.08"} />
        ))}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line key={angle} x1="200" y1="200" x2={200 + Math.cos(rad) * 200} y2={200 + Math.sin(rad) * 200}
              stroke={COLORS.textSec} strokeWidth="0.8" opacity="0.1" />
          );
        })}

        <defs>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.blue} stopOpacity="0" />
            <stop offset="100%" stopColor={COLORS.blue} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {[-15, -10, -5, 0].map((offset, i) => (
          <motion.line key={offset}
            x1="200" y1="200"
            x2={200 + Math.cos(((sweepAngle + offset) * Math.PI) / 180) * 200}
            y2={200 + Math.sin(((sweepAngle + offset) * Math.PI) / 180) * 200}
            stroke={COLORS.blue}
            strokeWidth={i === 3 ? 2.5 : (4 - i)}
            opacity={i === 3 ? 0.6 : 0.05 + i * 0.1}
            strokeLinecap="round"
          />
        ))}

        {radarDots.map((dot) => {
          const rad = (dot.angle * Math.PI) / 180;
          const x = 200 + Math.cos(rad) * (dot.distance * 2);
          const y = 200 + Math.sin(rad) * (dot.distance * 2);
          return (
            <g key={dot.id}
              onMouseEnter={() => { setHoveredDot(dot); setHoveredPos({ x, y }); }}
              onMouseLeave={() => setHoveredDot(null)}
              style={{ cursor: "pointer" }}
            >
              <motion.circle cx={x} cy={y} r="14" fill={dot.color} opacity="0.15" />
              <motion.circle cx={x} cy={y} r="5" fill={dot.color}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.9 }}
                stroke={COLORS.card} strokeWidth="1" />
              <motion.circle cx={x} cy={y} r="6" fill="none" stroke={dot.color}
                strokeWidth="1.5" strokeDasharray="2,2"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity }} />
            </g>
          );
        })}
      </svg>

      {hoveredDot && <RadarTooltip dot={hoveredDot} x={hoveredPos.x} y={hoveredPos.y} isMagnified={magnified} />}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div className="text-center bg-[#fdfbf7]/60 px-4 py-3 rounded-full backdrop-blur-sm border border-black/10"
          style={{ filter: "url(#pencil-sketch)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="text-2xl font-bold" style={{ fontFamily: "'Caveat', cursive", color: COLORS.green, transform: "rotate(-2deg)", textShadow: "0 0 5px rgba(79, 125, 92, 0.2)" }}>
            ACTIVE SCAN
          </div>
          <div className="text-xs" style={{ color: "#1a1a1a", fontFamily: "'Patrick Hand', cursive", opacity: 0.8 }}>
            {radarDots.length} targets
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden pb-8 transition-colors duration-500">
      <PressureFilter />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 pt-4 pb-3 px-6 md:px-12 lg:px-16 flex items-center justify-between backdrop-blur-sm" style={{ backgroundColor: "rgba(245, 243, 239, 0.8)", borderBottom: "1.5px dashed rgba(0,0,0,0.15)" }}>
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img
              src="/images/logo.png"
              alt="DataReaper logo"
              style={{
                width: "104px",
                height: "60px",
                objectFit: "contain",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                flexShrink: 0,
              }}
            />
            <PressureText
              as="span"
              className="text-3xl tracking-tight"
              style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
            >
              DataReaper
            </PressureText>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button className="text-xl pencil-text transition-colors opacity-100 hover:opacity-70">Dashboard</button>
            <button onClick={() => navigate("/war-room")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">War Room</button>
            <button onClick={() => navigate("/identity-graph")} className="text-xl pencil-text transition-colors opacity-60 hover:opacity-100">Identity Graph</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}44` }} animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <PressureText as="span" className="text-xl" style={{ color: COLORS.green, fontWeight: 700, fontFamily: "'Patrick Hand', cursive" }}>Active Scan</PressureText>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1a1a1a] shadow-sm cursor-pointer" style={{ filter: "url(#pencil-sketch)", backgroundColor: "#e2e8f0" }}>
              <span className="pencil-heading text-lg font-bold">U</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-4 relative z-10">
        <div className="mb-6 border-b-[1.5px] border-dashed border-black/10 pb-4">
          <PressureText as="h1" className="text-5xl mb-0" style={{ fontFamily: "'Caveat', cursive" }}>
            Cyber Operations Center
          </PressureText>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <PressureText as="p" className="text-xl opacity-80" style={{ fontFamily: "'Patrick Hand', cursive", letterSpacing: "0.02em" }}>
              Tracking active data leaks &middot; 4 autonomous agents deployed &middot; Live mitigation in progress
            </PressureText>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <EnhancedStatCard icon={<Activity className="w-5 h-5" />} title="Brokers Scanned" value={`${stats.brokers}+`} trend="&uarr; +8 today" trendUp={true} sparkData={sparkData.brokers} tintColor="rgba(209, 122, 34, 0.04)" accentColor={COLORS.orange} />
          <EnhancedStatCard icon={<Shield className="w-5 h-5" />} title="Exposures Found" value={stats.exposures.toString()} trend="&uarr; +3 today" trendUp={true} sparkData={sparkData.exposures} tintColor="rgba(185, 74, 72, 0.04)" accentColor={COLORS.red} />
          <EnhancedStatCard icon={<Trash2 className="w-5 h-5" />} title="Deletions Secured" value={stats.deletions.toString()} trend="&uarr; +2 today" trendUp={true} sparkData={sparkData.deletions} tintColor="rgba(79, 125, 92, 0.04)" accentColor={COLORS.green} />
          <EnhancedStatCard icon={<Scale className="w-5 h-5" />} title="Active Disputes" value={stats.disputes.toString()} trend="&darr; -1 today" trendUp={false} sparkData={sparkData.disputes} tintColor="rgba(74, 111, 165, 0.04)" accentColor={COLORS.blue} />
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4">

          {/* â•â•â• LEFT COLUMN â•â•â• */}
          <div className="flex flex-col gap-4">
            {/* Threat Intel */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="hand-drawn-card p-4" style={{ backgroundColor: COLORS.card, border: "1px solid rgba(31,31,31,0.06)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)" }}>
              <PressureText as="h3" className="text-2xl mb-3" style={{ fontFamily: "'Caveat', cursive" }}>
                Threat Intelligence
              </PressureText>
              <div className="space-y-3">
                <ThreatItem label="Emails Exposed" value="14" pct={70} color={COLORS.blue} />
                <ThreatItem label="Phone Leaks" value="8" pct={40} color={COLORS.orange} />
                <ThreatItem label="Location Traces" value="6" pct={30} color={COLORS.red} />
                <ThreatItem label="Social Profiles" value="10" pct={50} color={COLORS.green} />
              </div>
            </motion.div>

            {/* Agent Status */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="hand-drawn-card p-4" style={{ backgroundColor: COLORS.card, border: "1px solid rgba(31,31,31,0.06)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)" }}>
              <PressureText as="h3" className="text-2xl mb-3" style={{ fontFamily: "'Caveat', cursive" }}>
                Agent Status
              </PressureText>
              <div className="space-y-3">
                {AGENT_DATA.map((a) => (
                  <EnhancedAgentStatus key={a.name} {...a} />
                ))}
              </div>
            </motion.div>


          </div>

          {/* â•â•â• CENTER COLUMN â•â•â• */}
          <div className="flex flex-col gap-4">
            {/* Enhanced Radar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="hand-drawn-card p-5 relative flex flex-col items-center"
              style={{ backgroundColor: COLORS.card, border: "1px solid rgba(31,31,31,0.06)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="w-full flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <PressureText as="h3" className="text-2xl" style={{ fontFamily: "'Caveat', cursive" }}>Live Radar</PressureText>
                  <button
                    onClick={() => setIsMagnified(true)}
                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors border border-black/10"
                    title="Expand Radar"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {(["email", "phone", "location"] as const).map((t) => (
                    <div key={t} className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: THREAT_COLORS[t] }} />
                      <span className="text-xs capitalize" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a", opacity: 0.6 }}>
                        {t} ({threatCounts[t] || 0})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative w-full flex justify-center py-4">
                {renderRadarSVG(false)}
              </div>
            </motion.div>

            {/* Pivot Tree Graph */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="hand-drawn-card p-4"
              style={{ backgroundColor: COLORS.card, border: "1px solid rgba(31,31,31,0.06)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.02), 2px 2px 8px rgba(0,0,0,0.04)" }}
            >
              <PressureText as="h3" className="text-2xl mb-2" style={{ fontFamily: "'Caveat', cursive" }}>
                Intelligence Pivot Chain
              </PressureText>
              <p className="text-xs mb-3" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a", opacity: 0.5 }}>
                Exposed Email &rarr; Linked Aliases &rarr; Compromised Platforms &rarr; Threat Actors
              </p>
              <PivotTreeGraph />
            </motion.div>
          </div>

          {/* â•â•â• RIGHT COLUMN â•â•â• */}
          <div className="flex flex-col gap-4">
            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="hand-drawn-card pencil-fill-dark p-4 flex flex-col"
              style={{ borderTop: `3px solid ${COLORS.blue}`, boxShadow: `inset 0 0 30px rgba(74, 111, 165, 0.15), 0 10px 15px -3px rgba(0,0,0,0.1)` }}
            >
              <div className="flex items-center justify-between mb-3 pb-3 shrink-0" style={{ borderBottom: "1.5px dashed rgba(255,255,255,0.2)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ filter: "url(#pencil-sketch)", backgroundColor: COLORS.blue + "44" }} />
                    <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ filter: "url(#pencil-sketch)", backgroundColor: COLORS.blue + "22" }} />
                    <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ filter: "url(#pencil-sketch)" }} />
                  </div>
                  <span className="pencil-heading-light text-lg ml-2" style={{ color: "#a8c0e6" }}>Activity Feed</span>
                  <button
                    onClick={() => setIsFeedExpanded(true)}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors border border-white/20 ml-2"
                    title="Expand Feed"
                  >
                    <Maximize2 className="w-3 h-3 text-white/60" />
                  </button>
                </div>
                <span className="pencil-text-light text-xs opacity-60">live_log.sys</span>
              </div>
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[280px] max-h-[400px]">
                {activityLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                    className="flex items-start gap-2 p-1.5 border-b border-white/5 transition-colors duration-150 rounded"
                    style={{ backgroundColor: log.color + "11" }}
                  >
                    <span className="pencil-text-light text-sm opacity-50 mt-0.5">&gt;</span>
                    <span className="pencil-text-light text-xs opacity-90 shrink-0 font-bold" style={{ color: log.color }}>[{log.type}]</span>
                    <span className="pencil-text-light text-sm tracking-wide opacity-90">{log.message}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Pivot Battle Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="hand-drawn-card pencil-fill-dark p-4 flex flex-col"
              style={{ borderTop: `3px solid ${COLORS.orange}`, boxShadow: `inset 0 0 30px rgba(209, 122, 34, 0.15), 0 10px 15px -3px rgba(0,0,0,0.1)` }}
            >
              <div className="flex items-center justify-between mb-3 pb-3 shrink-0" style={{ borderBottom: "1.5px dashed rgba(255,255,255,0.2)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">&#9876;</span>
                  <span className="pencil-heading-light text-lg" style={{ color: "#f5c699" }}>Pivot Battle Summary</span>
                </div>
                <motion.div className="w-2 h-2 rounded-full bg-blue-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </div>
              <PivotSummary dark={true} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Radar Modal */}
      <AnimatePresence>
        {isMagnified && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12"
            style={{ background: "rgba(253, 251, 247, 0.8)", backdropFilter: "blur(12px)" }}
          >
            <div className="absolute top-8 right-8">
              <button
                onClick={() => setIsMagnified(false)}
                className="p-3 rounded-full hover:bg-black/10 transition-colors border-2 border-black/20 bg-white/50"
                style={{ filter: "url(#pencil-sketch)" }}
              >
                <X className="w-6 h-6 text-[#1a1a1a]" />
              </button>
            </div>

            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[800px] bg-[#fdfbf7] p-8 rounded-2xl relative"
              style={{
                border: "1.5px solid rgba(0,0,0,0.15)",
                boxShadow: "10px 10px 0 rgba(0,0,0,0.05), inset 0 0 40px rgba(0,0,0,0.02)",
                borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px"
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <PressureText as="h2" className="text-4xl" style={{ fontFamily: "'Caveat', cursive" }}>
                  Expanded Radar View
                </PressureText>
                <div className="flex items-center gap-4">
                  {(["email", "phone", "location"] as const).map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: THREAT_COLORS[t] }} />
                      <span className="text-sm capitalize" style={{ fontFamily: "'Patrick Hand', cursive", color: "#1a1a1a", opacity: 0.8 }}>
                        {t} ({threatCounts[t] || 0})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full flex justify-center mt-8">
                {renderRadarSVG(true)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Feed Modal */}
      <AnimatePresence>
        {isFeedExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12"
            style={{ background: "rgba(10, 10, 10, 0.85)", backdropFilter: "blur(12px)" }}
          >
            <div className="absolute top-8 right-8">
              <button
                onClick={() => setIsFeedExpanded(false)}
                className="p-3 rounded-full hover:bg-white/10 transition-colors border-2 border-white/20 bg-black/50"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[900px] h-[80vh] bg-[#1a1a1a] p-8 rounded-2xl relative flex flex-col"
              style={{
                border: "1.5px solid rgba(255,255,255,0.15)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                borderRadius: "2px 15px 2px 15px"
              }}
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <PressureText as="h2" className="text-4xl text-white ml-4" style={{ fontFamily: "'Caveat', cursive" }}>
                    Live System Logs
                  </PressureText>
                </div>
                <div className="text-xs font-mono text-white/40">
                  SESSION_ID: DR_7729_X
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-3">
                {activityLogs.map((log) => (
                  <motion.div
                    key={`modal-${log.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-4 p-4 border-b border-white/5 rounded-lg bg-white/5"
                    style={{ borderLeft: `4px solid ${log.color}` }}
                  >
                    <span className="text-white/30 font-mono text-sm mt-1">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: log.color }}>{log.type}</span>
                      <span className="text-white/90 text-xl leading-relaxed" style={{ fontFamily: "'Patrick Hand', cursive" }}>{log.message}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollbar styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
