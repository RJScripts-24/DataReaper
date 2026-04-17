import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { MessageSquare, Clock, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  type: "broker" | "agent" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    classification?: string;
    legalCitation?: string;
    explanation?: string;
  };
}

interface Target {
  id: string;
  brokerName: string;
  status: "resolved" | "stalling" | "illegal" | "in-progress";
  lastActivity: string;
  messageCount: number;
  conversation: Message[];
}

const targets: Target[] = [
  {
    id: "1",
    brokerName: "Apollo.io",
    status: "illegal",
    lastActivity: "2 min ago",
    messageCount: 8,
    conversation: [
      {
        id: "m1",
        type: "agent",
        content: "We are writing to request the immediate deletion of personal data associated with user@email.com under the Digital Personal Data Protection Act 2023.",
        timestamp: "10:23 AM",
      },
      {
        id: "m2",
        type: "broker",
        content: "Thank you for your request. To proceed, please provide a government-issued photo ID and proof of address.",
        timestamp: "10:45 AM",
      },
      {
        id: "m3",
        type: "system",
        content: "Intent classified: Illegal Data Request",
        timestamp: "10:45 AM",
        metadata: {
          classification: "Violation",
        },
      },
      {
        id: "m4",
        type: "agent",
        content: "Under Section 6 of the DPDP Act 2023, your request for additional identification violates data minimization principles. The initial request contains sufficient verification. Please proceed with deletion immediately.",
        timestamp: "10:47 AM",
        metadata: {
          legalCitation: "Section 6, DPDP Act 2023",
          explanation: "Data Minimization Principle: Organizations must not collect or retain excessive personal data beyond what is necessary for the stated purpose.",
        },
      },
      {
        id: "m5",
        type: "broker",
        content: "We need to verify your identity to ensure we're deleting the correct records. This is standard procedure.",
        timestamp: "11:12 AM",
      },
      {
        id: "m6",
        type: "system",
        content: "Intent classified: Stalling Tactic",
        timestamp: "11:12 AM",
        metadata: {
          classification: "Delay",
        },
      },
      {
        id: "m7",
        type: "agent",
        content: "Your 'standard procedure' contradicts legal requirements under Section 12(1) of the DPDP Act. You have 30 days from initial request to comply. We are prepared to escalate this to the Data Protection Board if you do not confirm deletion within 48 hours.",
        timestamp: "11:15 AM",
        metadata: {
          legalCitation: "Section 12(1), DPDP Act 2023",
          explanation: "Right to Erasure: Data principals have the right to request deletion of their personal data, and fiduciaries must comply within the specified timeframe.",
        },
      },
      {
        id: "m8",
        type: "broker",
        content: "We are reviewing your request and will respond shortly.",
        timestamp: "2 min ago",
      },
    ],
  },
  {
    id: "2",
    brokerName: "Spokeo",
    status: "stalling",
    lastActivity: "15 min ago",
    messageCount: 5,
    conversation: [
      {
        id: "m1",
        type: "agent",
        content: "Request for immediate data deletion under DPDP Act 2023 for user@email.com.",
        timestamp: "9:30 AM",
      },
      {
        id: "m2",
        type: "broker",
        content: "We've received your request. Please allow 4-6 weeks for processing.",
        timestamp: "10:15 AM",
      },
      {
        id: "m3",
        type: "system",
        content: "Intent classified: Stalling (Excessive Timeline)",
        timestamp: "10:15 AM",
        metadata: {
          classification: "Delay",
        },
      },
      {
        id: "m4",
        type: "agent",
        content: "The DPDP Act mandates a 30-day maximum response period. Your 4-6 week timeline is non-compliant. Please confirm deletion within the statutory timeframe.",
        timestamp: "10:20 AM",
        metadata: {
          legalCitation: "Section 12, DPDP Act 2023",
          explanation: "Compliance Timeline: Data fiduciaries must respond to deletion requests within 30 days of receipt.",
        },
      },
      {
        id: "m5",
        type: "broker",
        content: "We're working on expediting this. We'll update you within 2 weeks.",
        timestamp: "15 min ago",
      },
    ],
  },
  {
    id: "3",
    brokerName: "PeopleFinder",
    status: "in-progress",
    lastActivity: "1 hour ago",
    messageCount: 3,
    conversation: [
      {
        id: "m1",
        type: "agent",
        content: "Request for data deletion under DPDP Act 2023 for user@email.com.",
        timestamp: "8:45 AM",
      },
      {
        id: "m2",
        type: "broker",
        content: "We have received your request and are processing the deletion. You will receive confirmation within 15 business days.",
        timestamp: "9:30 AM",
      },
      {
        id: "m3",
        type: "system",
        content: "Status: Compliant Response",
        timestamp: "9:30 AM",
        metadata: {
          classification: "Progress",
        },
      },
    ],
  },
  {
    id: "4",
    brokerName: "Whitepages",
    status: "resolved",
    lastActivity: "2 days ago",
    messageCount: 4,
    conversation: [
      {
        id: "m1",
        type: "agent",
        content: "Request for data deletion under DPDP Act 2023 for user@email.com.",
        timestamp: "Dec 14, 2:30 PM",
      },
      {
        id: "m2",
        type: "broker",
        content: "We have received your request and will process it within 30 days.",
        timestamp: "Dec 14, 3:15 PM",
      },
      {
        id: "m3",
        type: "broker",
        content: "Your data has been successfully removed from our systems. Confirmation ID: WP-2024-7829.",
        timestamp: "Dec 14, 4:22 PM",
      },
      {
        id: "m4",
        type: "system",
        content: "Status: Deletion Confirmed",
        timestamp: "Dec 14, 4:22 PM",
        metadata: {
          classification: "Resolved",
        },
      },
    ],
  },
  {
    id: "5",
    brokerName: "ZoomInfo",
    status: "stalling",
    lastActivity: "3 hours ago",
    messageCount: 6,
    conversation: [
      {
        id: "m1",
        type: "agent",
        content: "Request for data deletion under DPDP Act 2023 for user@email.com.",
        timestamp: "7:00 AM",
      },
      {
        id: "m2",
        type: "broker",
        content: "Could you please specify which specific data points you want deleted?",
        timestamp: "8:15 AM",
      },
      {
        id: "m3",
        type: "system",
        content: "Intent classified: Burden Shifting",
        timestamp: "8:15 AM",
        metadata: {
          classification: "Delay",
        },
      },
      {
        id: "m4",
        type: "agent",
        content: "Under Section 12 of the DPDP Act, you are required to delete ALL personal data associated with the provided email address. Burden of identification lies with the data fiduciary, not the data principal.",
        timestamp: "8:20 AM",
        metadata: {
          legalCitation: "Section 12, DPDP Act 2023",
          explanation: "Complete Deletion: When a deletion request is made, all personal data associated with the identifier must be removed.",
        },
      },
      {
        id: "m5",
        type: "broker",
        content: "We're reviewing your request. Please note that some data may be retained for legal compliance purposes.",
        timestamp: "3 hours ago",
      },
      {
        id: "m6",
        type: "system",
        content: "Intent classified: Partial Compliance Attempt",
        timestamp: "3 hours ago",
        metadata: {
          classification: "Warning",
        },
      },
    ],
  },
];

