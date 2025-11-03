import { Fragment, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";

import AnimatedBackground from "../components/AnimatedBackground.jsx";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import PageBackdrop from "../components/ui/PageBackdrop.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import useScrollToTop from "../hooks/useScrollToTop.js";
import { MODEL_LIST } from "../utils/modelUtils.js";

import {
  datasetMeta,
  datasetDescription,
  diseaseDistribution,
  viewDistribution,
  genderDistribution,
  averageMetrics,
  classMetrics,
} from "../data/datasetOverview.js";

const MODEL_FILTERS = [
  {
    key: "both",
    label: "Both",
    subtitle: "Compare DenseNet121 & ResNet152",
  },
  {
    key: "densenet121",
    label: "DenseNet121",
    subtitle: "Dense connectivity baseline",
  },
  {
    key: "resnet152",
    label: "ResNet152",
    subtitle: "Residual depth focus",
  },
];

const MODEL_THEMES = {
  both: {
    gradient:
      "bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.4),rgba(15,23,42,0.1)70%)]",
    border: "border-sky-400/30",
    dot: "bg-sky-300",
    accent: "text-sky-200",
  },
  densenet121: {
    gradient:
      "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.4),rgba(15,23,42,0.1)70%)]",
    border: "border-cyan-300/40",
    dot: "bg-cyan-300",
    accent: "text-cyan-200",
  },
  resnet152: {
    gradient:
      "bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.4),rgba(15,23,42,0.1)70%)]",
    border: "border-indigo-300/40",
    dot: "bg-indigo-300",
    accent: "text-indigo-200",
  },
};

const METRIC_KEYS = ["accuracy", "auc", "f1", "precision", "recall"];
const METRIC_LABELS = {
  accuracy: "Accuracy",
  auc: "AUC",
  f1: "F1",
  precision: "Precision",
  recall: "Recall",
};

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value) => numberFormatter.format(value);
const formatPercent = (value) => percentFormatter.format(value);

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const AnimatedNumber = ({
  value = 0,
  formatter = formatNumber,
  duration = 1200,
  easing = easeOutCubic,
  as: Component = "span",
  className,
}) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isNumeric = Number.isFinite(numericValue);
  const [displayValue, setDisplayValue] = useState(() =>
    isNumeric ? 0 : value
  );

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(value);
      return;
    }

    let frameId;
    let start;
    const target = numericValue;

    const animate = (timestamp) => {
      if (start === undefined) start = timestamp;
      const elapsed = timestamp - start;
      const progress = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);
      const eased = easing(progress);
      const nextValue = progress >= 1 ? target : target * eased;
      const roundedValue = Number.isInteger(target)
        ? Math.round(nextValue)
        : nextValue;
      setDisplayValue(roundedValue);
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    setDisplayValue(0);
    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [duration, easing, isNumeric, numericValue, value]);

  const content = isNumeric ? formatter(displayValue) : displayValue;

  if (Component === Fragment) {
    return <>{content}</>;
  }

  return <Component className={className}>{content}</Component>;
};

const clamp01 = (value) => Math.min(1, Math.max(0, value ?? 0));

const normalizeShares = (shares) => {
  if (!Array.isArray(shares) || shares.length === 0) {
    return [];
  }

  const safeValues = shares.map((value) => {
    const numeric = Number.isFinite(value) ? value : Number(value);
    return numeric > 0 ? numeric : 0;
  });

  const sum = safeValues.reduce((acc, value) => acc + value, 0);

  if (sum <= 0) {
    return safeValues.map(() => 0);
  }

  const normalized = safeValues.map((value) => clamp01(value / sum));
  const total = normalized.reduce((acc, value) => acc + value, 0);
  const remainder = 1 - total;

  if (normalized.length > 0 && Math.abs(remainder) > 1e-6) {
    const lastIndex = normalized.length - 1;
    normalized[lastIndex] = clamp01(normalized[lastIndex] + remainder);
  }

  return normalized;
};

const polarToCartesian = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

