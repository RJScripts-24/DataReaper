import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { PressureText } from "./PressureText";

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  spinning: {
    opacity: 1,
    scale: 1.2,
    transition: { duration: 0.6, ease: "easeOut" }
  },
  done: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const logoVariants = {
  initial: { rotateY: 0, scale: 1 },
  spinning: {
    rotateY: 360,  // single full rotation (no stacking = no glitch)
    scale: 1.1,
    transition: { duration: 1.2, ease: "easeInOut" }
  },
  done: {
    rotateY: 0,   // reset to 0 with no transition so it snaps silently (no second spin)
    scale: 1,
    transition: { duration: 0 }
  }
};

export function Navbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [animState, setAnimState] = useState<'initial' | 'spinning' | 'done'>('initial');

  useEffect(() => {
    // Only run this ONCE on initial mount.
    // Delay until AFTER the LandingRevealMask canvas finishes (~3840ms + 400ms fade = ~4240ms)
    // so the 3D rotateY transform doesn't conflict with the canvas composite layer.
    const t1 = setTimeout(() => {
      setAnimState('spinning');
    }, 4400);

    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ padding: "25px 20px" }}
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
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "box-shadow 0.3s ease",
        }}
      >
        {/* 1. MOVE HOVER ATTRIBUTES HERE:
          We put the data-reaper attributes on this wrapper so the hover effect
          still works, but it does NOT wrap the motion.div components directly. 
        */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
          data-reaper-expression="happy"
          data-reaper-zoom="1.3"
          data-reaper-phrases="Welcome sir!||Greetings, mortal.||The portal awaits...||Step right in, sir!"
        >
          {/* Logo Animation Container */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: "104px", height: "60px", perspective: "600px" }}>
            <motion.div
              variants={glowVariants}
              initial="initial"
              animate={animState}
              style={{
                position: 'absolute',
                width: '80%',
                height: '80%',
                background: 'radial-gradient(circle, rgba(168,85,247,0.8), transparent 70%)',
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />
            <motion.div
              variants={logoVariants}
              initial="initial"
              animate={animState}
              // 2. WAIT FOR FULL COMPLETION:
              // Only advance to 'done' when the specific rotateY animation finishes.
              onAnimationComplete={(definition) => {
                if (animState === 'spinning') {
                  setAnimState('done');
                }
              }}
              style={{ position: 'relative', zIndex: 1, willChange: 'transform' }}
            >
              <img
                src="/images/logo.png"
                alt="DataReaper logo"
                style={{
                  width: "104px",
                  height: "60px",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            </motion.div>
          </div>

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

        {/* Right: CTA */}
        <button
          onClick={() => navigate("/onboarding")}
          className="hidden md:block hand-drawn-button"
          data-reaper-expression="happy"
          data-reaper-zoom="1.35"
          data-reaper-phrases="Ready to cross over?||Click to initiate.||Let's get you inside.||Deploying onboarding sequence."
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
            <button
              onClick={() => navigate("/onboarding")}
              className="hand-drawn-button"
              data-reaper-expression="happy"
              data-reaper-zoom="1.35"
              data-reaper-phrases="Ready to cross over?||Click to initiate.||Let's get you inside.||Deploying onboarding sequence."
              style={{ fontSize: "16px", padding: "12px", width: "100%" }}
            >
              Initialize Screening
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}