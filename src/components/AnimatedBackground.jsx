import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

const baseGradient =
  "radial-gradient(120% 140% at 18% 12%, rgba(42, 88, 188, 0.22), rgba(8, 10, 16, 0.94) 62%), linear-gradient(140deg, #05070d 0%, #080f1d 45%, #05070d 100%)";

const bubblePresets = {
  default: [
    {
      top: "-18rem",
      left: "-22rem",
      size: "40rem",
      color: "rgba(66, 128, 255, 0.18)",
    },
    {
      bottom: "-24rem",
      right: "-20rem",
      size: "36rem",
      color: "rgba(28, 82, 214, 0.16)",
    },
    {
      top: "42%",
      right: "-12rem",
      size: "26rem",
      color: "rgba(40, 120, 255, 0.12)",
    },
  ],
  predict: [
    {
      top: "-20rem",
      left: "-24rem",
      size: "42rem",
      color: "rgba(70, 140, 255, 0.2)",
    },
    {
      bottom: "-26rem",
      right: "-22rem",
      size: "38rem",
      color: "rgba(32, 104, 220, 0.16)",
    },
    {
      top: "38%",
      right: "-14rem",
      size: "24rem",
      color: "rgba(60, 150, 255, 0.14)",
    },
  ],
  gradcam: [
    {
      top: "-18rem",
      left: "-20rem",
      size: "38rem",
      color: "rgba(98, 156, 255, 0.19)",
    },
    {
      bottom: "-24rem",
      right: "-18rem",
      size: "32rem",
      color: "rgba(46, 112, 228, 0.15)",
    },
    {
      top: "48%",
      right: "-10rem",
      size: "24rem",
      color: "rgba(122, 191, 255, 0.12)",
    },
  ],
  report: [
    {
      top: "-18rem",
      left: "-22rem",
      size: "38rem",
      color: "rgba(76, 164, 255, 0.18)",
    },
    {
      bottom: "-22rem",
      right: "-20rem",
      size: "34rem",
      color: "rgba(44, 118, 224, 0.15)",
    },
    {
      top: "44%",
      right: "-12rem",
      size: "26rem",
      color: "rgba(86, 174, 255, 0.12)",
    },
  ],
};

export default function AnimatedBackground({ tone = "default" }) {
  const reduceMotion = useReducedMotion();
  const bubbles = bubblePresets[tone] ?? bubblePresets.default;
  const { scrollYProgress } = useScroll();
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : ["0%", "-6%"]
  );
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : ["0%", "8%"]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ x, y, background: baseGradient }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {bubbles.map((bubble, index) => (
        <motion.div
          // eslint-disable-next-line react/no-array-index-key
          key={`${tone}-bubble-${index}`}
          className="absolute rounded-full blur-[140px]"
          style={{
            top: bubble.top,
            left: bubble.left,
            right: bubble.right,
            bottom: bubble.bottom,
            width: bubble.size,
            height: bubble.size,
            background: `radial-gradient(circle, ${bubble.color}, transparent 68%)`,
            mixBlendMode: "screen",
          }}
          initial={{ opacity: 0.28 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  opacity: [0.28, 0.44, 0.3],
                  x: [0, 18, -12, 0],
                  y: [0, -14, 10, 0],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 24 + index * 3,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
