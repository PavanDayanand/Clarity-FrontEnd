function BackgroundGrid({ className = "", cellSize = 120, opacity = 0.12 }) {
  const lineColor = `rgba(148, 163, 184, ${opacity})`;
  const size = typeof cellSize === "number" ? `${cellSize}px` : cellSize;
  const classes = ["pointer-events-none absolute inset-0", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-hidden
      className={classes}
      style={{
        backgroundImage: `
          linear-gradient(to right, ${lineColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)
        `,
        backgroundSize: `${size} ${size}, ${size} ${size}`,
        backgroundPosition: "center",
        mixBlendMode: "lighten",
      }}
    />
  );
}

export default BackgroundGrid;
