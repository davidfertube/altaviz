'use client';

import { motion } from 'framer-motion';
import { EASE_STANDARD, STAGGER_MEDIUM } from './motion-constants';

/* ------------------------------------------------------------------ */
/*  Integration data                                                    */
/* ------------------------------------------------------------------ */
const INTEGRATIONS = [
  { name: 'OSIsoft PI', category: 'Historian' },
  { name: 'Honeywell Experion', category: 'SCADA' },
  { name: 'Detechtion IIoT', category: 'Asset Monitoring' },
  { name: 'Ariel SmartLink', category: 'Equipment OEM' },
  { name: 'Emerson DeltaV', category: 'SCADA' },
  { name: 'AVEVA', category: 'Historian' },
  { name: 'Azure IoT Hub', category: 'Cloud' },
  { name: 'OPC-UA', category: 'Protocol' },
];

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
const CX = 300;
const CY = 250;
const RADIUS = 180;
const NODE_COUNT = INTEGRATIONS.length;

/** Return the (x, y) for a node at index i on the circle.
 *  Start from -90 deg (top) so first node is at 12 o'clock. */
function nodePos(i: number): { x: number; y: number } {
  const angle = ((2 * Math.PI) / NODE_COUNT) * i - Math.PI / 2;
  return {
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle),
  };
}

/* ------------------------------------------------------------------ */
/*  Category color mapping                                              */
/* ------------------------------------------------------------------ */
function categoryColor(cat: string): string {
  switch (cat) {
    case 'Historian':
      return '#3B82F6';
    case 'SCADA':
      return '#8B5CF6';
    case 'Asset Monitoring':
      return '#10B981';
    case 'Equipment OEM':
      return '#F59E0B';
    case 'Cloud':
      return '#06B6D4';
    case 'Protocol':
      return '#EF4444';
    default:
      return '#F5C518';
  }
}

