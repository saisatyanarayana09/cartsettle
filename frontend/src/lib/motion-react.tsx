import * as React from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

const MotionDiv = React.forwardRef<HTMLDivElement, any>(
  (
    {
      initial,
      animate,
      transition,
      style,
      children,
      drag,
      dragConstraints,
      dragElastic,
      onDragEnd,
      whileHover,
      whileTap,
      whileFocus,
      exit,
      variants,
      layout,
      onAnimationComplete,
      onTouchStart,
      onTouchEnd,
      ...props
    },
    ref,
  ) => {
    const [mounted, setMounted] = React.useState(initial === false);
    const touchStartX = React.useRef<number | null>(null);

    React.useEffect(() => {
      if (initial === false) {
        setMounted(true);
        return;
      }
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(raf);
    }, [initial]);

    const delaySec = transition?.delay ?? 0;
    const durationSec = transition?.duration ?? 0.36;
    const computedStyle: React.CSSProperties = {
      ...style,
    };

    if (initial && typeof initial === "object" && !mounted) {
      if (typeof initial.opacity === "number") computedStyle.opacity = initial.opacity;
      if (typeof initial.y === "number") computedStyle.transform = `translateY(${initial.y}px)`;
    } else if (animate && typeof animate === "object") {
      if (typeof animate.opacity === "number") computedStyle.opacity = animate.opacity;
      if (typeof animate.y === "number") computedStyle.transform = `translateY(${animate.y}px)`;
      if (initial !== false && durationSec > 0) {
        computedStyle.transition = `transform ${durationSec}s cubic-bezier(0.22, 1, 0.36, 1) ${delaySec}s, opacity ${durationSec}s ease ${delaySec}s`;
      }
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (drag && e.touches[0]) {
        touchStartX.current = e.touches[0].clientX;
      }
      onTouchStart?.(e);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      if (drag && touchStartX.current !== null && onDragEnd && e.changedTouches[0]) {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        onDragEnd(e, { offset: { x: deltaX, y: 0 } });
      }
      touchStartX.current = null;
      onTouchEnd?.(e);
    };

    return (
      <div
        ref={ref}
        style={computedStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MotionDiv.displayName = "MotionDiv";

export const motion = {
  div: MotionDiv,
};

export const AnimatePresence = ({ children }: any) => <>{children}</>;

