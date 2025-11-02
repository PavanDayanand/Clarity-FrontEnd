const BACKDROP_VARIANTS = {
  hero: {
    outerClass: "opacity-100",
    topGradient: "bg-linear-to-br from-[#040713] via-[#07152a] to-[#03060d]",
    bottomGradient:
      "bg-[radial-gradient(circle_at_center,rgba(10,19,42,0.65),transparent_62%)]",
    leftGlow: {
      className:
        "absolute top-16 -left-28 rounded-full bg-[radial-gradient(circle,rgba(58,121,255,0.28),transparent_70%)] blur-3xl opacity-90",
      style: { width: "20rem", height: "20rem" },
    },
    rightGlow: {
      className:
        "absolute -right-32 bottom-20 rounded-full bg-[radial-gradient(circle,rgba(19,208,255,0.22),transparent_70%)] blur-3xl opacity-90",
      style: { width: "24rem", height: "24rem" },
    },
    extras: [
      {
        className:
          "absolute inset-x-16 top-1/3 h-px bg-linear-to-r from-transparent via-white/10 to-transparent",
      },
      {
        className:
          "absolute inset-x-20 bottom-1/4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent",
      },
      {
        className:
          "absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent",
      },
    ],
  },
  predict: {
    outerClass: "opacity-90",
    topGradient:
      "bg-[radial-gradient(circle_at_top,rgba(21,92,255,0.45),rgba(3,10,28,0.98))]",
    bottomGradient:
      "bg-[radial-gradient(circle_at_bottom,rgba(2,8,22,0.95),#020713)]",
    leftGlow: {
      className:
        "absolute -top-40 -left-24 rounded-full bg-linear-to-br from-[#1b3bff]/70 via-[#4a6bff]/60 to-transparent blur-3xl opacity-70",
      style: { width: "30rem", height: "30rem" },
    },
    rightGlow: {
      className:
        "absolute bottom-0 -right-48 rounded-full bg-linear-to-tl from-[#041e5e]/80 via-[#1c2d73]/65 to-transparent blur-3xl opacity-90",
      style: { width: "42rem", height: "42rem" },
    },
  },
  gradcam: {
    outerClass: "opacity-90",
    topGradient:
      "bg-[radial-gradient(circle_at_top,rgba(132,54,255,0.45),rgba(3,10,28,0.98))]",
    bottomGradient:
      "bg-[radial-gradient(circle_at_bottom,rgba(8,22,47,0.95),#020713)]",
    leftGlow: {
      className:
        "absolute -top-40 -left-28 rounded-full bg-linear-to-br from-[#321d8f]/70 via-[#5c3ad7]/60 to-transparent blur-3xl opacity-70",
      style: { width: "30rem", height: "30rem" },
    },
    rightGlow: {
      className:
        "absolute bottom-0 -right-48 rounded-full bg-linear-to-tl from-[#0b1a4a]/80 via-[#1e2d6d]/65 to-transparent blur-3xl opacity-90",
      style: { width: "42rem", height: "42rem" },
    },
  },
  report: {
    outerClass: "opacity-90",
    topGradient:
      "bg-[radial-gradient(circle_at_top,rgba(21,92,255,0.45),rgba(3,10,28,0.98))]",
    bottomGradient:
      "bg-[radial-gradient(circle_at_bottom,rgba(2,8,22,0.95),#020713)]",
    leftGlow: {
      className:
        "absolute -top-40 -left-32 rounded-full bg-linear-to-br from-[#1b3bff]/70 via-[#4a6bff]/60 to-transparent blur-3xl opacity-80",
      style: { width: "34rem", height: "34rem" },
    },
    rightGlow: {
      className:
        "absolute bottom-0 -right-44 rounded-full bg-linear-to-tl from-[#041e5e]/80 via-[#1c2d73]/65 to-transparent blur-3xl opacity-90",
      style: { width: "44rem", height: "44rem" },
    },
  },
};

function PageBackdrop({ variant = "predict", className = "" }) {
  const config = BACKDROP_VARIANTS[variant] ?? BACKDROP_VARIANTS.predict;
  const outerClasses = [
    "pointer-events-none absolute inset-0",
    config.outerClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={outerClasses}>
      <div className={`absolute inset-0 ${config.topGradient}`} />
      <div className={`absolute inset-0 ${config.bottomGradient}`} />
      <div
        className={config.leftGlow.className}
        style={config.leftGlow.style}
      />
      <div
        className={config.rightGlow.className}
        style={config.rightGlow.style}
      />
      {(config.extras ?? []).map((extra, index) => (
        <div
          key={`page-backdrop-extra-${variant}-${index}`}
          className={extra.className}
          style={extra.style}
        />
      ))}
    </div>
  );
}

export default PageBackdrop;
