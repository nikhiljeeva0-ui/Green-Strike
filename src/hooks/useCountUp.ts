import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export function useCountUp(target: number, durationMs = 550): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number>(target);
  const prevTargetRef = useRef<number>(target);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    prevTargetRef.current = target;

    if (reduced || startVal === target) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // cubic-bezier(0.22, 1, 0.36, 1)-like easeOutQuint
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, reduced]);

  return value;
}
