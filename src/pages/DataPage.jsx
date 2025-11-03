import { Fragment, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";

import AnimatedBackground from "../components/AnimatedBackground.jsx";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import PageBackdrop from "../components/ui/PageBackdrop.jsx";
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

const clamp01 = (value) => Math.min(1, Math.max(0, value ?? 0));

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
      className="relative min-h-screen bg-slate-950 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatedBackground />
      <PageBackdrop />
      <BackgroundGrid />
      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-24 pt-10 sm:px-8">
        <header className="px-6 pt-8 sm:px-10">
          <PrimaryNav />
        </header>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pt-10 sm:px-10 lg:px-12">
            <div className="relative text-center">
              <h1 className="pb-4 text-6xl font-black uppercase tracking-wide text-white">
                <Motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="relative inline-block bg-linear-to-b from-white to-slate-400 bg-clip-text text-transparent"
                >
                  Dataset
                </Motion.span>
                <br />
                <Motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative inline-block bg-linear-to-b from-sky-200 to-sky-600 bg-clip-text text-transparent"
                >
                  Overview
                </Motion.span>
              </h1>
              <Motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mx-auto mt-4 max-w-2xl text-lg text-slate-400"
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

        <Footer />
      </div>
    </Motion.div>
  );
};

const DatasetIntro = () => {
  return (
    <Motion.section
      className="grid gap-8 lg:grid-cols-[3fr,2fr]"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-1 text-xs uppercase tracking-[0.32em] text-sky-300">
          Dataset Overview
        </span>
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

      <div className="grid gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <HighlightStat
          label="Images curated"
          value={numberFormatter.format(datasetMeta.totalImages)}
          hint={`${numberFormatter.format(
            datasetMeta.uniquePatients
          )} patients`}
        />
        <HighlightStat
          label="Multi-label cases"
          value={numberFormatter.format(datasetMeta.multiLabelCases)}
          hint={`${percentFormatter.format(
            datasetMeta.multiLabelShare
          )} of studies`}
        />
        <HighlightStat
          label="Findings tracked"
          value={datasetMeta.findingsTracked}
          hint="Thoracic labels monitored"
        />
      </div>
    </Motion.section>
  );
};

const HighlightStat = ({ label, value, hint }) => {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
};

const DatasetBreakdown = () => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);

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
              {numberFormatter.format(totalLabels)} label assignments across 15
              findings.
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
                    {numberFormatter.format(activeEntry.count)} labels
                  </span>
                  <span>
                    {percentFormatter.format(activeEntry.share)} share
                  </span>
                  <span>
                    cumulative {percentFormatter.format(activeEntry.cumulative)}
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
            {numberFormatter.format(datasetMeta.multiLabelCases)} multi-label
            studies · {percentFormatter.format(datasetMeta.multiLabelShare)}{" "}
            share
          </p>
          {coverageEntry ? (
            <p className="text-slate-400">
              Top {coverageIndex + 1} findings capture{" "}
              {percentFormatter.format(coverageEntry.cumulative)} of all label
              assignments.
            </p>
          ) : null}
        </footer>
      </article>

      <aside className="grid gap-6">
        <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Multi-label cadence
          </h3>
          <div className="mt-4 flex items-center gap-6">
            <GradientCircle value={datasetMeta.multiLabelShare} />
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                {numberFormatter.format(datasetMeta.multiLabelCases)} studies
                include more than one finding.
              </p>
              <p className="text-slate-500">
                Labels derived with weak supervision from radiology notes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DonutCard title="View position" data={viewDistribution} />
          <DonutCard title="Patient gender" data={genderDistribution} />
        </div>
      </aside>
    </Motion.section>
  );
};

