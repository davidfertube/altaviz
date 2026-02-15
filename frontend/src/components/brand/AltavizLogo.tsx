/**
 * Altaviz brand mark — a flame (energy) with a monitoring pulse through its center.
 * Communicates: natural gas + predictive monitoring in one symbol.
 *
 * Variants:
 *  - "color"  — beige flame, white pulse (standalone use on light bg)
 *  - "white"  — all white (for use on colored backgrounds)
 */
export default function AltavizLogo({
  size = 32,
  variant = 'color',
  className,
}: {
  size?: number;
  variant?: 'color' | 'white';
  className?: string;
}) {
  const gradientId = `altaviz-grad-${size}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Altaviz logo"
    >
      {variant === 'color' && (
        <defs>
          <linearGradient id={gradientId} x1="16" y1="30" x2="16" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A68B5B" />
            <stop offset="1" stopColor="#C4A77D" />
          </linearGradient>
        </defs>
      )}

      {/* Flame / energy drop */}
      <path
        d="M16 2C12.5 8.5 7 14 7 20C7 25.5 11 30 16 30C21 30 25 25.5 25 20C25 14 19.5 8.5 16 2Z"
        fill={variant === 'color' ? `url(#${gradientId})` : 'white'}
      />

      {/* Monitoring pulse */}
      <path
        d="M6 20L11 20L13.5 16L16 24L18.5 16L21 20L26 20"
        stroke={variant === 'color' ? 'white' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </svg>
  );
}
