import { motion } from "motion/react";

export function FeaturesSection() {
  const dashboardFeatures = [
    {
      title: "Live Radar Interface",
      description: "As the Sleuth Agent uncovers your data across broker sites, visual 'threats' ping autonomously on a live radar map.",
      icon: (
        <svg viewBox="0 0 100 100" width="80px" height="80px" style={{ filter: "url(#pencil-sketch)", overflow: "visible" }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#2b2b2b" strokeWidth="2" strokeDasharray="5,5" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#2b2b2b" strokeWidth="2" strokeDasharray="5,5" />
          <circle cx="50" cy="50" r="10" fill="#2b2b2b" />
          <path d="M 50 50 L 80 20" stroke="#25B876" strokeWidth="4" strokeLinecap="round" />
          <circle cx="70" cy="30" r="6" fill="#ff4a4a" />
        </svg>
      )
    },
    {
      title: "The Pivot Tree",
      description: "A dynamic visual graph showing you exactly how the AI connected a single starting email into a massive web of identity footprints.",
      icon: (
        <svg viewBox="0 0 100 100" width="80px" height="80px" style={{ filter: "url(#pencil-sketch)", overflow: "visible" }}>
          <line x1="50" y1="80" x2="50" y2="40" stroke="#2b2b2b" strokeWidth="4" />
          <line x1="50" y1="40" x2="20" y2="20" stroke="#2b2b2b" strokeWidth="3" />
          <line x1="50" y1="40" x2="80" y2="20" stroke="#2b2b2b" strokeWidth="3" />
          <circle cx="50" cy="80" r="8" fill="#a8a5f0" />
          <circle cx="20" cy="20" r="12" fill="#fbc387" />
          <circle cx="80" cy="20" r="12" fill="#fcd73a" />
        </svg>
      )
    },
    {
      title: "Live Battle Viewer",
      description: "A side-panel chat interface that lets you sit back and watch the live email thread unfold in real-time as your Comms Agent verbally spars with broker support bots.",
      icon: (
        <svg viewBox="0 0 100 100" width="80px" height="80px" style={{ filter: "url(#pencil-sketch)", overflow: "visible" }}>
          <rect x="10" y="20" width="50" height="40" rx="8" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
          <line x1="20" y1="35" x2="50" y2="35" stroke="#2b2b2b" strokeWidth="3" />
          <line x1="20" y1="45" x2="40" y2="45" stroke="#2b2b2b" strokeWidth="3" />
          <rect x="40" y="40" width="50" height="40" rx="8" fill="#C4FAE2" stroke="#2b2b2b" strokeWidth="3" />
          <line x1="50" y1="55" x2="80" y2="55" stroke="#2b2b2b" strokeWidth="3" />
          <line x1="50" y1="65" x2="70" y2="65" stroke="#2b2b2b" strokeWidth="3" />
        </svg>
      )
    }
  ];

  const techStack = [
    { cat: "LLM Brain", tech: "Gemini Pro / Flash" },
    { cat: "Orchestration", tech: "LangGraph / CrewAI (Python)" },
    { cat: "Scraping", tech: "Playwright Headless Browsing" },
    { cat: "OSINT", tech: "Holehe, Sherlock" },
    { cat: "Comms", tech: "Gmail API (Polling)" },
    { cat: "Frontend", tech: "React / Vite / TailwindCSS" }
  ];

  return (
    <section style={{ backgroundColor: "transparent", borderTop: "2px dashed rgba(0,0,0,0.15)", paddingTop: "100px", paddingBottom: "100px" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 48px" }}>
        
        {/* Top Segment: Dashboard */}
        <div style={{ marginBottom: "100px" }}>
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="pencil-heading" 
            style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 700, lineHeight: 1.1, marginBottom: "40px", textAlign: "center" }}
          >
            🖥️ The <span style={{ color: "#a8a5f0" }}>"Privacy Shield"</span> Dashboard
          </motion.h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px" }}>
            {dashboardFeatures.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="hand-drawn-card"
                style={{ padding: "40px 32px", textAlign: "center", backgroundColor: "#fff" }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                  {feat.icon}
                </div>
                <h3 className="pencil-heading" style={{ fontSize: "1.75rem", marginBottom: "16px" }}>{feat.title}</h3>
                <p className="pencil-text" style={{ fontSize: "16px", lineHeight: 1.6, margin: 0 }}>{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Segment: Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="pencil-fill-dark hand-drawn-border"
          style={{ padding: "60px", borderRadius: "24px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 className="pencil-heading-light" style={{ fontSize: "3rem", marginBottom: "16px" }}>
              100% Free / Open-Source Stack
            </h2>
            <p className="pencil-text-light" style={{ fontSize: "18px", maxWidth: "600px", margin: "0 auto", opacity: 0.9 }}>
              DataReaper relies exclusively on powerful open-source agents and bypasses expensive commercial APIs through headless browsing and OSINT mechanics.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
            {techStack.map((item, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: "16px" }}>
                <span className="pencil-heading-light" style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#a8a5f0" }}>
                  {item.cat}
                </span>
                <span className="pencil-text-light" style={{ fontSize: "20px", fontWeight: 700 }}>
                  {item.tech}
                </span>
              </div>
            ))}
          </div>

        </motion.div>

      </div>
    </section>
  );
}