export default function WarRoom() {
  const navigate = useNavigate();
  const [selectedTarget, setSelectedTarget] = useState<Target>(targets[0]);
  const [isTyping, setIsTyping] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "#4FD1C5";
      case "stalling":
        return "#FF9F43";
      case "illegal":
        return "#FF6B6B";
      case "in-progress":
        return "#4A90E2";
      default:
        return "#717182";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "resolved":
        return "Resolved";
      case "stalling":
        return "Stalling";
      case "illegal":
        return "Illegal Pushback";
      case "in-progress":
        return "In Progress";
      default:
        return "Unknown";
    }
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
            <button className="text-sm transition-colors" style={{ color: "#0B0F1A" }}>
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
                style={{ backgroundColor: "#FF6B6B" }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm" style={{ color: "#FF6B6B" }}>
                Active Engagement
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

      {/* Main Split Screen */}
      <div className="flex h-[calc(100vh-73px)] max-w-[1600px] mx-auto">
        {/* Left Pane - Active Targets */}
        <div
          className="w-[30%] border-r overflow-y-auto"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="p-6 border-b sticky top-0 bg-white z-10" style={{ borderColor: "rgba(0, 0, 0, 0.1)" }}>
            <h2
              className="text-2xl mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
            >
              Active Engagements
            </h2>
            <p className="text-sm" style={{ color: "#717182" }}>
              Monitoring legal disputes across data brokers
            </p>
          </div>

          <div className="p-4 space-y-3">
            {targets.map((target) => (
              <motion.div
                key={target.id}
                onClick={() => setSelectedTarget(target)}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl cursor-pointer border-2 transition-all shadow-sm"
                style={{
                  backgroundColor: selectedTarget.id === target.id ? "rgba(108, 99, 255, 0.05)" : "#FFFFFF",
                  borderColor:
                    selectedTarget.id === target.id
                      ? "rgba(108, 99, 255, 0.4)"
                      : "rgba(0, 0, 0, 0.1)",
                  boxShadow:
                    selectedTarget.id === target.id
                      ? "0 0 20px rgba(108, 99, 255, 0.2)"
                      : "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base mb-1" style={{ color: "#0B0F1A" }}>
                      {target.brokerName}
                    </h3>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: `${getStatusColor(target.status)}20`,
                        color: getStatusColor(target.status),
                      }}
                    >
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getStatusColor(target.status) }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {getStatusLabel(target.status)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs" style={{ color: "#717182" }}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {target.lastActivity}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {target.messageCount} messages
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Pane - Battle Viewer */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: "#F7F7FB" }}>
          {/* Conversation Header */}
          <div
            className="p-6 border-b"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-2xl mb-1"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
                >
                  {selectedTarget.brokerName}
                </h2>
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: `${getStatusColor(selectedTarget.status)}20`,
                      color: getStatusColor(selectedTarget.status),
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStatusColor(selectedTarget.status) }}
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {getStatusLabel(selectedTarget.status)}
                  </div>
                  <span className="text-xs" style={{ color: "#717182" }}>
                    Last activity: {selectedTarget.lastActivity}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/identity-graph")}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-[rgba(108,99,255,0.1)] transition-colors"
                  style={{ color: "#6C63FF", border: "1px solid rgba(108, 99, 255, 0.3)" }}
                >
                  View in Graph
                </button>
                <button
                  onClick={() => navigate("/command-center")}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-[rgba(108,99,255,0.1)] transition-colors"
                  style={{ color: "#6C63FF", border: "1px solid rgba(108, 99, 255, 0.3)" }}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {selectedTarget.conversation.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {message.type === "system" ? (
                    <SystemMessage message={message} />
                  ) : message.type === "broker" ? (
                    <BrokerMessage message={message} />
                  ) : (
                    <AgentMessage message={message} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end"
              >
                <div
                  className="px-4 py-3 rounded-2xl max-w-[70%]"
                  style={{
                    background: "linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)",
                  }}
                >
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrokerMessage({ message }: { message: Message }) {
  // Highlight risky phrases
  const highlightRiskyPhrases = (text: string) => {
    const riskyPhrases = ["passport", "ID", "photo ID", "government-issued", "proof of address", "identity verification"];
    let highlighted = text;

    riskyPhrases.forEach((phrase) => {
      const regex = new RegExp(`(${phrase})`, "gi");
      highlighted = highlighted.replace(
        regex,
        '<span style="background-color: rgba(255, 107, 107, 0.3); padding: 2px 4px; border-radius: 4px; color: #FF6B6B; font-weight: 500;">$1</span>'
      );
    });

    return highlighted;
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs" style={{ color: "#717182" }}>
            Broker Support
          </span>
          <span className="text-xs" style={{ color: "#A0AEC0" }}>
            {message.timestamp}
          </span>
        </div>
        <div
          className="px-4 py-3 rounded-2xl shadow-sm"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            className="text-sm"
            style={{ color: "#0B0F1A" }}
            dangerouslySetInnerHTML={{ __html: highlightRiskyPhrases(message.content) }}
          />
        </div>
      </div>
    </div>
  );
}

function AgentMessage({ message }: { message: Message }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Highlight legal citations
  const highlightLegalCitations = (text: string) => {
    const citationRegex = /(Section \d+(?:\(\d+\))?(?:,?\s+[A-Z]{2,}\s+Act\s+\d{4})?)/g;
    return text.replace(
      citationRegex,
      '<span style="background-color: rgba(79, 209, 197, 0.2); padding: 2px 4px; border-radius: 4px; color: #4FD1C5; font-weight: 500; cursor: help;">$1</span>'
    );
  };

  return (
    <div className="flex justify-end">
      <div className="max-w-[70%]">
        <div className="flex items-center gap-2 mb-1 justify-end">
          <span className="text-xs" style={{ color: "#A0AEC0" }}>
            {message.timestamp}
          </span>
          <span className="text-xs" style={{ color: "#6C63FF" }}>
            Communications Agent
          </span>
        </div>
        <div
          className="px-4 py-3 rounded-2xl shadow-lg relative"
          style={{
            background: "linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)",
          }}
          onMouseEnter={() => message.metadata?.legalCitation && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            className="text-sm"
            style={{ color: "#FFFFFF" }}
            dangerouslySetInnerHTML={{ __html: highlightLegalCitations(message.content) }}
          />

          {/* Tooltip for legal explanation */}
          {showTooltip && message.metadata?.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full right-0 mb-2 p-3 rounded-lg shadow-xl max-w-xs z-10"
              style={{
                backgroundColor: "#0B0F1A",
                border: "1px solid rgba(79, 209, 197, 0.3)",
              }}
            >
              <div className="text-xs mb-1" style={{ color: "#4FD1C5" }}>
                {message.metadata.legalCitation}
              </div>
              <div className="text-xs" style={{ color: "#E0E0E0" }}>
                {message.metadata.explanation}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: Message }) {
  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "Violation":
        return "#FF6B6B";
      case "Delay":
        return "#FF9F43";
      case "Warning":
        return "#FF9F43";
      case "Progress":
        return "#4A90E2";
      case "Resolved":
        return "#4FD1C5";
      default:
        return "#717182";
    }
  };

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2">
        <div
          className="px-3 py-1.5 rounded-full flex items-center gap-2 text-xs shadow-sm"
          style={{
            backgroundColor: message.metadata?.classification
              ? `${getClassificationColor(message.metadata.classification)}15`
              : "rgba(0, 0, 0, 0.05)",
            color: message.metadata?.classification
              ? getClassificationColor(message.metadata.classification)
              : "#717182",
            border: `1px solid ${message.metadata?.classification ? getClassificationColor(message.metadata.classification) : "rgba(0, 0, 0, 0.1)"}40`,
          }}
        >
          <AlertCircle className="w-3 h-3" />
          <span>{message.content}</span>
        </div>
        <span className="text-xs" style={{ color: "#A0AEC0" }}>
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}