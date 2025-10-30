import { motion } from "framer-motion";

export default function SubjectSticker({ className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mt-4 flex justify-end ${className}`}
      aria-hidden
    >
      <div className="relative h-32 w-32 sm:h-36 sm:w-36 md:h-44 md:w-44 -rotate-6">
        <motion.span
          aria-hidden
          animate={{ rotate: -6, y: [0, -1, 0] }}
          transition={{
            rotate: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute inset-0 rounded-full bg-cyan-500/12 blur-2xl"
        />
        <img
          src="/Subject.png"
          alt=""
          className="relative h-full w-full object-contain opacity-100"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}
