import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

export default function ScrollIndicator({ className = "", label = "SCROLL" }) {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const translateY = useTransform(scrollYProgress, [0, 1], [-16, 80]);

  return (
    <div
      className={`pointer-events-none fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 text-[0.7rem] tracking-[0.4em] text-white/45 sm:flex ${className}`.trim()}
    >
      <span className="[writing-mode:vertical-rl]">{label}</span>
      <span className="relative h-24 w-px overflow-hidden rounded-full bg-white/10">
        <motion.span
          className="absolute inset-x-0 mx-auto h-10 w-[3px] rounded-full bg-cyan-300"
          style={{
            y: translateY,
            opacity: prefersReducedMotion ? 0.9 : undefined,
          }}
          animate={
            prefersReducedMotion ? undefined : { opacity: [0.3, 0.9, 0.3] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </span>
    </div>
  );
}
