export const entryOverlayStyle = {
  background:
    "linear-gradient(128deg, rgba(46, 142, 255, 0.22) 0%, rgba(30, 82, 214, 0.18) 38%, rgba(12, 36, 108, 0.12) 68%, rgba(3, 10, 28, 0) 100%)",
  mixBlendMode: "screen",
};

export const exitOverlayStyle = {
  background:
    "linear-gradient(122deg, rgba(54, 173, 255, 0.28) 0%, rgba(30, 116, 235, 0.22) 46%, rgba(12, 45, 125, 0.16) 72%, rgba(3, 12, 34, 0) 100%)",
  mixBlendMode: "screen",
};

export const slideBlurVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: "blur(14px)",
  },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
      delay,
    },
  }),
};

export const slideBlurViewport = {
  once: true,
  amount: 0.55,
  margin: "-10% 0px",
};
