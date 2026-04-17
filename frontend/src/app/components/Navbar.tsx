import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { PressureText } from "./PressureText";

export function Navbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ padding: "12px 20px" }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div
        className="hand-drawn-border"
        style={{
          maxWidth: "1344px",
          margin: "0 auto",
          backgroundColor: "#fdfbf7",
          boxShadow: isScrolled
            ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)"
            : "0 1px 3px rgba(0,0,0,0.05)",
          padding: "8px 8px 8px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "box-shadow 0.3s ease",
        }}
      >
        {/* Left: Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none" style={{ filter: "url(#pencil-sketch)" }}>
            <circle cx="15" cy="15" r="13" stroke="#2b2b2b" strokeWidth="1.5" />
            <circle cx="15" cy="15" r="7" stroke="#2b2b2b" strokeWidth="1" opacity="0.5" />
            <circle cx="15" cy="15" r="2.5" fill="#2b2b2b" />
          </svg>
          <PressureText
            as="span"
            variant="strong"
            className="paper-text"
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            DataReaper
          </PressureText>
          {/* Status badge */}
            <PressureText as="span" variant="lite" className="paper-text" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "14px", fontWeight: 500, border: "1px solid #2b2b2b", borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              System Online
            </PressureText>
        </div>

        {/* Center: Nav links */}
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "40px" }}
        >
          <a
            href="#engine"
            style={{ textDecoration: "none" }}
          >
            <PressureText variant="medium" className="paper-text" style={{ fontSize: "18px", fontFamily: "'Patrick Hand', cursive", display: "flex", alignItems: "center", gap: "4px" }}>
              Pivot Engine <ChevronDown size={14} strokeWidth={1.5} />
            </PressureText>
          </a>
          <a
            href="#agents"
            style={{ textDecoration: "none" }}
          >
            <PressureText variant="medium" className="paper-text" style={{ fontSize: "18px", fontFamily: "'Patrick Hand', cursive", display: "flex", alignItems: "center", gap: "4px" }}>
              Multi-Agent <ChevronDown size={14} strokeWidth={1.5} />
            </PressureText>
          </a>
          <a
            href="#dashboard"
            style={{ textDecoration: "none" }}
          >
            <PressureText variant="medium" className="paper-text" style={{ fontSize: "18px", fontFamily: "'Patrick Hand', cursive" }}>
              Dashboard
            </PressureText>
          </a>
        </div>

        {/* Right: CTA */}
        <button
          onClick={() => navigate("/onboarding")}
          className="hidden md:block hand-drawn-button"
          style={{
            fontSize: "16px",
            padding: "12px 28px",
            cursor: "pointer",
          }}
        >
          <PressureText variant="medium" className="paper-text" style={{ fontFamily: "'Patrick Hand', cursive" }}>
            Initialize Screening
          </PressureText>
        </button>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            color: "#060B25",
          }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden hand-drawn-border"
            style={{
              maxWidth: "1344px",
              margin: "8px auto 0",
              backgroundColor: "#fdfbf7",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <a href="#engine" className="pencil-text" style={{ fontSize: "18px", textDecoration: "none" }}>Pivot Engine</a>
            <a href="#agents" className="pencil-text" style={{ fontSize: "18px", textDecoration: "none" }}>Multi-Agent</a>
            <a href="#dashboard" className="pencil-text" style={{ fontSize: "18px", textDecoration: "none" }}>Dashboard</a>
            <button
              onClick={() => navigate("/onboarding")}
              className="hand-drawn-button"
              style={{ fontSize: "16px", padding: "12px", width: "100%" }}
            >
              Initialize Screening
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}