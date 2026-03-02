'use client';

import { motion } from 'framer-motion';

interface FlowConnectorProps {
  /** SVG path data string */
  path: string;
  /** Stroke color (default: gold) */
  color?: string;
  /** Stroke width (default: 1) */
  strokeWidth?: number;
  /** Animation duration in seconds (default: 1.2) */
  duration?: number;
  /** Delay before animation starts (default: 0) */
  delay?: number;
  /** Whether to show a traveling dot (default: true) */
  showDot?: boolean;
  /** Dot radius (default: 3) */
  dotRadius?: number;
  /** Dot travel duration in seconds (default: 3) */
  dotDuration?: number;
  /** Whether the dot loops infinitely (default: false) */
  dotLoop?: boolean;
  /** SVG viewBox dimensions for proper scaling */
  viewBox?: string;
  className?: string;
}

/**
 * Reusable animated SVG path connector with optional traveling dot.
 * Used for data flow lines in AgentFlowDemo and orbit paths in ClosedLoopDiagram.
 */
export default function FlowConnector({
  path,
  color = 'rgba(196,167,125,0.3)',
  strokeWidth = 1,
  duration = 1.2,
  delay = 0,
  showDot = true,
  dotRadius = 3,
  dotDuration = 3,
  dotLoop = false,
  viewBox = '0 0 400 200',
  className = '',
}: FlowConnectorProps) {
  return (
    <svg viewBox={viewBox} className={`w-full h-auto pointer-events-none ${className}`}>
      {/* Path line with draw animation */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration, delay, ease: 'easeOut' }}
      />

      {/* Traveling dot */}
      {showDot && (
        <motion.circle
          r={dotRadius}
          fill="#C4A77D"
          style={{
            offsetPath: `path('${path}')`,
            filter: `drop-shadow(0 0 ${dotRadius}px rgba(196,167,125,0.6))`,
          }}
          initial={{ offsetDistance: '0%', opacity: 0 }}
          whileInView={{
            offsetDistance: '100%',
            opacity: [0, 1, 1, 0],
          }}
          viewport={{ once: true }}
          transition={{
            offsetDistance: {
              duration: dotDuration,
              delay: delay + duration * 0.5,
              ease: 'easeInOut',
              repeat: dotLoop ? Infinity : 0,
            },
            opacity: {
              duration: dotDuration,
              delay: delay + duration * 0.5,
              repeat: dotLoop ? Infinity : 0,
            },
          }}
        />
      )}
    </svg>
  );
}
