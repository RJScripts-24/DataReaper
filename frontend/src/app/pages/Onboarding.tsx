import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function Onboarding() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  const handleInitialize = () => {
    if (!input.trim()) return;

    setIsScanning(true);

    const lines = [
      "Booting Sleuth Agent...",
      "Establishing secure proxy tunnels...",
      "Rotating IP pools...",
      "Scanning 120+ platforms...",
      "Extracting usernames...",
      "Building identity graph...",
      "Cross-referencing data brokers...",
      "Target acquired.",
    ];

    let currentLine = 0;

    const typeInterval = setInterval(() => {
      if (currentLine < lines.length) {
        setTerminalLines((prev) => [...prev, lines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setShowCursor(false);
          // Navigate to command center after 1 second
          setTimeout(() => {
            navigate("/command-center");
          }, 1000);
        }, 1000);
      }
    }, 800);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#F7F7FB", fontFamily: "Inter, sans-serif" }}
    >
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Noise Texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating Blurred Nodes */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(circle, #4FD1C5 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-32 py-6 flex items-center justify-between max-w-[1400px] mx-auto z-10">
        <span
          className="text-xl tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif", color: "#0B0F1A" }}
        >
          DataReaper
        </span>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm hover:text-[#6C63FF] transition-colors"
          style={{ color: "#717182" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-[600px] w-full px-6 relative z-10">
        <AnimatePresence mode="wait">
          {!isScanning ? (
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl p-10 border relative overflow-hidden shadow-2xl"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(108, 99, 255, 0.3)",
                boxShadow: "0 0 40px rgba(108, 99, 255, 0.15)",
              }}
            >
              {/* Subtle glow effect */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(108, 99, 255, 0.15) 0%, transparent 50%)",
                }}
              />

              <div className="relative z-10">
                {/* Title */}
                <h1
                  className="mb-3 leading-tight"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(2rem, 4vw, 2.5rem)",
                    color: "#0B0F1A",
                  }}
                >
                  Initialize Target Acquisition
                </h1>

                <p
                  className="mb-8 text-lg"
                  style={{ color: "#717182" }}
                >
                  Enter a single data point to begin the scan.
                </p>

                {/* Input Field */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInitialize();
                    }}
                    placeholder="Enter email or phone number..."
                    className="w-full bg-transparent border-b-2 pb-3 text-lg outline-none transition-all duration-300 focus:border-[#6C63FF] focus:shadow-[0_4px_12px_rgba(108,99,255,0.3)]"
                    style={{
                      borderColor: "rgba(113, 113, 130, 0.3)",
                      color: "#0B0F1A",
                      fontFamily: "'Courier New', monospace",
                    }}
                  />
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={handleInitialize}
                  disabled={!input.trim()}
                  whileHover={{ scale: input.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: input.trim() ? 0.98 : 1 }}
                  className="w-full py-4 rounded-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)",
                    boxShadow: input.trim()
                      ? "0 0 30px rgba(108, 99, 255, 0.4)"
                      : "none",
                  }}
                >
                  <span className="relative z-10 text-white text-lg">
                    Initialize Scan
                  </span>
                  {input.trim() && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl p-10 border shadow-2xl"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(108, 99, 255, 0.3)",
                boxShadow: "0 0 40px rgba(108, 99, 255, 0.15)",
              }}
            >
              {/* Terminal Header */}
              <div className="flex items-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: "rgba(113, 113, 130, 0.2)" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span
                  className="text-sm ml-2"
                  style={{ color: "#717182", fontFamily: "'Courier New', monospace" }}
                >
                  sleuth-agent.exe
                </span>
              </div>

              {/* Terminal Content */}
              <div
                className="space-y-2"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <div className="mb-4" style={{ color: "#4FD1C5" }}>
                  &gt; Target: {input}
                </div>

                {terminalLines.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      color: line && line.includes("acquired")
                        ? "#4FD1C5"
                        : line && line.includes("Error")
                        ? "#FF6B6B"
                        : "#717182",
                    }}
                  >
                    {line}
                  </motion.div>
                ))}

                {/* Blinking Cursor */}
                {showCursor && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ color: "#6C63FF" }}
                  >
                    ▊
                  </motion.span>
                )}

                {/* Completion Message */}
                {terminalLines.length === 8 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 pt-4 border-t"
                    style={{ borderColor: "rgba(113, 113, 130, 0.2)" }}
                  >
                    <div
                      className="text-center py-4"
                      style={{ color: "#4FD1C5" }}
                    >
                      ✓ System initialized successfully
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}