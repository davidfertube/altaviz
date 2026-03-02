'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'framer-motion';

export function useAutoTabs(tabCount: number, intervalMs = 8000) {
  const [activeTab, setActiveTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: '-100px' });
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress animation loop
  useEffect(() => {
    if (isPaused || !isInView) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    setProgress(0);

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / intervalMs, 1);
      setProgress(pct);

      if (pct >= 1) {
        setActiveTab((prev) => (prev + 1) % tabCount);
        startTimeRef.current = Date.now();
        setProgress(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused, isInView, tabCount, intervalMs, activeTab]);

  const selectTab = useCallback(
    (index: number) => {
      setActiveTab(index);
      setIsPaused(true);
      setProgress(0);

      // Resume auto-cycling after 15 seconds of no interaction
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => setIsPaused(false), 15000);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  return { activeTab, selectTab, progress, isPaused, containerRef };
}