const hexToRgba = (hex, alpha) => {
  const fallback = "0ea5e9";
  const sanitized = typeof hex === "string" ? hex.replace("#", "").trim() : "";
  let normalized = sanitized;

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    normalized = fallback;
  }

  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DataPage = () => {
  useScrollToTop();

  const [activeModel, setActiveModel] = useState("both");
  const [activeMetric, setActiveMetric] = useState("f1");

  const modelKeys = useMemo(() => {
    if (activeModel === "both") {
      return ["densenet121", "resnet152"];
    }
    return [activeModel];
  }, [activeModel]);

  const radarSeries = useMemo(
    () =>
      modelKeys.map((key, index) => {
        const fallbackColor = BAR_COLORS[index % BAR_COLORS.length];
        return {
          key,
          label: MODEL_LIST.find((model) => model.id === key)?.label ?? key,
          metrics: averageMetrics[key],
          color: MODEL_COLORS[key] ?? fallbackColor,
        };
      }),
    [modelKeys]
  );

  return (
    <Motion.div
      className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <ScrollIndicator className="right-3 sm:right-5 md:right-7 lg:right-12" />
      <AnimatedBackground />
      <PageBackdrop />
      <BackgroundGrid className="opacity-50" opacity={0.06} />
      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-24 pt-10 sm:px-8">
        <header className="px-6 pt-8 sm:px-10">
          <PrimaryNav />
        </header>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pt-10 sm:px-10 lg:px-12">
            <div className="relative text-center">
              <Motion.h1
                initial={{ opacity: 0, y: 32, filter: "blur(18px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
                style={{ willChange: "transform, filter" }}
                className="mx-auto max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-6xl md:text-7xl"
              >
                <span className="gradient-flow-text block text-transparent bg-clip-text bg-[linear-gradient(120deg,#040b1a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                  Dataset Overview
                </span>
              </Motion.h1>
              <Motion.p
                initial={{ opacity: 0, y: 24, filter: "blur(16px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                style={{ willChange: "transform, filter" }}
                className="mx-auto mt-6 max-w-2xl text-lg italic text-white/70 sm:text-xl"
              >
                Explore the NIH ChestX-ray14 dataset and model performance
                metrics
              </Motion.p>
            </div>

            <DatasetIntro />
            <DatasetBreakdown />
            <ModelSelector
              activeModel={activeModel}
              onChange={setActiveModel}
            />
            <MetricsSection
              activeMetric={activeMetric}
              onMetricChange={setActiveMetric}
              modelKeys={modelKeys}
              radarSeries={radarSeries}
            />
          </div>
        </main>
      </div>

      <Footer />
    </Motion.div>
  );
};

const DatasetIntro = () => {
  return (
    <Motion.section
      className="grid gap-8 lg:grid-cols-[3fr,2fr]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl lg:text-5xl">
          {datasetMeta.name}: context for model governance
        </h1>
        <div className="space-y-4 text-base text-slate-300">
          {datasetDescription.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={datasetMeta.datasetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-400 hover:text-sky-100"
          >
            View dataset
          </a>
          <a
            href={datasetMeta.paperLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600"
          >
            Read about paper
          </a>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-6 shadow-[0_24px_90px_-55px_rgba(15,23,42,0.7)]">
        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-20" />
        <div className="relative flex flex-col gap-4">
          <HighlightStat
            label="Images curated"
            badge="Dataset"
            value={
              <AnimatedNumber
                value={datasetMeta.totalImages}
                formatter={formatNumber}
              />
            }
            hint={
              <>
                <AnimatedNumber
                  value={datasetMeta.uniquePatients}
                  formatter={formatNumber}
                />{" "}
                patients
              </>
            }
          />
          <HighlightStat
            label="Multi-label cases"
            badge="Cadence"
            value={
              <AnimatedNumber
                value={datasetMeta.multiLabelCases}
                formatter={formatNumber}
              />
            }
            hint={
              <>
                <AnimatedNumber
                  value={datasetMeta.multiLabelShare}
                  formatter={formatPercent}
                />{" "}
                of studies
              </>
            }
          />
          <HighlightStat
            label="Findings tracked"
            badge="Coverage"
            value={
              <AnimatedNumber
                value={datasetMeta.findingsTracked}
                formatter={formatNumber}
              />
            }
            hint="Thoracic labels monitored"
          />
        </div>
      </div>
    </Motion.section>
  );
};

const HighlightStat = ({ label, value, hint, badge }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-5 py-6 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 opacity-15" />
      <div className="relative flex items-center justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.36em] text-white/60">
          {label}
        </p>
        {badge ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="relative mt-5 flex items-center justify-start gap-4">
        <p className="text-4xl font-semibold tracking-tight text-slate-50">
          {value}
        </p>
      </div>
      <p className="relative mt-3 text-sm text-slate-300">{hint}</p>
    </div>
  );
};

const DatasetBreakdown = () => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const shareValue = clamp01(datasetMeta.multiLabelShare);
  const multiLabelCases = datasetMeta.multiLabelCases ?? 0;
  const datasetName = datasetMeta.name ?? "ChestX-ray14";

  const enhancedDistribution = useMemo(() => {
    const total = diseaseDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const safeTotal = total || 1;
    let runningTotal = 0;
    return diseaseDistribution.map((item) => {
      runningTotal += item.count;
      const share = item.percent ?? item.count / safeTotal;
      return {
        ...item,
        share,
        cumulative: runningTotal / safeTotal,
        cumulativeCount: runningTotal,
      };
    });
  }, []);

  const totalLabels = useMemo(
    () => enhancedDistribution.reduce((sum, item) => sum + item.count, 0),
    [enhancedDistribution]
  );

  const maxCount = useMemo(() => {
    const counts = enhancedDistribution.map((item) => item.count);
    return counts.length ? Math.max(...counts) : 1;
  }, [enhancedDistribution]);

  const coverageIndex = useMemo(() => {
    const idx = enhancedDistribution.findIndex(
      (item) => item.cumulative >= 0.8
    );
    return idx === -1 ? enhancedDistribution.length - 1 : idx;
  }, [enhancedDistribution]);

  const coverageEntry = enhancedDistribution[coverageIndex];
  const activeEntry =
    hoveredIndex >= 0 ? enhancedDistribution[hoveredIndex] : null;

  return (
    <Motion.section
      className="grid gap-8 lg:grid-cols-[3fr,2fr]"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <article className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Complete disease distribution
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              <AnimatedNumber value={totalLabels} formatter={formatNumber} />{" "}
              label assignments across 15 findings.
            </p>
          </div>
        </header>

        <div className="mt-8 space-y-4">
          <ParetoChart
            data={enhancedDistribution}
            activeIndex={hoveredIndex}
            onHover={setHoveredIndex}
            maxValue={maxCount}
          />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 text-sm text-slate-300">
            {activeEntry ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Focused class
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    {activeEntry.label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <span>
                    <AnimatedNumber
                      value={activeEntry.count}
                      formatter={formatNumber}
                    />{" "}
                    labels
                  </span>
                  <span>
                    <AnimatedNumber
                      value={activeEntry.share}
                      formatter={formatPercent}
                    />{" "}
                    share
                  </span>
                  <span>
                    cumulative{" "}
                    <AnimatedNumber
                      value={activeEntry.cumulative}
                      formatter={formatPercent}
                    />
                  </span>
                </div>
              </>
            ) : (
              <p className="text-slate-400">
                Hover or focus any bar to spotlight class-level counts and
                running coverage.
              </p>
            )}
          </div>
        </div>

        <footer className="mt-6 grid gap-2 rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p>
            <AnimatedNumber
              value={datasetMeta.multiLabelCases}
              formatter={formatNumber}
            />{" "}
            multi-label studies ·{" "}
            <AnimatedNumber
              value={datasetMeta.multiLabelShare}
              formatter={formatPercent}
            />{" "}
            share
          </p>
          {coverageEntry ? (
            <p className="text-slate-400">
              Top {coverageIndex + 1} findings capture{" "}
              <AnimatedNumber
                value={coverageEntry.cumulative}
                formatter={formatPercent}
              />{" "}
              of all label assignments.
            </p>
          ) : null}
        </footer>
      </article>

      <aside className="grid gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-6 shadow-[0_22px_80px_-50px_rgba(15,23,42,0.7)]">
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-20" />
          <div className="relative flex flex-col gap-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">
                  Multi-label cadence
                </p>
                <h3 className="text-3xl font-semibold sm:text-4xl">
                  Cohort coverage at a glance
                </h3>
                <p className="text-sm text-white/70">
                  <AnimatedNumber
                    value={multiLabelCases}
                    formatter={formatNumber}
                    as={Fragment}
                  />{" "}
                  studies include more than one finding in {datasetName}.
                </p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-[0_18px_70px_-40px_rgba(59,130,246,0.35)]">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">
                  dataset share
                </p>
                <p className="text-4xl font-semibold tracking-tight">
                  <AnimatedNumber
                    value={shareValue}
                    formatter={formatPercent}
                  />
                </p>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.24em] text-white/55">
                  unique findings monitored
                </span>
                <span className="text-base font-semibold text-white">
                  <AnimatedNumber
                    value={datasetMeta.findingsTracked}
                    formatter={formatNumber}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.24em] text-white/55">
                  weekly additions
                </span>
                <span className="text-base font-semibold text-white">
                  <AnimatedNumber
                    value={datasetMeta.weeklyGrowth ?? 0.018}
                    formatter={formatPercent}
                  />
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/50">
              <span>weak supervision cadence</span>
              <span>anchored to {datasetName}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <DonutCard title="View position" data={viewDistribution} />
          <DonutCard title="Patient gender" data={genderDistribution} />
        </div>
      </aside>
    </Motion.section>
  );
};

const ParetoChart = ({ data, activeIndex, onHover, maxValue }) => {
  const chartWidth = 1400;
  const chartHeight = 600;
  const padding = { top: 32, right: 110, bottom: 130, left: 110 };
  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;
  const safeMax = maxValue || 1;
  const totalBars = data.length || 1;
  const step = usableWidth / totalBars;
  const barWidth = Math.min(64, step * 0.58);

  const hoverHandler = onHover ?? (() => {});
  const handleHover = (index) => hoverHandler(index);
  const handleLeave = () => hoverHandler(-1);

  const countTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(safeMax * ratio),
    ratio,
  }));

  const percentTicks = [0.2, 0.4, 0.6, 0.8, 1];

  const cumulativePoints = data.map((item, index) => {
    const centerX = padding.left + index * step + step / 2;
    const y = padding.top + (1 - clamp01(item.cumulative)) * usableHeight;
    return { x: centerX, y, share: clamp01(item.cumulative) };
  });

  const cumulativePath =
    cumulativePoints.length > 0
      ? cumulativePoints
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"}${point.x.toFixed(
                2
              )} ${point.y.toFixed(2)}`
          )
          .join(" ")
      : "";

  const areaPath =
    cumulativePoints.length > 0
      ? `${cumulativePoints
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"}${point.x.toFixed(
                2
              )} ${point.y.toFixed(2)}`
          )
          .join(" ")} L${cumulativePoints[cumulativePoints.length - 1].x} ${
          padding.top + usableHeight
        } L${cumulativePoints[0].x} ${padding.top + usableHeight} Z`
      : "";

  const eightyIndex = data.findIndex((item) => item.cumulative >= 0.8);
  const coverageIndex =
    eightyIndex === -1 ? Math.max(data.length - 1, 0) : eightyIndex;
  const coverageX = padding.left + coverageIndex * step + step / 2;
  const highlightActive = activeIndex != null && activeIndex >= 0;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="mx-auto w-full max-w-[1180px]"
      role="img"
      aria-label="Pareto chart of disease label distribution"
      onMouseLeave={handleLeave}
    >
      <defs>
        <filter
          id="pareto-bar-glow"
          x="-20%"
          y="-10%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodColor="rgba(37,99,235,0.18)"
          />
        </filter>
        <linearGradient id="pareto-canvas-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(15,23,42,0.94)" />
          <stop offset="45%" stopColor="rgba(10,19,35,0.9)" />
          <stop offset="100%" stopColor="rgba(6,12,24,0.95)" />
        </linearGradient>
        {BAR_GRADIENTS.map((gradient, idx) => (
          <linearGradient
            key={`bar-gradient-${idx}`}
            id={`pareto-bar-${idx}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={gradient.highlight} />
            <stop offset="55%" stopColor={gradient.mid} />
            <stop offset="100%" stopColor={gradient.shadow} />
          </linearGradient>
        ))}
        <linearGradient id="pareto-bar-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="18%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <desc>
        Bars show per-class label counts while the curve tracks cumulative share
        across sorted findings.
      </desc>
      <rect
        x={padding.left}
        y={padding.top}
        width={usableWidth}
        height={usableHeight}
        fill="url(#pareto-canvas-gradient)"
        stroke="rgba(51,65,85,0.45)"
        rx={26}
      />
      {countTicks.map(({ value, ratio }) => {
        const y = padding.top + (1 - ratio) * usableHeight;
        return (
          <g key={`count-${ratio}`}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + usableWidth}
              y2={y}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="4 6"
            />
            <text
              x={padding.left - 14}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[12px] uppercase tracking-[0.2em]"
            >
              {numberFormatter.format(value)}
            </text>
          </g>
        );
      })}
      {percentTicks.map((tick) => {
        const y = padding.top + (1 - tick) * usableHeight;
        return (
          <g key={`pct-${tick}`}>
            <line
              x1={padding.left + usableWidth}
              y1={y}
              x2={padding.left + usableWidth + 14}
              y2={y}
              stroke="rgba(56,189,248,0.4)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left + usableWidth + 18}
              y={y + 4}
              className="fill-sky-300 text-[12px] uppercase tracking-[0.2em]"
            >
              {percentFormatter.format(tick)}
            </text>
          </g>
        );
      })}

      {areaPath ? <path d={areaPath} fill="rgba(56,189,248,0.08)" /> : null}

      {cumulativePath ? (
        <path
          d={cumulativePath}
          fill="none"
          stroke="rgba(56,189,248,0.85)"
          strokeWidth={2.8}
        />
      ) : null}

      {cumulativePoints.map((point, index) => (
        <circle
          key={`cum-point-${index}`}
          cx={point.x}
          cy={point.y}
          r={highlightActive && index === activeIndex ? 6 : 4.4}
          fill="rgba(56,189,248,0.95)"
          stroke="rgba(15,23,42,0.9)"
          strokeWidth={1.4}
          opacity={highlightActive ? (index === activeIndex ? 1 : 0.35) : 0.8}
        />
      ))}

      {data.length > 0 ? (
        <>
          <line
            x1={coverageX}
            y1={padding.top}
            x2={coverageX}
            y2={padding.top + usableHeight}
            stroke="rgba(96,165,250,0.55)"
            strokeDasharray="6 6"
          />
          <text
            x={coverageX + 8}
            y={padding.top + 24}
            className="fill-sky-200 text-[12px] uppercase tracking-[0.25em]"
          >
            80% coverage
          </text>
        </>
      ) : null}

      {data.map((item, index) => {
        const ratio = clamp01(item.count / safeMax);
        const barHeight = ratio * usableHeight;
        const x = padding.left + index * step + (step - barWidth) / 2;
        const y = padding.top + usableHeight - barHeight;
        const labelCenterX = padding.left + index * step + step / 2;
        const labelBaseY = padding.top + usableHeight + 56;
        const isActive = index === activeIndex;
        const paletteIndex = index % BAR_COLORS.length;
        const color = BAR_COLORS[paletteIndex];
        const gradientId = `pareto-bar-${paletteIndex}`;
        const labelLines = item.label.split(/\s+/);
        return (
          <g
            key={item.key}
            className="cursor-pointer"
            tabIndex={0}
            onMouseEnter={() => handleHover(index)}
            onFocus={() => handleHover(index)}
            onBlur={handleLeave}
          >
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={10}
              fill={`url(#${gradientId})`}
              fillOpacity={isActive ? 1 : 0.9}
              stroke={isActive ? hexToRgba(color, 0.5) : "rgba(15,23,42,0.6)"}
              strokeWidth={1}
              filter="url(#pareto-bar-glow)"
            />
            <rect
              x={x + 5}
              y={y + 8}
              width={Math.max(barWidth - 10, 0)}
              height={Math.max(barHeight - 20, 0)}
              rx={9}
              fill="url(#pareto-bar-sheen)"
              opacity={isActive ? 0.28 : 0.16}
              pointerEvents="none"
            />
            <text
              x={x + barWidth / 2}
              y={y - 12}
              textAnchor="middle"
              className={`tabular-nums text-[13px] font-semibold ${
                isActive ? "fill-sky-200" : "fill-slate-400"
              }`}
            >
              <AnimatedNumber
                value={item.count}
                formatter={formatNumber}
                as={Fragment}
              />
            </text>
            <g
              transform={`translate(${labelCenterX} ${labelBaseY}) rotate(-48)`}
              className="pointer-events-none select-none"
              aria-hidden="true"
            >
              {labelLines.map((line, lineIndex) => (
                <text
                  key={`${item.key}-label-${lineIndex}`}
                  x={0}
                  y={lineIndex * 16}
                  textAnchor="end"
                  className="fill-slate-200 text-[13px] font-medium"
                >
                  {line}
                </text>
              ))}
            </g>
          </g>
        );
      })}

      <text
        x={padding.left - 80}
        y={padding.top - 36}
        className="fill-slate-400 text-[12px] uppercase tracking-[0.3em]"
      >
        label count
      </text>
      <text
        x={padding.left + usableWidth + 30}
        y={padding.top - 18}
        className="fill-sky-300 text-[12px] uppercase tracking-[0.3em]"
      >
        cumulative share
      </text>
    </svg>
  );
};

