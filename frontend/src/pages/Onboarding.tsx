import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PressureText } from "../components/PressureText";
import { PressureInput } from "../components/PressureInput";
import { PressureFilter } from "../components/PressureFilter";
import { ApiClientError } from "../lib/apiClient";
import { useCreateScanMutation } from "../lib/hooks";
import { useScanContext } from "../lib/scanContext";
import { ReaperCursor } from "../components/ReaperCursor";

function detectSeedType(value: string): "email" | "phone" | null {
  const normalized = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;

  if (emailPattern.test(normalized)) {
    return "email";
  }
  if (phonePattern.test(normalized)) {
    return "phone";
  }
  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { setActiveScan } = useScanContext();
  const createScanMutation = useCreateScanMutation();
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleInitialize = async () => {
    const normalized = input.trim();
    if (!normalized || createScanMutation.isPending) {
      return;
    }

    const detectedSeedType = detectSeedType(normalized);
    if (!detectedSeedType) {
      setInputError("Enter a valid email address or phone number.");
      return;
    }

    setInputError(null);

    try {
      const response = await createScanMutation.mutateAsync({
        seed: {
          type: detectedSeedType,
          value: normalized,
        },
        jurisdictionHint: "AUTO",
      });

      setActiveScan(response.scanId);
      toast.success("Scan launched. Command Center is now live.");
      navigate(response.routeHints.commandCenter);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to launch scan. Please retry.";
      setInputError(message);
      toast.error(message);
    }
  };

  return (
    <div
      className="h-screen overflow-hidden relative w-full"
    >
      <PressureFilter />

      <main
        className="flex flex-col items-center h-full w-full relative z-10 p-8 md:p-16"
      >
        {/* Handwriting Welcome Message - Pushed to top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="text-center relative flex flex-col items-center mb-12"
        >
            <PressureText
              as="h2"
              variant="strong"
              className="paper-text"
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "clamp(3.5rem, 6vw, 5rem)",
                transform: "rotate(-1deg)",
                letterSpacing: "0.02em",
              }}
              data-reaper-expression="happy"
              data-reaper-phrases="Operative. I'll be your digital handler.||Everything you enter remains in the vault.||The scan is strictly confidential."
            >
              Welcome, Operative.
            </PressureText>
          <PressureText
            as="p"
            variant="lite"
            className="paper-text mt-4 text-2xl opacity-70"
            style={{
              fontFamily: "'Caveat', cursive",
              transform: "rotate(0.5deg)",
            }}
          >
            The digital trail starts now.
          </PressureText>
        </motion.div>

        {/* Illustrations are absolute, they don't affect flex flow */}
        <div
          className="absolute left-[2vw] top-[20vh] hidden lg:block"
          data-reaper-expression="thinking"
          data-reaper-phrases="Sleuth Agent waiting for orders.||Look at that cute little scythe.||Recon phase incoming.||He's already sniffing for your data trail."
        >
          <img
            src="/images/onboarding-sleuth-dome.png"
            alt="Sleuth Agent"
            style={{ width: "480px", filter: "url(#pencil-sketch) contrast(1.15) brightness(1.05)", mixBlendMode: "multiply" }}
          />
        </div>

        <div
          className="absolute right-[2vw] bottom-[15vh] hidden lg:block"
          data-reaper-expression="happy"
          data-reaper-phrases="The Security Shield. Nothing gets past us.||Your fortress in the digital wasteland.||Defense systems online.||Safe and sound under my watch."
        >
          <img
            src="/images/onboarding-shield-dome.png"
            alt="Security Shield"
            style={{ width: "450px", filter: "url(#pencil-sketch) contrast(1.15) brightness(1.05)", mixBlendMode: "multiply" }}
          />
        </div>

        {/* Centered Form Container */}
        <div className="flex-grow flex flex-col items-center justify-center w-full max-w-[640px] px-6 relative z-10">
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="hand-drawn-card p-10 relative overflow-hidden"
            >
              <div className="relative z-10">
                <PressureText as="h1" variant="strong" className="paper-text mb-4 leading-tight" style={{ fontFamily: "'Caveat', cursive", fontSize: "clamp(2.5rem, 5vw, 3.2rem)" }}>
                  Initialize Target Acquisition
                </PressureText>
                <PressureText as="p" variant="lite" className="paper-text mb-10 text-xl" style={{ fontFamily: "'Patrick Hand', cursive", opacity: 0.8 }}>
                  Enter a single data point to begin the autonomous identity scan.
                </PressureText>

                <div className="mb-8 relative group">
                  <PressureInput
                    type="text"
                    value={input}
                    onChange={(e: any) => {
                      setInput(e.target.value);
                      if (inputError) {
                        setInputError(null);
                      }
                    }}
                    onKeyDown={(e: any) => {
                      if (e.key === "Enter") handleInitialize();
                    }}
                    placeholder="Email or Phone Number"
                    className="w-full bg-transparent border-none pb-4 text-4xl outline-none paper-text"
                    style={{
                      fontFamily: "'Dancing Script', cursive",
                      borderBottom: "2px solid #2b2b2b",
                      filter: "url(#pencil-sketch)",
                      paddingLeft: "4px"
                    }}
                    data-reaper-expression="thinking"
                    data-reaper-phrases="Searching for digital rot...||Type carefully, Operative.||I'm ready to track this down.||Enter your target lead."
                  />
                  <div
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-[#a8a5f0] opacity-0 group-focus-within:opacity-100 transition-opacity"
                    style={{ transform: "translateY(1px)", filter: "url(#pencil-sketch-heavy)" }}
                  />
                </div>

                {inputError && (
                  <div
                    data-reaper-expression="sad"
                    data-reaper-phrases="Invalid input. My scythe missed the target.||That doesn't look like a real data trail.||Check your typing, Operative. I'm getting nothing."
                  >
                    <PressureText
                      as="p"
                      variant="lite"
                      className="paper-text mb-6 text-lg"
                      style={{ fontFamily: "'Patrick Hand', cursive", color: "#b94a48" }}
                    >
                      {inputError}
                    </PressureText>
                  </div>
                )}

                <motion.button
                  onClick={handleInitialize}
                  disabled={!input.trim() || createScanMutation.isPending}
                  whileHover={{ scale: input.trim() && !createScanMutation.isPending ? 1.02 : 1, rotate: -0.5 }}
                  whileTap={{ scale: input.trim() && !createScanMutation.isPending ? 0.98 : 1 }}
                  className="w-full py-5 hand-drawn-button text-2xl"
                  style={{ opacity: !input.trim() || createScanMutation.isPending ? 0.5 : 1 }}
                  data-reaper-expression="happy"
                  data-reaper-phrases="Initiate the hunt.||Release the Sleuth Agent!||Let's burn their data logs.||No mercy for brokers."
                >
                  <PressureText className="paper-text">
                    {createScanMutation.isPending ? "Launching Sleuth Agent..." : "Launch Sleuth Agent"}
                  </PressureText>
                </motion.button>
              </div>
            </motion.div>
        </div>
      </main>

      <div 
        className="absolute bottom-0 left-0 w-full pointer-events-none z-0 overflow-hidden" 
        style={{ height: "160px", pointerEvents: "auto" }}
        data-reaper-expression="default"
        data-reaper-phrases="The digital horizon. End of the trail.||Nothing but dust and deleted logs down here.||The wasteland is quiet today."
      >
        <svg
          viewBox="0 0 1440 160"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ filter: "url(#pencil-sketch)", opacity: 0.15 }}
        >
          {/* Main ground line */}
          <path
            d="M-20 120 Q 300 110 720 130 T 1460 115"
            stroke="#1a1a1a"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-20 125 Q 350 118 750 135 T 1460 120"
            stroke="#1a1a1a"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />

          {/* Abstract node towers */}
          <path d="M 200 120 L 200 80 L 230 80 L 230 125" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          <path d="M 210 120 L 210 95 L 220 95 L 220 120" stroke="#1a1a1a" strokeWidth="1" fill="none" opacity="0.5" />

          <path d="M 450 130 L 450 60 L 480 50 L 500 60 L 500 135" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          <circle cx="475" cy="75" r="3" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />

          <path d="M 900 125 L 900 40 L 980 40 L 980 128" stroke="#1a1a1a" strokeWidth="2.5" fill="none" />
          <path d="M 910 60 L 970 60 M 910 80 L 970 80 M 910 100 L 970 100" stroke="#1a1a1a" strokeWidth="1.5" fill="none" opacity="0.6" />

          <path d="M 1200 118 L 1200 70" stroke="#1a1a1a" strokeWidth="3" fill="none" />
          <path d="M 1180 50 Q 1200 70 1220 50" stroke="#1a1a1a" strokeWidth="2" fill="none" />

          {/* Faint connecting lines */}
          <path d="M 230 80 Q 340 50 450 60" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="5,5" fill="none" opacity="0.4" />
          <path d="M 500 70 Q 700 30 900 60" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="5,5" fill="none" opacity="0.4" />
        </svg>
      </div>

      <style>{`
        .hand-drawn-card {
          border: 2px solid #2b2b2b !important;
          border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
          background-color: #fdfbf7;
          box-shadow: 8px 8px 0px rgba(0,0,0,0.05) !important;
          filter: url(#pencil-texture);
          position: relative;
        }
        
        .hand-drawn-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: -1;
        }
        
        input::placeholder {
          font-family: 'Patrick Hand', cursive;
          opacity: 0.4;
          color: #2b2b2b;
        }

        .pencil-fill-dark {
          background: repeating-linear-gradient(
            45deg,
            #2b2b3d,
            #2b2b3d 2px,
            #252535 2px,
            #252535 4px
          ) !important;
          border-color: #3b3b4f !important;
        }
      `}</style>
      <ReaperCursor />
    </div>
  );

}