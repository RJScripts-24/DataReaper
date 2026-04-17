import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type PencilState = 'idle' | 'fast' | 'click';

interface Strike {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export function FloatingPencil() {
  const [pencilState, setPencilState] = useState<PencilState>('idle');
  const [strikes, setStrikes] = useState<Strike[]>([]);
  
  // Refs for animation loop to avoid dependency cycles
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const vel = useRef({ x: 0, y: 0 });
  const stateRef = useRef<PencilState>('idle');
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef(0);

  // Sync state to ref for animation loop
  useEffect(() => {
    stateRef.current = pencilState;
  }, [pencilState]);

  // Transform element directly to bypass React state overhead for 60fps
  const pencilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseDown = (e: MouseEvent) => {
      // Don't strike if clicking on interactive elements like buttons/links
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button')) return;

      if (clickTimer.current) clearTimeout(clickTimer.current);
      
      setPencilState('click');
      
      // Snap slightly closer to the mouse immediately
      pos.current = {
        x: pos.current.x + (mousePos.current.x - pos.current.x) * 0.5,
        y: pos.current.y + (mousePos.current.y - pos.current.y) * 0.5
      };

      // Add a strike mark at current mouse location
      const newStrike: Strike = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        angle: Math.random() * 40 - 20 // Random tilt for the stroke
      };
      
      setStrikes((prev) => [...prev, newStrike]);

      // Remove the strike after 800ms
      setTimeout(() => {
        setStrikes((current) => current.filter((s) => s.id !== newStrike.id));
      }, 800);

      // Reset to idle/fast after 300ms
      clickTimer.current = setTimeout(() => {
        setPencilState('idle');
      }, 300);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);

    let animationFrameId: number;