/* ------------------------------------------------------------------ */
/*  Desktop: Hub-and-Spoke SVG                                          */
/* ------------------------------------------------------------------ */
function DesktopDiagram() {
  return (
    <div className="hidden lg:block relative w-full max-w-[680px] mx-auto">
      <svg viewBox="0 0 600 500" className="w-full h-auto">
        {/* ----- Center hub glow pulse ----- */}
        <motion.circle
          cx={CX}
          cy={CY}
          r="52"
          fill="none"
          stroke="#F5C518"
          strokeWidth="1"
          opacity={0.15}
          animate={{ r: [52, 60, 52], opacity: [0.15, 0.06, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx={CX}
          cy={CY}
          r="46"
          fill="none"
          stroke="#F5C518"
          strokeWidth="0.5"
          opacity={0.08}
          animate={{ r: [46, 52, 46], opacity: [0.08, 0.03, 0.08] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* ----- Spoke lines + traveling dots ----- */}
        {INTEGRATIONS.map((integration, i) => {
          const { x, y } = nodePos(i);
          const lineDelay = 0.4 + i * 0.08;
          return (
            <g key={`spoke-${integration.name}`}>
              {/* Spoke line */}
              <motion.line
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="#F5C518"
                strokeWidth="1"
                strokeOpacity={0.15}
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: lineDelay, ease: 'easeOut' }}
              />

              {/* Traveling dot along the spoke */}
              <motion.circle
                r="2.5"
                fill="#F5C518"
                style={{
                  filter: 'drop-shadow(0 0 3px rgba(245,197,24,0.6))',
                }}
                initial={{ cx: CX, cy: CY, opacity: 0 }}
                whileInView={{
                  cx: [CX, x, CX],
                  cy: [CY, y, CY],
                  opacity: [0, 0.9, 0.9, 0.9, 0],
                }}
                viewport={{ once: true }}
                transition={{
                  duration: 4,
                  delay: lineDelay + 0.8,
                  repeat: Infinity,
                  repeatDelay: 2 + i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            </g>
          );
        })}

        {/* ----- Center hub ----- */}
        <motion.g
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE_STANDARD }}
        >
          {/* Outer ring */}
          <circle
            cx={CX}
            cy={CY}
            r="42"
            fill="#FAFAFA"
            stroke="#F5C518"
            strokeWidth="2"
          />
          {/* Inner fill */}
          <circle
            cx={CX}
            cy={CY}
            r="38"
            fill="white"
            stroke="#E5E5E5"
            strokeWidth="1"
          />
          {/* Hub text */}
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[13px] font-bold"
            fill="#0A0A0A"
          >
            Altaviz
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[7px] font-medium uppercase tracking-wider"
            fill="#F5C518"
          >
            Data Hub
          </text>
        </motion.g>

        {/* ----- Integration nodes ----- */}
        {INTEGRATIONS.map((integration, i) => {
          const { x, y } = nodePos(i);
          const catColor = categoryColor(integration.category);
          return (
            <motion.g
              key={`node-${integration.name}`}
              initial={{ opacity: 0, scale: 0.3 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.6 + i * STAGGER_MEDIUM,
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
            >
              {/* Card background */}
              <rect
                x={x - 52}
                y={y - 22}
                width="104"
                height="44"
                rx="10"
                fill="white"
                stroke="#E5E5E5"
                strokeWidth="1"
              />
              {/* Category color accent (top edge) */}
              <rect
                x={x - 52}
                y={y - 22}
                width="104"
                height="2.5"
                rx="1.25"
                fill={catColor}
                opacity="0.5"
              />
              {/* Category dot */}
              <circle
                cx={x - 36}
                cy={y - 3}
                r="3"
                fill={catColor}
                opacity="0.35"
              />
              {/* Integration name */}
              <text
                x={x - 28}
                y={y - 3}
                dominantBaseline="central"
                className="text-[9px] font-semibold"
                fill="#0A0A0A"
              >
                {integration.name}
              </text>
              {/* Category label */}
              <text
                x={x - 28}
                y={y + 11}
                dominantBaseline="central"
                className="text-[7px]"
                fill="#9CA3AF"
              >
                {integration.category}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile: Vertical list with connecting flow                          */
/* ------------------------------------------------------------------ */
function MobileList() {
  return (
    <div className="lg:hidden flex flex-col items-center gap-0">
      {/* Integration items flowing down */}
      <motion.div
        className="w-full max-w-sm space-y-0"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.07, delayChildren: 0.15 },
          },
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {INTEGRATIONS.map((integration, i) => {
          const catColor = categoryColor(integration.category);
          return (
            <div key={integration.name} className="flex flex-col items-center">
              {/* Connecting line (except before first item) */}
              {i > 0 && (
                <motion.div
                  className="w-px h-6 bg-gradient-to-b from-[#F5C518]/20 to-[#F5C518]/10"
                  variants={{
                    hidden: { scaleY: 0 },
                    visible: {
                      scaleY: 1,
                      transition: { duration: 0.3, ease: EASE_STANDARD },
                    },
                  }}
                  style={{ transformOrigin: 'top' }}
                />
              )}

              {/* Integration card */}
              <motion.div
                className="flex items-center gap-3 rounded-xl bg-white border border-[#E5E5E5] px-5 py-3 w-full hover:border-[#F5C518]/40 hover:shadow-sm transition-colors"
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4, ease: EASE_STANDARD },
                  },
                }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: catColor, opacity: 0.4 }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {integration.name}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">
                    {integration.category}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* Connecting line to hub */}
        <motion.div
          className="flex flex-col items-center"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { duration: 0.4, ease: EASE_STANDARD },
            },
          }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-[#F5C518]/20 to-[#F5C518]/40" />

          {/* Traveling dot animation on mobile */}
          <motion.div
            className="w-2 h-2 rounded-full bg-[#F5C518] shadow-[0_0_6px_rgba(245,197,24,0.5)]"
            animate={{ y: [-4, 4, -4], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="w-px h-4 bg-gradient-to-b from-[#F5C518]/40 to-[#F5C518]/20" />
        </motion.div>

        {/* Central hub node */}
        <motion.div
          className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-white border-2 border-[#F5C518] shadow-[0_0_20px_rgba(245,197,24,0.15)]"
          variants={{
            hidden: { opacity: 0, scale: 0.5 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { type: 'spring', stiffness: 260, damping: 20 },
            },
          }}
        >
          <span className="text-sm font-bold text-[#0A0A0A]">Altaviz</span>
          <span className="text-[9px] font-medium text-[#F5C518] uppercase tracking-wider">
            Data Hub
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Integrations Section                                                */
/* ================================================================== */
export default function Integrations() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">
            Integrations
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">
            Connects to the systems you already run
          </h2>
          <p className="text-base text-[#6B7280] max-w-xl mx-auto">
            No rip-and-replace. Altaviz ingests data from standard SCADA
            systems, historians, and cloud platforms.
          </p>
        </motion.div>

        {/* Desktop: Hub-and-spoke SVG diagram */}
        <DesktopDiagram />

        {/* Mobile: Vertical list with flow lines */}
        <MobileList />
      </div>
    </section>
  );
}