const ParetoChart = ({ data, activeIndex, onHover, maxValue }) => {
  const chartWidth = 880;
  const chartHeight = 420;
  const padding = { top: 32, right: 110, bottom: 130, left: 110 };
  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;
  const safeMax = maxValue || 1;
  const totalBars = data.length || 1;
  const step = usableWidth / totalBars;
  const barWidth = Math.min(48, step * 0.62);

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
      className="mx-auto w-full max-w-[880px]"
      role="img"
      aria-label="Pareto chart of disease label distribution"
      onMouseLeave={handleLeave}
    >
      <desc>
        Bars show per-class label counts while the curve tracks cumulative share
        across sorted findings.
      </desc>
      <rect
        x={padding.left}
        y={padding.top}
        width={usableWidth}
        height={usableHeight}
        fill="rgba(15,23,42,0.55)"
        stroke="rgba(51,65,85,0.5)"
        rx={20}
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
              className="fill-slate-500 text-[10px] uppercase tracking-[0.25em]"
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
              className="fill-sky-300 text-[10px] uppercase tracking-[0.25em]"
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
            stroke="rgba(251,191,36,0.7)"
            strokeDasharray="6 6"
          />
          <text
            x={coverageX + 8}
            y={padding.top + 16}
            className="fill-amber-200 text-[10px] uppercase tracking-[0.25em]"
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
        const isActive = index === activeIndex;
        const color = BAR_COLORS[index % BAR_COLORS.length];
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
              fill={color}
              fillOpacity={isActive ? 0.95 : 0.7}
              stroke={
                isActive ? "rgba(59,130,246,0.55)" : "rgba(15,23,42,0.68)"
              }
              strokeWidth={1.2}
            />
            <text
              x={x + barWidth / 2}
              y={y - 8}
              textAnchor="middle"
              className={`tabular-nums text-[11px] font-semibold ${
                isActive ? "fill-sky-200" : "fill-slate-400"
              }`}
            >
              {numberFormatter.format(item.count)}
            </text>
            <text
              x={x + barWidth / 2}
              y={padding.top + usableHeight + 20}
              textAnchor="middle"
              className="fill-slate-400 text-[11px]"
            >
              {labelLines.map((line, lineIndex) => (
                <tspan
                  key={`${item.key}-label-${lineIndex}`}
                  x={x + barWidth / 2}
                  dy={lineIndex === 0 ? 0 : 12}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      <text
        x={padding.left - 66}
        y={padding.top - 12}
        className="fill-slate-500 text-[11px] uppercase tracking-[0.3em]"
      >
        label count
      </text>
      <text
        x={padding.left + usableWidth + 30}
        y={padding.top - 12}
        className="fill-sky-300 text-[11px] uppercase tracking-[0.3em]"
      >
        cumulative share
      </text>
    </svg>
  );
};

const GradientCircle = ({ value }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = clamp01(value) * circumference;

  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24">
      <defs>
        <linearGradient id="multi-label-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.2)"
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="url(#multi-label-gradient)"
        strokeWidth="12"
        strokeDasharray={`${dash} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        className="fill-slate-50 text-xl font-semibold"
      >
        {percentFormatter.format(value)}
      </text>
      <text
        x="60"
        y="78"
        textAnchor="middle"
        className="fill-slate-400 text-xs uppercase tracking-[0.3em]"
      >
        share
      </text>
    </svg>
  );
};

const DonutCard = ({ title, data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
        {title}
      </p>
      <div className="mt-4 flex items-center gap-6">
        <svg viewBox="0 0 112 112" className="h-24 w-24">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth="12"
          />
          {data.map((item, index) => {
            const share = item.count / total;
            const dash = share * circumference;
            const color = index === 0 ? "#38bdf8" : "#818cf8";
            const circleEl = (
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
                  -(offset * circumference) + circumference * 0.25
                }
                strokeLinecap="round"
              />
            );
            offset += share;
            return circleEl;
          })}
        </svg>
        <div className="space-y-2 text-sm text-slate-300">
          {data.map((item, index) => (
            <p key={item.label} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  index === 0 ? "bg-sky-300" : "bg-indigo-300"
                }`}
              />
              <span className="font-medium text-slate-100">{item.label}</span>
              <span className="ml-auto tabular-nums text-slate-400">
                {percentFormatter.format(item.count / total)}
              </span>
            </p>
          ))}
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
      <span className="font-semibold text-slate-100">
        {percentFormatter.format(value)}
      </span>
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
        <article className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-slate-50">
            Average metric radar
          </h3>
          <p className="text-sm text-slate-400">
            Scores normalised across accuracy, AUC, F1, precision, and recall.
          </p>
          <RadarChart series={radarSeries} />
        </article>

        <article className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">
                Ensemble summary rings
              </h3>
              <p className="text-sm text-slate-400">
                Track how each backbone balances accuracy, F1, and AUC with a
                single glance.
              </p>
            </div>
            <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500">
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
  const size = 360;
  const margin = 28;
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
        className="h-80 w-80"
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
        </defs>

        {levels.map((ratio) => (
          <circle
            key={ratio}
            cx={center}
            cy={center}
            r={radius * ratio}
            fill="none"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth="1"
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
                className="fill-slate-400 text-xs font-medium"
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
              strokeWidth="2.5"
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
                  r="4"
                  fill={polygon.stroke}
                  filter="url(#radar-glow)"
                />
              );
            })}
          </g>
        ))}
      </svg>

      <div className="grid w-full max-w-xl grid-cols-2 gap-4 text-sm text-slate-300">
        {polygons.map((polygon) => (
          <div
            key={polygon.key}
            className="flex flex-col gap-2 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: polygon.stroke }}
              />
              <span className="font-medium text-slate-100">
                {polygon.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 pl-4 text-xs">
              {METRIC_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-slate-500">{METRIC_LABELS[key]}</span>
                  <span className="font-medium text-slate-200">
                    {percentFormatter.format(polygon.metrics?.[key] ?? 0)}
                  </span>
                </div>
              ))}
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
  const maxValue = useMemo(() => {
    const values = classMetrics.flatMap((row) =>
      modelKeys.map((key) => clamp01(row[key]?.[metric]))
    );
    return values.length ? Math.max(...values) : 1;
  }, [metric, modelKeys]);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/60">
      <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="bg-slate-900/80 px-4 py-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          Finding
        </div>
        {modelKeys.map((key) => (
          <div
            key={key}
            className="bg-slate-900/80 px-4 py-4 text-xs uppercase tracking-[0.3em] text-slate-500"
          >
            {MODEL_LIST.find((model) => model.id === key)?.label ?? key}
          </div>
        ))}
        {classMetrics.map((row, rowIndex) => (
          <Fragment key={row.label}>
            <div
              className={`px-4 py-3 text-sm font-medium text-slate-200 ${
                rowIndex % 2 === 0 ? "bg-slate-950/50" : "bg-slate-950/70"
              }`}
            >
              {row.label}
            </div>
            {modelKeys.map((key, colIndex) => (
              <MetricCell
                key={`${row.label}-${key}`}
                value={row[key]?.[metric] ?? 0}
                maxValue={maxValue}
                color={
                  MODEL_COLORS[key] ?? BAR_COLORS[colIndex % BAR_COLORS.length]
                }
                alternate={rowIndex % 2 === 0}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const MetricCell = ({ value, maxValue, color, alternate }) => {
  const pct = clamp01(maxValue === 0 ? 0 : value / maxValue);
  const widthPercent = pct === 0 ? 0 : Math.min(100, Math.max(pct * 100, 8));

  // Enhanced color interpolation for better visual understanding
  const getColorIntensity = (value) => {
    if (value >= 0.8) return 1;
    if (value >= 0.6) return 0.85;
    if (value >= 0.4) return 0.7;
    if (value >= 0.2) return 0.5;
    return 0.3;
  };

  return (
    <div
      className={`relative overflow-hidden border-l border-slate-800/60 px-4 py-3 text-sm text-slate-300 ${
        alternate ? "bg-slate-950/40" : "bg-slate-950/60"
      }`}
    >
      {pct > 0 && (
        <>
          <div
            className="pointer-events-none absolute inset-y-2 left-4 rounded-full transition-all duration-300"
            style={{
              width: `${widthPercent}%`,
              background: `linear-gradient(90deg, 
                ${hexToRgba(color, 0.15)}, 
                ${hexToRgba(color, getColorIntensity(pct))}
              )`,
              boxShadow:
                pct > 0.7 ? `0 0 15px ${hexToRgba(color, 0.3)}` : "none",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-2 left-4 rounded-full opacity-20"
            style={{
              width: `${widthPercent}%`,
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 5px,
                ${hexToRgba(color, 0.1)} 5px,
                ${hexToRgba(color, 0.1)} 10px
              )`,
            }}
          />
        </>
      )}
      <div className="relative flex items-center justify-between gap-2">
        <span
          className={`font-semibold ${
            pct > 0.7 ? "text-sky-100" : "text-slate-100"
          }`}
        >
          {percentFormatter.format(value)}
        </span>
        <div className="flex items-center gap-1">
          {pct > 0.8 && (
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          )}
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {pct > 0.8
              ? "high"
              : pct > 0.6
              ? "good"
              : pct > 0.4
              ? "mid"
              : "low"}
          </span>
        </div>
      </div>
    </div>
  );
};

const AverageRings = ({ modelKeys }) => {
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {modelKeys.map((key) => {
        const metrics = averageMetrics[key];
        const label =
          MODEL_LIST.find((model) => model.id === key)?.label ?? key;
        const color = MODEL_COLORS[key] ?? BAR_COLORS[0];

        // Calculate overall performance score
        const overallScore = (metrics.accuracy + metrics.f1 + metrics.auc) / 3;
        const performanceLevel =
          overallScore >= 0.85
            ? "Excellent"
            : overallScore >= 0.75
            ? "Very Good"
            : overallScore >= 0.65
            ? "Good"
            : overallScore >= 0.55
            ? "Fair"
            : "Needs Improvement";

        return (
          <div
            key={key}
            className="flex items-center gap-6 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6"
          >
            <AccuracyRing metrics={metrics} color={color} />
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <p className="text-base font-semibold text-slate-100">
                  {label}
                </p>
                <p
                  className={`text-xs font-medium ${
                    overallScore >= 0.75
                      ? "text-sky-400"
                      : overallScore >= 0.65
                      ? "text-indigo-400"
                      : "text-slate-400"
                  }`}
                >
                  {performanceLevel}
                </p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Accuracy</span>
                  <span className="font-medium text-slate-100">
                    {percentFormatter.format(metrics.accuracy)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">F1 Score</span>
                  <span className="font-medium text-slate-100">
                    {percentFormatter.format(metrics.f1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AUC</span>
                  <span className="font-medium text-slate-100">
                    {percentFormatter.format(metrics.auc)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>P: {percentFormatter.format(metrics.precision)}</span>
                <span>•</span>
                <span>R: {percentFormatter.format(metrics.recall)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AccuracyRing = ({ metrics, color }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  const accuracyDash = clamp01(metrics.accuracy) * circumference;
  const precisionDash = clamp01(metrics.precision) * circumference;
  const recallDash = clamp01(metrics.recall) * circumference;

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background rings */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.12)"
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={radius - 14}
        fill="none"
        stroke="rgba(148,163,184,0.08)"
        strokeWidth="8"
      />
      <circle
        cx="60"
        cy="60"
        r={radius - 26}
        fill="none"
        stroke="rgba(148,163,184,0.06)"
        strokeWidth="6"
      />

      {/* Metric rings */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={`${color}cc`}
        strokeWidth="12"
        strokeDasharray={`${accuracyDash} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <circle
        cx="60"
        cy="60"
        r={radius - 14}
        fill="none"
        stroke={`${color}99`}
        strokeWidth="8"
        strokeDasharray={`${precisionDash} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
      />
      <circle
        cx="60"
        cy="60"
        r={radius - 26}
        fill="none"
        stroke={`${color}77`}
        strokeWidth="6"
        strokeDasharray={`${recallDash} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
      />

      {/* Center content */}
      <circle
        cx="60"
        cy="60"
        r="28"
        fill={`${color}11`}
        stroke={`${color}22`}
        strokeWidth="1"
      />
      <text
        x="60"
        y="55"
        textAnchor="middle"
        className="fill-slate-100 text-lg font-semibold"
      >
        {percentFormatter.format(metrics.accuracy)}
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        className="fill-slate-400 text-[10px] font-medium uppercase tracking-wider"
      >
        accuracy
      </text>
    </svg>
  );
};

// Constants
const BAR_COLORS = [
  "#0ea5e9", // Sky blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f97316", // Orange
];

const MODEL_COLORS = {
  densenet121: "#0ea5e9", // Sky blue for better visibility
  resnet152: "#6366f1", // Indigo for clear distinction
};

// Export component
export default DataPage;
