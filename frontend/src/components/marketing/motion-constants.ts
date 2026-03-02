/* Shared animation constants for marketing pages */

// Easing curves
export const EASE_STANDARD = [0.25, 0.46, 0.45, 0.94] as const;
export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const;

// Stagger timings
export const STAGGER_FAST = 0.06;
export const STAGGER_MEDIUM = 0.1;
export const STAGGER_SLOW = 0.4;

// Color palette for dark mockup backgrounds
export const MOCKUP_COLORS = {
  bg: '#0C1018',
  bgCard: 'rgba(255,255,255,0.02)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderCard: 'rgba(255,255,255,0.04)',
  gold: '#C4A77D',
  emerald: '#10B981',
  rose: '#EF4444',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  blue: '#3B82F6',
} as const;

// Reusable animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_STANDARD },
  },
};

export const staggerContainer = (stagger = STAGGER_MEDIUM, delay = 0.1) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const springPop = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
};
