import { useEffect, useRef, useState, type RefObject } from "react";

const NODE_OFFSET = 32;

export function useTimelineAnimation(
  visible: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  ballRef: RefObject<HTMLDivElement | null>,
  stepCount: number,
  stepRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
): number {
  const [activeIndex, setActiveIndex] = useState(-1);
  const animStarted = useRef(false);

  useEffect(() => {
    if (!visible || animStarted.current) return;
    animStarted.current = true;

    const ball = ballRef.current;
    const container = containerRef.current;
    if (!ball || !container) return;

    const first = stepRefs.current[0];
    const last = stepRefs.current[stepCount - 1];
    if (!first || !last) return;

    const fy = first.offsetTop;
    const ly = last.offsetTop;
    const range = ly - fy;
    if (range <= 0) return;

    const startY = fy - 40;
    const endY = ly + 80;
    const totalRange = endY - startY;
    const duration = 5500;
    const startTime = performance.now();
    let rafId: number;
    let lastIdx = -1;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const y = startY + totalRange * eased;
      ball.style.top = `${y}px`;

      let idx = -1;
      for (let i = 0; i < stepCount; i++) {
        const el = stepRefs.current[i];
        if (el && y + 8 >= el.offsetTop + NODE_OFFSET) {
          idx = i;
        }
      }
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActiveIndex(idx);
      }

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [visible, ballRef, containerRef, stepCount, stepRefs]);

  return activeIndex;
}