const DonutCard = ({ title, data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const palette = ["#38bdf8", "#818cf8", "#e0e7ff"];
  const legendPalette = ["bg-sky-300", "bg-indigo-300", "bg-blue-200"];
  const sectors = data.map((item) => (total > 0 ? item.count / total : 0));
  const normalizedSectors = normalizeShares(sectors);
  let accumulated = 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 p-6 shadow-[0_24px_90px_-55px_rgba(59,130,246,0.55)]">
      <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-30" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.32em] text-white/60">
          {title}
        </p>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.32em] text-white/60">
          overview
        </span>
      </div>
      <div className="relative mt-5 flex items-center gap-6">
        <svg viewBox="0 0 112 112" className="h-28 w-28">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth="12"
          />
          {normalizedSectors.map((share, index) => {
            const item = data[index];
            const dash = clamp01(share) * circumference;
            const color = palette[index % palette.length];
            const element = (
              <circle
                key={item.label}
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={
                  -(accumulated * circumference) + circumference * 0.25
                }
                strokeLinecap="round"
              />
            );
            accumulated += share;
            return element;
          })}
        </svg>
        <div className="relative flex-1 space-y-3 text-sm text-slate-300">
          {normalizedSectors.map((share, index) => {
            const item = data[index];
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      legendPalette[index % legendPalette.length]
                    }`}
                  />
                  <span className="font-medium text-slate-100">
                    {item.label}
                  </span>
                </div>
                <AnimatedNumber
                  value={share}
                  formatter={formatPercent}
                  className="tabular-nums text-base font-semibold text-slate-100"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ModelSelector = ({ activeModel, onChange }) => {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-50">Model focus</h2>
        <p className="mt-1 text-sm text-slate-400">
          Toggle the cards to change the comparisons and charts below.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {MODEL_FILTERS.map((filter) => {
          const theme = MODEL_THEMES[filter.key] ?? MODEL_THEMES.both;
          const metrics = buildCardMetrics(filter.key);
          return (
            <Motion.button
              key={filter.key}
              type="button"
              onClick={() => onChange(filter.key)}
              className={`relative h-full rounded-2xl border bg-slate-950/70 px-5 py-6 text-left transition ${
                theme.gradient
              } ${theme.border} ${
                filter.key === activeModel
                  ? "ring-2 ring-sky-400/70 ring-offset-2 ring-offset-slate-950"
                  : "hover:border-sky-400/40"
              }`}
              whileHover={{ y: -6 }}
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${theme.dot}`}
              />
              <p
                className={`mt-4 text-sm uppercase tracking-[0.3em] ${theme.accent}`}
              >
                {filter.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {filter.subtitle}
              </p>
              <div className="mt-6 grid gap-2 text-sm text-slate-300">
                <StatLine label="F1" value={metrics.f1} />
                <StatLine label="AUC" value={metrics.auc} />
                <StatLine label="Accuracy" value={metrics.accuracy} />
              </div>
            </Motion.button>
          );
        })}
      </div>
    </section>
  );
};