    const render = () => {
      timeRef.current += 0.05;

      const stiffness = 0.12;
      const damping = 0.75;
      
      // Target is mouse position + some roaming noise
      let targetX = mousePos.current.x;
      let targetY = mousePos.current.y;

      // Ensure the pencil tip points exactly at the cursor
      if (stateRef.current !== 'click') {
        targetX += 15; // Small visual offset so it doesn't totally hide the exact click spot
        targetY -= 15; 
      }

      // Physics calculating velocity and applying spring force
      const ax = (targetX - pos.current.x) * stiffness;
      const ay = (targetY - pos.current.y) * stiffness;

      vel.current.x = (vel.current.x + ax) * damping;
      vel.current.y = (vel.current.y + ay) * damping;

      pos.current.x += vel.current.x;
      pos.current.y += vel.current.y;

      // Calculate speed for state changes (if not clicking)
      const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
      
      if (stateRef.current !== 'click') {
        if (speed > 18 && stateRef.current !== 'fast') {
          setPencilState('fast');
        } else if (speed < 12 && stateRef.current !== 'idle') {
          setPencilState('idle');
        }
      }

      // Rotation based on velocity
      let rotation = vel.current.x * 0.3; 
      
      if (stateRef.current === 'click') {
        rotation = -15; // Lean into the strike slightly
      }

      if (pencilRef.current) {
        pencilRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) rotate(${rotation}deg)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      cancelAnimationFrame(animationFrameId);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        <AnimatePresence>
          {strikes.map(strike => (
            <motion.div
              key={strike.id}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                position: 'absolute',
                left: strike.x,
                top: strike.y,
                transform: `translate(-50%, -50%) rotate(${strike.angle}deg)`,
              }}
            >
              {/* 2 Charcoal Black Strokes */}
              <svg width="60" height="60" viewBox="0 0 60 60" style={{ overflow: 'visible', filter: 'url(#pencil-sketch-heavy)' }}>
                <path d="M15,10 Q20,30 10,50 M35,5 Q40,25 30,45" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" fill="none" />
              </svg>

            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div
        ref={pencilRef}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '120px',
          height: '140px',
          marginLeft: '-110px', 
          marginTop: '-125px', 
          pointerEvents: 'none',
          zIndex: 10000,
          filter: "drop-shadow(6px 12px 10px rgba(0,0,0,0.15))",
          transformOrigin: "90% 90%" 
        }}
      >
        <svg viewBox="0 0 120 140" width="100%" height="100%" filter="url(#pencil-sketch)">
          {/* Main Group tilted to map Top-Left to Bottom-Right */}
          <g transform="translate(15, 10)">
            {/* Pink Eraser (Top Left) */}
            <path d="M 12 28 C 5 20 15 5 28 12 L 35 18 C 30 25 20 35 12 28 Z" fill="#ff7f99" stroke="#333" strokeWidth="2" strokeLinejoin="round" />
            <path d="M 14 20 C 18 10 26 12 26 12" stroke="#ffb3c1" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Metal Ferrule */}
            <path d="M 28 12 L 42 24 L 32 36 L 18 24 Z" fill="#d4d8e0" stroke="#333" strokeWidth="2" strokeLinejoin="round" />
            <path d="M 23 18 L 37 30 M 26 15 L 40 27" stroke="#333" strokeWidth="2" />
            
            {/* The "Ear" jutting out the left side */}
            <path d="M 28 55 C 20 52 18 62 23 68 C 25 70 28 70 30 68" fill="#fbc387" stroke="#333" strokeWidth="2" />
            <path d="M 25 61 C 23 63 25 66 28 65" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />

            {/* Wood Body (Yellow Hex) */}
            <path d="M 42 24 L 85 75 C 80 82 72 90 65 95 L 22 44 Z" fill="#fcd73a" stroke="#333" strokeWidth="2" strokeLinejoin="round" />
            {/* Highlights and shades on body */}
            <path d="M 37 28 L 78 77 L 85 75 L 42 24 Z" fill="#fff" opacity="0.4" />
            <path d="M 22 44 L 65 95 L 72 90 L 28 38 Z" fill="#e0a300" opacity="0.4" />
            
            {/* Scalloped wood cut */}
            <path d="M 65 95 Q 70 85 75 88 Q 80 80 85 75 L 95 105 L 65 95 Z" fill="#f5d5aa" stroke="#333" strokeWidth="2" strokeLinejoin="round" />
            
            {/* Graphite Tip */}
            <path d="M 82 99 L 95 105 L 90 85 Z" fill="#2b2b2b" stroke="#333" strokeWidth="2" strokeLinejoin="round" />

            {/* Nose (overlapping right edge) */}
            <path d="M 70 55 C 78 52 80 62 72 65 C 68 66 65 62 65 58 C 65 55 68 56 70 55 Z" fill="#ff9999" stroke="#333" strokeWidth="2" />
            <path d="M 72 57 C 75 58 75 61 72 62" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />

            {/* Face Container */}
            <g transform="translate(48, 48) rotate(-40)">
              {/* Left Eye (Wide Open) */}
              <ellipse cx="-8" cy="-5" rx="7" ry="10" fill="#fff" stroke="#333" strokeWidth="2" />
              {pencilState === 'idle' && <circle cx="-5" cy="-5" r="3.5" fill="#2b2b2b" />}
              {pencilState === 'fast' && <circle cx="-5" cy="-8" r="2.5" fill="#2b2b2b" />}
              {pencilState === 'click' && <circle cx="-8" cy="-2" r="3" fill="#2b2b2b" />}
              <circle cx="-6" cy="-6" r="1" fill="#fff" />

              {/* Right Eye */}
              {pencilState === 'idle' && (
                <path d="M 12 -5 Q 16 -12 20 -5" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
              )}
              {pencilState === 'fast' && (
                <>
                  <ellipse cx="15" cy="-5" rx="7" ry="10" fill="#fff" stroke="#333" strokeWidth="2" />
                  <circle cx="15" cy="-8" r="2.5" fill="#2b2b2b" />
                </>
              )}
              {pencilState === 'click' && (
                <>
                  <ellipse cx="15" cy="-5" rx="7" ry="10" fill="#fff" stroke="#333" strokeWidth="2" />
                  <path d="M 8 -8 L 22 -3" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="15" cy="-2" r="3" fill="#2b2b2b" />
                </>
              )}

              {/* Eyebrows */}
              <path d="M -15 -17 Q -8 -22 -2 -16" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {pencilState !== 'idle' ? (
                <path d="M 8 -16 Q 16 -22 22 -17" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              ) : (
                <path d="M 10 -12 Q 15 -18 20 -10" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}

              {/* Mouth */}
              {pencilState === 'idle' && (
                <path d="M -5 10 C 2 18 12 18 16 9" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
              )}
              {pencilState === 'fast' && (
                <ellipse cx="5" cy="12" rx="4" ry="6" fill="#333" />
              )}
              {pencilState === 'click' && (
                <path d="M -4 12 Q 5 8 16 12" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}
            </g>
          </g>
        </svg>
      </div>
    </>
  );
}
