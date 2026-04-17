import React, { useState, useRef, memo, InputHTMLAttributes, useEffect } from 'react';
import { PressureText } from './PressureText';

interface PressureInputProps extends InputHTMLAttributes<HTMLInputElement> {
  basePressure?: number;
  maxPressure?: number;
  variant?: 'strong' | 'medium' | 'lite';
}

export const PressureInput = memo(({
  className = "",
  basePressure = 0.6,
  maxPressure = 3.2,
  variant = 'strong',
  style,
  onKeyDown,
  onKeyUp,
  onChange,
  value,
  placeholder,
  ...props
}: PressureInputProps) => {
  const [pressure, setPressure] = useState(basePressure);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setPressure(maxPressure);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onKeyDown?.(e);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Return to base pressure smoothly
    timeoutRef.current = setTimeout(() => {
      setPressure(basePressure);
    }, 200);
    onKeyUp?.(e);
  };

  return (
    <div className="relative w-full group" style={style}>
      {/* Overlay styling the text accurately with SVG filters */}
      <PressureText 
        as="div" 
        variant={variant}
        basePressure={basePressure} 
        className={`absolute inset-0 w-full h-full pointer-events-none truncate flex items-baseline ${className}`}
        style={{
          color: value ? 'inherit' : 'rgba(0,0,0,0.4)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: "'Dancing Script', cursive",
          borderBottom: 'none',
          filter: 'none'
        }}
      >
        {value || placeholder || ''}
      </PressureText>

      {/* Real input captures events, renders caret, but has transparent text */}
      <input
        value={value}
        onChange={onChange}
        placeholder="" // Handled by the overlay
        className={`relative z-10 w-full h-full bg-transparent outline-none ${className}`}
        style={{
          color: 'transparent',
          caretColor: 'transparent', // Hidden caret as requested
          textShadow: 'none',
          fontFamily: "'Dancing Script', cursive",
          border: 'none',
          background: 'transparent',
          filter: 'none'
        } as React.CSSProperties}
        {...props}
      />
    </div>
  );
});

PressureInput.displayName = 'PressureInput';
