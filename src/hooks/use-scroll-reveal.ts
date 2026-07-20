import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollReveal(rootMargin = "800px") {
  const [visible, setVisible] = useState(true);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (ioRef.current) {
        ioRef.current.disconnect();
        ioRef.current = null;
      }
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const margin = parseInt(rootMargin) || 400;
      const isNearViewport = rect.top < window.innerHeight + margin && rect.bottom > -margin;
      if (isNearViewport) {
        setVisible(true);
        return;
      }

      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        },
        { rootMargin },
      );
      io.observe(el);
      ioRef.current = io;
    },
    [rootMargin],
  );

  useEffect(() => {
    return () => {
      if (ioRef.current) {
        ioRef.current.disconnect();
      }
    };
  }, []);

  return { ref, visible };
}