function StatLine({ label, value }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-slate-500">{label}</span>
      <AnimatedNumber
        value={value}
        formatter={formatPercent}
        className="font-semibold text-slate-100"
      />
    </span>
  );
}

function buildCardMetrics(key) {
  if (key === "both") {
    return {
      f1: (averageMetrics.densenet121.f1 + averageMetrics.resnet152.f1) / 2,
      auc: (averageMetrics.densenet121.auc + averageMetrics.resnet152.auc) / 2,
      accuracy:
        (averageMetrics.densenet121.accuracy +
          averageMetrics.resnet152.accuracy) /
        2,
    };
  }
  return averageMetrics[key] ?? { f1: 0, auc: 0, accuracy: 0 };
}

function MetricsSection({
  activeMetric,
  onMetricChange,
  modelKeys,
  radarSeries,
}) {
  return (
    <section className="space-y-10">
      <header>
        <h2 className="text-xl font-semibold text-slate-50">
          Model diagnostics
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Explore average performance radar plots, class heat lanes, and
          accuracy rings.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr,3fr]">
        <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-6 shadow-[0_26px_110px_-65px_rgba(37,99,235,0.45)]">
          <div className="pointer-events-none absolute -left-32 top-0 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 bottom-0 h-60 w-60 rounded-full bg-indigo-500/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-25" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-white/5 via-transparent to-transparent opacity-55" />
          <div className="relative">
            <h3 className="text-lg font-semibold text-slate-50">
              Average metric radar
            </h3>
            <p className="text-sm text-slate-400">
              Scores normalised across accuracy, AUC, F1, precision, and recall.
            </p>
            <RadarChart series={radarSeries} />
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-8 shadow-[0_26px_110px_-60px_rgba(59,130,246,0.55)]">
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-30" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">
                Ensemble summary rings
              </h3>
              <p className="text-sm text-slate-400">
                Track how each backbone balances accuracy, F1, and AUC with a
                single glance.
              </p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1 text-[0.65rem] uppercase tracking-[0.32em] text-white/60">
              averaged metrics
            </span>
          </div>
          <AverageRings modelKeys={modelKeys} />
        </article>
      </div>

      <article className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">
              Class metric heat lanes
            </h3>
            <p className="text-sm text-slate-400">
              Compare per-class performance across architectures for the
              selected metric.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {METRIC_KEYS.map((metricKey) => (
              <button
                key={metricKey}
                type="button"
                onClick={() => onMetricChange(metricKey)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeMetric === metricKey
                    ? "border-sky-400 bg-sky-500/10 text-sky-200"
                    : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                }`}
              >
                {METRIC_LABELS[metricKey]}
              </button>
            ))}
          </div>
        </div>
        <ClassMetricHeatmap metric={activeMetric} modelKeys={modelKeys} />
      </article>
    </section>
  );
}

const RadarChart = ({ series }) => {
  const size = 480;
  const margin = 40;
  const center = size / 2;
  const radius = center - margin;
  const levels = [0.2, 0.4, 0.6, 0.8, 1];

  const polygons = useMemo(() => {
    return series.map((entry, polygonIndex) => {
      const strokeColor =
        entry.color ?? BAR_COLORS[polygonIndex % BAR_COLORS.length];
      const pointString = METRIC_KEYS.map((key, index) => {
        const angle = (Math.PI * 2 * index) / METRIC_KEYS.length - Math.PI / 2;
        const value = clamp01(entry.metrics?.[key]);
        const point = polarToCartesian(center, center, radius * value, angle);
        return `${point.x},${point.y}`;
      }).join(" ");

      return {
        key: entry.label,
        label: entry.label,
        points: pointString,
        fill: hexToRgba(strokeColor, 0.16),
        stroke: strokeColor,
        metrics: entry.metrics,
      };
    });
  }, [series, center, radius]);

  return (
    <div className="mt-6 flex flex-col items-center gap-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-2xl"
        style={{ maxHeight: "28rem" }}
        role="img"
        aria-label="Radar chart for average metrics"
      >
        <defs>
          <filter id="radar-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient
            id="radar-background-gradient"
            cx="50%"
            cy="48%"
            r="72%"
          >
            <stop offset="0%" stopColor="rgba(59,130,246,0.32)" />
            <stop offset="45%" stopColor="rgba(30,64,175,0.22)" />
            <stop offset="100%" stopColor="rgba(7,16,32,0.95)" />
          </radialGradient>
          <linearGradient id="radar-rim-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(148,163,184,0.22)" />
            <stop offset="65%" stopColor="rgba(59,130,246,0.16)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.6)" />
          </linearGradient>
          <radialGradient id="radar-accent-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(96,165,250,0.85)" />
            <stop offset="55%" stopColor="rgba(59,130,246,0.35)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </radialGradient>
        </defs>

        <rect
          x={margin * 0.6}
          y={margin * 0.6}
          width={size - margin * 1.2}
          height={size - margin * 1.2}
          rx={48}
          fill="url(#radar-background-gradient)"
          stroke="url(#radar-rim-gradient)"
          strokeWidth="1.5"
        />

        <circle
          cx={size - margin * 1.9}
          cy={size - margin * 1.6}
          r={44}
          fill="url(#radar-accent-gradient)"
          opacity="0.55"
        />

        {levels.map((ratio) => (
          <circle
            key={ratio}
            cx={center}
            cy={center}
            r={radius * ratio}
            fill="none"
            stroke="rgba(148,163,184,0.16)"
            strokeWidth="1.2"
          />
        ))}

        {METRIC_KEYS.map((key, index) => {
          const angle =
            (Math.PI * 2 * index) / METRIC_KEYS.length - Math.PI / 2;
          const target = polarToCartesian(center, center, radius, angle);
          const labelPoint = polarToCartesian(
            center,
            center,
            radius + 28,
            angle
          );
          return (
            <g key={key}>
              <line
                x1={center}
                y1={center}
                x2={target.x}
                y2={target.y}
                stroke="rgba(148,163,184,0.2)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-300 text-sm font-medium"
              >
                {METRIC_LABELS[key]}
              </text>
            </g>
          );
        })}

        {polygons.map((polygon) => (
          <g key={polygon.key}>
            <polygon
              points={polygon.points}
              fill={polygon.fill}
              stroke={polygon.stroke}
              strokeWidth="3"
              filter="url(#radar-glow)"
            />
            {METRIC_KEYS.map((key, metricIndex) => {
              const angle =
                (Math.PI * 2 * metricIndex) / METRIC_KEYS.length - Math.PI / 2;
              const value = clamp01(polygon.metrics?.[key]);
              const point = polarToCartesian(
                center,
                center,
                radius * value,
                angle
              );
              return (
                <circle
                  key={`${polygon.key}-${key}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={polygon.stroke}
                  filter="url(#radar-glow)"
                />
              );
            })}
          </g>
        ))}
      </svg>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 text-base text-slate-300 sm:grid-cols-2">
        {polygons.map((polygon) => (
          <div
            key={polygon.key}
            className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/8 bg-slate-950/70 p-5 shadow-[0_22px_80px_-40px_rgba(59,130,246,0.45)]"
          >
            <div className="pointer-events-none absolute -right-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-sky-500/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 border border-white/5 opacity-40"
              style={{ borderRadius: "1.5rem" }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: polygon.stroke }}
                />
                <span className="text-lg font-semibold text-slate-50">
                  {polygon.label}
                </span>
              </div>
              <span className="relative rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.32em] text-white/65">
                composite
              </span>
            </div>
            <div className="relative grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {METRIC_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-slate-400">{METRIC_LABELS[key]}</span>
                  <AnimatedNumber
                    value={polygon.metrics?.[key] ?? 0}
                    formatter={formatPercent}
                    className="text-base font-semibold text-slate-100"
                  />
                </div>
              ))}
            </div>
            <div className="relative mt-2 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/45">
              <span>signal strength</span>
              <span className="text-white/60">updated weekly</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClassMetricHeatmap = ({ metric, modelKeys }) => {
  const labelWidth = 160;
  const gridTemplate = `minmax(${labelWidth}px,1.1fr) repeat(${modelKeys.length}, minmax(140px,1fr))`;

  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-4 shadow-[0_24px_90px_-60px_rgba(59,130,246,0.45)]">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-30" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5">
        <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.32em] text-white/60">
            Finding
          </div>
          {modelKeys.map((key) => (
            <div
              key={key}
              className="bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.32em] text-white/60"
            >
              {MODEL_LIST.find((model) => model.id === key)?.label ?? key}
            </div>
          ))}
          {classMetrics.map((row, rowIndex) => (
            <Fragment key={row.label}>
              <div
                className={`px-5 py-4 text-sm font-medium tracking-wide text-white/80 ${
                  rowIndex % 2 === 0 ? "bg-slate-950/60" : "bg-slate-950/50"
                }`}
              >
                {row.label}
              </div>
              {modelKeys.map((key, colIndex) => (
                <MetricCell
                  key={`${row.label}-${key}`}
                  value={row[key]?.[metric] ?? 0}
                  color={
                    MODEL_COLORS[key] ??
                    BAR_COLORS[colIndex % BAR_COLORS.length]
                  }
                  alternate={rowIndex % 2 === 0}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const getIndicatorColor = (pct, color) => {
  if (pct >= 0.82) return hexToRgba(color, 0.95);
  if (pct >= 0.64) return hexToRgba(color, 0.85);
  if (pct >= 0.42) return hexToRgba(color, 0.75);
  return hexToRgba(color, 0.55);
};

const MetricCell = ({ value, color, alternate }) => {
  const pct = clamp01(value);
  const fillPercent = pct * 100;
  const indicatorPercent = fillPercent;
  const indicatorColor = getIndicatorColor(pct, color);

  return (
    <div
      className={`relative overflow-hidden border-l border-white/10 px-6 py-4 text-sm transition-colors duration-500 ${
        alternate ? "bg-slate-950/60" : "bg-slate-950/40"
      }`}
    >
      <div className="absolute inset-y-3 left-6 right-6">
        <div className="relative h-full">
          <div className="pointer-events-none absolute inset-0 rounded-full border border-white/12 bg-white/5" />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${fillPercent}%`,
              opacity: pct === 0 ? 0 : 1,
              background: `linear-gradient(90deg, ${hexToRgba(
                color,
                0.2
              )} 0%, ${hexToRgba(color, 0.7)} 100%)`,
              boxShadow:
                pct > 0.6 ? `0 0 32px ${hexToRgba(color, 0.4)}` : "none",
            }}
          />
          <span
            className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
            style={{
              left: `calc(${indicatorPercent}% - 8px)`,
              opacity: pct === 0 ? 0 : 1,
              background: indicatorColor,
              boxShadow: `0 0 18px ${hexToRgba(color, 0.6)}`,
            }}
          />
        </div>
      </div>
      <div className="relative flex items-center justify-end gap-3 pr-1">
        <AnimatedNumber
          value={value}
          formatter={formatPercent}
          className="text-base font-semibold tracking-tight text-white/75"
        />
      </div>
    </div>
  );
};

const AverageRings = ({ modelKeys }) => {
  return (
    <div className="relative mt-8 grid gap-6 md:grid-cols-2">
      {modelKeys.map((key) => {
        const metrics = averageMetrics[key];
        const label =
          MODEL_LIST.find((model) => model.id === key)?.label ?? key;
        const color = MODEL_COLORS[key] ?? BAR_COLORS[0];

        const overallScore = (metrics.accuracy + metrics.f1 + metrics.auc) / 3;

        const performanceLevel =
          overallScore >= 0.86
            ? "Excellent"
            : overallScore >= 0.76
            ? "Very Good"
            : overallScore >= 0.66
            ? "Good"
            : "Developing";

        const performanceAccent =
          overallScore >= 0.86
            ? "text-sky-200"
            : overallScore >= 0.76
            ? "text-sky-300"
            : overallScore >= 0.66
            ? "text-indigo-300"
            : "text-slate-400";

        const sanitizedKey =
          `ring-${key}`.replace(/[^a-zA-Z0-9_-]/g, "") || "ring";
        const cardStyle = {
          borderRadius: "1.75rem",
          //remove this to remove box gradient
          // background: `linear-gradient(135deg, rgba(15,23,42,0.96) 4%, ${hexToRgba(
          //   color,
          //   0.14
          // )} 52%, rgba(15,23,42,0.92) 100%)`,
          boxShadow: `0 32px 140px -80px ${hexToRgba(color, 0.68)}`,
        };

        return (
          <div
            key={key}
            className="relative overflow-hidden border border-white/10 bg-slate-950/70 p-6"
            style={cardStyle}
          >
            <div
              className="pointer-events-none absolute -left-20 -top-16 h-40 w-40 rounded-full blur-3xl"
              style={{ backgroundColor: hexToRgba(color, 0.32) }}
            />
            <div
              className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full blur-3xl"
              style={{ backgroundColor: hexToRgba(color, 0.24) }}
            />
            <div className="pointer-events-none absolute inset-[1.5px] rounded-[1.68rem] border border-white/15 opacity-35" />
            <div
              className="pointer-events-none absolute inset-[1.5px] rounded-[1.68rem] bg-linear-to-br from-white/6 via-transparent to-white/0 opacity-60"
              style={{ mixBlendMode: "screen" }}
            />

            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{label}</p>
                  <p
                    className={`text-xs font-semibold uppercase ${performanceAccent}`}
                  >
                    {performanceLevel}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.32em] text-white/70">
                  <AnimatedNumber
                    value={overallScore}
                    formatter={formatPercent}
                    className="font-semibold text-white"
                  />
                  <span className="text-white/60">overall</span>
                </span>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:flex sm:items-center sm:gap-7">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-white/5 via-transparent to-transparent opacity-60" />
                <div className="relative mx-auto flex h-36 w-36 items-center justify-center sm:mx-0">
                  <span
                    className="pointer-events-none absolute h-32 w-32 rounded-full blur-3xl"
                    style={{ backgroundColor: hexToRgba(color, 0.28) }}
                  />
                  <span
                    className="pointer-events-none absolute h-24 w-24 rounded-full bg-white/5 blur-xl"
                    style={{ backgroundColor: hexToRgba(color, 0.18) }}
                  />
                  <AccuracyRing
                    metrics={metrics}
                    color={color}
                    id={sanitizedKey}
                  />
                </div>

                <div className="mt-6 flex-1 space-y-4 sm:mt-0">
                  <div className="grid gap-2 text-sm text-slate-200">
                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-sm">
                      <span className="text-slate-400">Accuracy</span>
                      <AnimatedNumber
                        value={metrics.accuracy}
                        formatter={formatPercent}
                        className="text-base font-semibold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-sm">
                      <span className="text-slate-400">F1 Score</span>
                      <AnimatedNumber
                        value={metrics.f1}
                        formatter={formatPercent}
                        className="text-base font-semibold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-sm">
                      <span className="text-slate-400">AUC</span>
                      <AnimatedNumber
                        value={metrics.auc}
                        formatter={formatPercent}
                        className="text-base font-semibold text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-white/60">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
                      Prec:
                      <span className="text-white/80">
                        <AnimatedNumber
                          value={metrics.precision}
                          formatter={formatPercent}
                          as={Fragment}
                        />
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
                      Rec:
                      <span className="text-white/80">
                        <AnimatedNumber
                          value={metrics.recall}
                          formatter={formatPercent}
                          as={Fragment}
                        />
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AccuracyRing = ({ metrics, color, id }) => {
  const sanitizedId =
    (id ?? "ring").toString().replace(/[^a-zA-Z0-9_-]/g, "") || "ring";

  const outerRadius = 46;
  const middleRadius = 32;
  const innerRadius = 22;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const middleCircumference = 2 * Math.PI * middleRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const accuracy = clamp01(metrics?.accuracy);
  const precision = clamp01(metrics?.precision);
  const recall = clamp01(metrics?.recall);

  const accuracyDash = accuracy * outerCircumference;
  const precisionDash = precision * middleCircumference;
  const recallDash = recall * innerCircumference;

  const offsetOuter = outerCircumference * 0.25;
  const offsetMiddle = middleCircumference * 0.25;
  const offsetInner = innerCircumference * 0.25;

  const progressToAngle = (pct) => ((pct * 360 - 90) * Math.PI) / 180;
  const accuracyMarker = polarToCartesian(
    60,
    60,
    outerRadius,
    progressToAngle(accuracy)
  );

  const glowId = `${sanitizedId}-glow`;
  const ringColor = hexToRgba(color, 0.9);
  const secondaryColor = hexToRgba(color, 0.6);
  const tertiaryColor = hexToRgba(color, 0.45);
  const trackColor = "rgba(148,163,184,0.2)";
  const coreFill = hexToRgba(color, 0.1);

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28">
      <defs>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="60"
        cy="60"
        r={outerRadius}
        fill="none"
        stroke={trackColor}
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={middleRadius}
        fill="none"
        stroke="rgba(148,163,184,0.14)"
        strokeWidth="8"
      />
      <circle
        cx="60"
        cy="60"
        r={innerRadius}
        fill="none"
        stroke="rgba(148,163,184,0.1)"
        strokeWidth="6"
      />

      <circle
        cx="60"
        cy="60"
        r={outerRadius}
        fill="none"
        stroke={ringColor}
        strokeWidth="12"
        strokeDasharray={`${accuracyDash} ${outerCircumference}`}
        strokeDashoffset={offsetOuter}
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />
      <circle
        cx="60"
        cy="60"
        r={middleRadius}
        fill="none"
        stroke={secondaryColor}
        strokeWidth="8"
        strokeDasharray={`${precisionDash} ${middleCircumference}`}
        strokeDashoffset={offsetMiddle}
        strokeLinecap="round"
      />
      <circle
        cx="60"
        cy="60"
        r={innerRadius}
        fill="none"
        stroke={tertiaryColor}
        strokeWidth="6"
        strokeDasharray={`${recallDash} ${innerCircumference}`}
        strokeDashoffset={offsetInner}
        strokeLinecap="round"
      />

      {accuracy > 0 ? (
        <>
          <circle
            cx={accuracyMarker.x}
            cy={accuracyMarker.y}
            r="3.5"
            fill={hexToRgba(color, 0.95)}
            stroke="rgba(15,23,42,0.6)"
            strokeWidth="1"
            filter={`url(#${glowId})`}
          />
          <circle
            cx={accuracyMarker.x}
            cy={accuracyMarker.y}
            r="8"
            fill="none"
            stroke={hexToRgba(color, 0.28)}
            strokeWidth="1"
          />
        </>
      ) : null}

      <circle
        cx="60"
        cy="60"
        r="28"
        fill={coreFill}
        stroke={secondaryColor}
        strokeWidth="1"
      />
      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="fill-slate-50 text-lg font-semibold"
      >
        <AnimatedNumber
          value={metrics?.accuracy ?? 0}
          formatter={formatPercent}
          as={Fragment}
        />
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        className="fill-slate-400 text-[10px] font-medium uppercase tracking-[0.32em]"
      >
        accuracy
      </text>
    </svg>
  );
};

// Constants
const BAR_GRADIENTS = [
  { highlight: "#67e8f9", mid: "#0ea5e9", shadow: "#0f172a" },
  { highlight: "#5eead4", mid: "#14b8a6", shadow: "#042f2e" },
  { highlight: "#7dd3fc", mid: "#38bdf8", shadow: "#0b1f3a" },
  { highlight: "#60efff", mid: "#0891b2", shadow: "#06283d" },
  { highlight: "#6ee7b7", mid: "#0f766e", shadow: "#03211f" },
  { highlight: "#5de0ff", mid: "#2563eb", shadow: "#082f49" },
];

const BAR_COLORS = BAR_GRADIENTS.map((palette) => palette.mid);

const MODEL_COLORS = {
  densenet121: BAR_GRADIENTS[0].mid,
  resnet152: BAR_GRADIENTS[5].mid,
};

// Export component
export default DataPage;
