import { useEffect, useRef, useState } from "react";

const isFinePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(pointer: fine)").matches;

const TRAIL_LERP_FACTOR = 0.2;
const MIN_DISTANCE = 0.5;

export default function CustomCursor() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [trailPosition, setTrailPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [supported, setSupported] = useState(false);
  const targetRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isFinePointer()) {
      return;
    }

    setSupported(true);
    document.body.classList.add("custom-cursor-hidden");
    document.documentElement.classList.add("custom-cursor-hidden");

    const handleMove = (event) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      setCursorPosition(targetRef.current);
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        setTrailPosition(targetRef.current);
      }
      setVisible(true);
    };

    const handleEnter = () => setVisible(true);
    const handleLeave = () => {
      setVisible(false);
      hasMovedRef.current = false;
    };
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseenter", handleEnter);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);

    return () => {
      document.body.classList.remove("custom-cursor-hidden");
      document.documentElement.classList.remove("custom-cursor-hidden");
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseenter", handleEnter);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!supported) {
      return undefined;
    }

    const animate = () => {
      setTrailPosition((previous) => {
        const dx = targetRef.current.x - previous.x;
        const dy = targetRef.current.y - previous.y;
        const distance = Math.hypot(dx, dy);

        if (distance < MIN_DISTANCE) {
          return targetRef.current;
        }

        return {
          x: previous.x + dx * TRAIL_LERP_FACTOR,
          y: previous.y + dy * TRAIL_LERP_FACTOR,
        };
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [supported]);

  if (!supported || !visible) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed"
        style={{
          transform: `translate3d(${cursorPosition.x}px, ${cursorPosition.y}px, 0)`,
          zIndex: 9999,
        }}
      >
        <span
          className="block -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#dbeafe",
            boxShadow: "0 0 10px rgba(191,219,254,0.75)",
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed flex items-center justify-center"
        style={{
          transform: `translate3d(${trailPosition.x}px, ${trailPosition.y}px, 0)`,
          zIndex: 9998,
        }}
      >
        <span
          className="relative -translate-x-1/2 -translate-y-1/2"
          style={{
            width: pressed ? 34 : 38,
            height: pressed ? 34 : 38,
            borderRadius: "50%",
            border: "1.6px solid rgba(96,165,250,0.45)",
            backgroundColor: "transparent",
            transition:
              "transform 0.18s ease, width 0.18s ease, height 0.18s ease",
            filter: "blur(0.2px)",
          }}
        >
          <span
            className="absolute left-1/2 top-1/2"
            style={{
              width: pressed ? 10 : 12,
              height: pressed ? 10 : 12,
              borderRadius: "50%",
              backgroundColor: "#3ba4ff",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 12px rgba(59,164,255,0.6)",
              transition: "width 0.18s ease, height 0.18s ease",
            }}
          />
        </span>
      </div>
    </>
  );
}
