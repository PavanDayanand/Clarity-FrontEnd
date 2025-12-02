import { useEffect, useRef } from "react";

export default function SpotlightCursor() {
  const divRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!divRef.current) return;
      const x = e.clientX;
      const y = e.clientY;
      divRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(14, 165, 233, 0.15), transparent 80%)`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={divRef}
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background:
          "radial-gradient(600px circle at 50% 50%, rgba(14, 165, 233, 0.15), transparent 80%)",
      }}
    />
  );
}
