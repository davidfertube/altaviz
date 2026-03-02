'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useTypewriter(
  fullText: string,
  speed = 30,
  startDelay = 0,
  enabled = true
) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const reset = useCallback(() => {
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    lastTickRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reset();

    const timeout = setTimeout(() => {
      const tick = (now: number) => {
        if (!lastTickRef.current) lastTickRef.current = now;
        const elapsed = now - lastTickRef.current;

        if (elapsed >= speed) {
          lastTickRef.current = now;
          indexRef.current += 1;
          const next = fullText.slice(0, indexRef.current);
          setDisplayText(next);

          if (indexRef.current >= fullText.length) {
            setIsComplete(true);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fullText, speed, startDelay, enabled, reset]);

  return { displayText, isComplete, reset };
}
