import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/AnimatedBackground.jsx";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import PageBackdrop from "../components/ui/PageBackdrop.jsx";
import useScrollToTop from "../hooks/useScrollToTop.js";
import {
  datasetClassDistribution,
  datasetMeta,
  modelPerformance,
  trainingCurves,
} from "../data/datasetOverview.js";
import { diseaseLibrary } from "../data/diseases.js";
import { MODEL_LIST } from "../utils/modelUtils.js";

const chartPalette = {
  densenet121: {
    line: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.22)",
    accent: "#60a5fa",
  },
  resnet152: {
    line: "#a855f7",
    fill: "rgba(168, 85, 247, 0.22)",
    accent: "#818cf8",
  },
};

const diseaseOrder = [
  "atelectasis",
  "cardiomegaly",
  "consolidation",
  "edema",
  "effusion",
  "emphysema",
  "fibrosis",
  "hernia",
  "infiltration",
  "mass",
  "noFinding",
  "nodule",
  "pleuralThickening",
  "pneumonia",
  "pneumothorax",
];

const diseaseCopyOverrides = {
  atelectasis:
    "Atelectasis is the partial or complete collapse of lung tissue where trapped air is reabsorbed and the affected lung segments shrink. This condition reduces the surface area available for gas exchange. Common causes include post-operative complications, airway obstruction, external compression, or loss of surfactant. The collapsed areas appear darker on X-rays.",
  cardiomegaly:
    "Cardiomegaly refers to abnormal enlargement of the heart that extends beyond its typical anatomical boundaries. It reflects underlying cardiac dysfunction from conditions like heart failure, hypertension, valvular disease, or cardiomyopathy. The enlarged heart appears as an increased cardiac silhouette shadow on X-rays. Diagnosis is typically confirmed when the cardiothoracic ratio exceeds 0.5 on frontal radiographs.",
  consolidation:
    "Consolidation occurs when lung tissue becomes densely infiltrated with fluid, pus, or cellular material, displacing air from the alveoli. This process typically results from pneumonia, aspiration, pulmonary edema, or acute respiratory distress syndrome. Air bronchograms may be visible within the consolidation as branching patterns. The affected area becomes opaque or white on X-rays.",
  edema:
    "Edema is the abnormal accumulation of fluid within the interstitial spaces and alveoli of the lungs, appearing as bilateral diffuse opacities. It commonly results from elevated hydrostatic pressure due to heart failure, mitral stenosis, or renal failure. Pulmonary edema reduces lung compliance and impairs gas exchange, causing shortness of breath and hypoxemia. It can also result from increased capillary permeability in acute lung injury or sepsis.",
  effusion:
    "Effusion is the abnormal collection of fluid in the pleural space between the visceral and parietal pleura surrounding the lungs. This fluid accumulation compresses the underlying lung tissue and significantly impairs respiratory function when large. Effusions can be transudative from systemic conditions like heart failure or liver cirrhosis, or exudative from localized pleural disease. The fluid appears as increased opacity at lung bases on chest X-rays.",
  emphysema:
    "Emphysema is the permanent, irreversible destruction and loss of elasticity in lung alveoli walls, leading to abnormal airspace enlargement. This destruction reduces the surface area for gas exchange and causes air trapping during expiration. Predominantly caused by cigarette smoking, emphysema results in progressive airflow obstruction and chronic obstructive pulmonary disease. It appears as hyperlucent lung fields with flattened diaphragms on X-rays.",
  fibrosis:
    "Fibrosis is the abnormal formation of excess fibrous connective tissue in the lungs, characterized by scarring and thickening of alveolar walls. This pathological process reduces lung elasticity and impairs gas exchange, leading to progressive breathlessness. Causes include occupational exposures (silicosis, asbestosis), chronic inflammation, and autoimmune diseases like rheumatoid arthritis. It appears as fine linear patterns indicating permanent tissue damage.",
  hernia:
    "Hernia is the abnormal protrusion of tissue through a defect or weakness in the surrounding structure. A diaphragmatic hernia occurs when abdominal organs protrude into the thoracic cavity through a diaphragm defect. This can result from congenital abnormalities, traumatic rupture, or weakening from increased intra-abdominal pressure. It can compress lung tissue and impair ventilation.",
  infiltration:
    "Infiltration refers to the abnormal accumulation of pathological material within the lung interstitium and alveoli, including inflammatory cells, edema fluid, or pus. Infiltrates often appear as ill-defined areas of increased opacity representing infections, inflammatory conditions, malignancy, or aspiration. The distribution pattern can suggest specific underlying etiologies. Various conditions including pneumonia, tuberculosis, and aspiration can produce infiltrative patterns.",
  mass: "Mass is an abnormal growth or lesion within the lung parenchyma appearing as a discrete opacity on chest X-rays, typically well-defined with clear borders. Masses can be benign (hamartomas, lipomas) or malignant (lung cancer, lymphoma, metastases). Size, density, growth rate, and associated findings help differentiate benign from malignant lesions. Definitive diagnosis often requires additional imaging or biopsy.",
  noFinding:
    "No Finding indicates a completely normal chest X-ray with no radiographically visible pathology, normal heart size, and clear lung fields. It represents healthy individuals without cardiopulmonary disease serving as the baseline standard for comparison. Normal mediastinal contours and bone structures are preserved. This is the control state against which all abnormalities are compared.",
  nodule:
    "Nodule is a small, well-circumscribed round or oval opacity typically measuring less than 3 cm in greatest dimension. Nodules can represent granulomas from healed infections, benign tumors, or early-stage malignancy. The characteristics including density, growth pattern, and associated features help determine clinical significance. Follow-up imaging is often required to assess stability or progression.",
  pleuralThickening:
    "Pleural Thickening is abnormal thickening of the pleura appearing as linear opacities along the chest wall or mediastinum. This can result from chronic inflammation, previous infection or tuberculosis, malignancy, or asbestos exposure. Significant pleural thickening can restrict lung expansion and impair ventilation. It may follow previous pleural diseases or infections.",
  pneumonia:
    "Pneumonia is an acute infection of the lungs where the inflammatory response fills alveoli with pus, fluid, and inflammatory cells. Pneumonia can be caused by bacteria, viruses, fungi, or atypical organisms like mycoplasma. Clinical presentation ranges from mild community-acquired pneumonia to severe life-threatening disease. It impairs gas exchange and requires appropriate antimicrobial or supportive therapy.",
  pneumothorax:
    "Pneumothorax is the abnormal presence of air within the pleural space causing partial or complete lung collapse. It can occur spontaneously in healthy individuals, result from trauma, or develop secondary to underlying lung disease. Clinical presentation ranges from asymptomatic findings to acute respiratory distress depending on pneumothorax size. The collapsed lung appears as a radiolucent area separated from the chest wall by a visible lung edge.",
};

const percentFormatter = (value) => `${(value * 100).toFixed(1)}%`;
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const defaultNumberFormatter = new Intl.NumberFormat("en-US");

const distributionViews = [
  { id: "overview", label: "Overview" },
  { id: "prevalence", label: "Prevalent" },
  { id: "rarity", label: "Rare" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 42 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.18, 0.88, 0.32, 1] },
  },
};

const subtleFade = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggered = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const viewportConfig = { once: true, amount: 0.35 };

function DistributionChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const maxValue = useMemo(
    () => Math.max(...data.map((item) => item.count)),
    [data]
  );
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const paddingTop = 48;
  const paddingBottom = 72;
  const paddingLeft = 42;
  const labelColumnWidth = 190;
  const rightPadding = 84;
  const axisHeight = 40;
  const rowHeight = 22;
  const rowGap = 20;
  const rowSpacing = rowHeight + rowGap;
  const barHeight = rowHeight;
  const chartWidth = 860;
  const chartHeight =
    paddingTop + paddingBottom + rowSpacing * data.length + axisHeight;
  const barAreaWidth =
    chartWidth - paddingLeft - labelColumnWidth - rightPadding;
  const panelX = paddingLeft - 26;
  const panelWidth = chartWidth - panelX - 28;
  const panelYOffset = 36;
  const panelHeight = chartHeight - panelYOffset * 2;
  const metricColumnX = paddingLeft + labelColumnWidth + barAreaWidth + 28;

  const xTicks = new Array(5).fill(0).map((_, index) => {
    const ratio = index / 4;
    const value = Math.round(maxValue * ratio);
    const x = paddingLeft + labelColumnWidth + barAreaWidth * ratio;
    return { value, x };
  });

  const rows = useMemo(
    () =>
      data.map((item, index) => {
        const progress = item.count / maxValue;
        const width = barAreaWidth * progress;
        const y = paddingTop + index * rowSpacing;
        return { item, width, y };
      }),
    [data, maxValue, barAreaWidth, paddingTop, rowSpacing]
  );

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="h-full w-full"
      role="img"
      aria-label="Dataset class distribution"
    >
      <defs>
        <linearGradient id="barFillGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(59,130,246,0.22)" />
          <stop offset="35%" stopColor="rgba(37,99,235,0.45)" />
          <stop offset="70%" stopColor="rgba(14,165,233,0.65)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0.9)" />
        </linearGradient>
        <linearGradient id="hoverFillGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(96,165,250,0.38)" />
          <stop offset="45%" stopColor="rgba(59,130,246,0.65)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0.95)" />
        </linearGradient>
        <linearGradient id="trackFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(148,163,184,0.12)" />
          <stop offset="100%" stopColor="rgba(30,58,138,0.12)" />
        </linearGradient>
        <radialGradient id="panelGlow" cx="15%" cy="0%" r="140%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.24)" />
          <stop offset="55%" stopColor="rgba(10,21,38,0.45)" />
          <stop offset="100%" stopColor="rgba(6,12,24,0.85)" />
        </radialGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="rgba(165,243,252,0.95)" />
          <stop offset="65%" stopColor="rgba(59,130,246,0.55)" />
          <stop offset="100%" stopColor="rgba(14,116,144,0)" />
        </radialGradient>
        <filter id="barShadow" x="-10%" y="-50%" width="130%" height="200%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="10"
            floodColor="rgba(15,118,226,0.52)"
            floodOpacity="0.55"
          />
        </filter>
      </defs>

      <rect
        x={panelX}
        y={panelYOffset}
        width={panelWidth}
        height={panelHeight}
        rx={42}
        fill="url(#panelGlow)"
        stroke="rgba(148, 163, 184, 0.16)"
      />

      <text
        x={paddingLeft + 12}
        y={paddingTop - 16}
        fontSize="12"
        fill="rgba(226,232,255,0.85)"
        fontWeight="600"
        letterSpacing="0.32em"
        style={{ textTransform: "uppercase" }}
      >
        Distribution
      </text>
      <text
        x={paddingLeft + 8}
        y={paddingTop - 32}
        fontSize="11"
        fill="rgba(148,163,184,0.7)"
        letterSpacing="0.28em"
        style={{ textTransform: "uppercase" }}
      >
        Condition
      </text>
      <text
        x={metricColumnX}
        y={paddingTop - 32}
        fontSize="11"
        fill="rgba(148,163,184,0.7)"
        letterSpacing="0.28em"
        textAnchor="end"
        style={{ textTransform: "uppercase" }}
      >
        Share
      </text>
      <text
        x={metricColumnX}
        y={paddingTop - 16}
        fontSize="12"
        fill="rgba(148,163,184,0.8)"
        letterSpacing="0.32em"
        textAnchor="end"
        style={{ textTransform: "uppercase" }}
      >
        {defaultNumberFormatter.format(total)} cases
      </text>

      {xTicks.map((tick, index) => (
        <g key={`tick-${index}`}>
          <line
            x1={tick.x}
            x2={tick.x}
            y1={paddingTop - 12}
            y2={chartHeight - paddingBottom}
            stroke="rgba(148, 163, 184, 0.16)"
            strokeDasharray="6 10"
          />
          <text
            x={tick.x}
            y={chartHeight - paddingBottom + 26}
            fontSize="11"
            fill="rgba(148, 163, 184, 0.75)"
            textAnchor="middle"
          >
            {compactFormatter.format(tick.value)}
          </text>
        </g>
      ))}

      {rows.map(({ item, width, y }, index) => {
        const isHovered = hoveredIndex === index;
        const barY = y;
        const barX = paddingLeft + labelColumnWidth;
        const barRadius = barHeight / 2;
        const barColor = isHovered
          ? "url(#hoverFillGradient)"
          : "url(#barFillGradient)";
        const labelY = barY + barHeight / 2 + 4;
        const clampedWidth = Math.max(Math.min(width, barAreaWidth), 0);
        const percentLabel = percentFormatter(item.count / total);
        const labelInside = clampedWidth > barAreaWidth * 0.32;
        const countTextX = labelInside
          ? Math.max(barX + clampedWidth - 14, barX + 36)
          : Math.min(barX + clampedWidth + 16, barX + barAreaWidth - 12);
        const countTextAnchor = labelInside ? "end" : "start";
        const countTextFill = labelInside
          ? isHovered
            ? "rgba(255,255,255,0.98)"
            : "rgba(226,232,255,0.86)"
          : isHovered
          ? "rgba(165,243,252,0.95)"
          : "rgba(148, 163, 184, 0.85)";
        const percentX = metricColumnX;
        const dotX = barX + clampedWidth;
        const dotY = barY + barHeight / 2;
        const tooltipX = Math.max(
          barX,
          Math.min(dotX - 90, barX + barAreaWidth - 140)
        );
        const rankLabel = String(index + 1).padStart(2, "0");

        return (
          <g
            key={item.key}
            tabIndex={0}
            role="listitem"
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            aria-label={`${item.label}: ${defaultNumberFormatter.format(
              item.count
            )} studies`}
          >
            <text
              x={paddingLeft - 12}
              y={labelY - 4}
              fontSize="11"
              textAnchor="end"
              fill={
                isHovered ? "rgba(165,243,252,0.85)" : "rgba(148,163,184,0.55)"
              }
            >
              {rankLabel}
            </text>
            <text
              x={paddingLeft + 8}
              y={labelY - 4}
              fontSize="13"
              fill={
                isHovered ? "rgba(255,255,255,0.95)" : "rgba(203,213,225,0.86)"
              }
            >
              {item.label}
            </text>

            <rect
              x={barX}
              y={barY}
              width={barAreaWidth}
              height={barHeight}
              rx={barRadius}
              fill="url(#trackFill)"
              opacity={isHovered ? 0.26 : 0.12}
            />

            <rect
              x={barX}
              y={barY}
              width={Math.max(clampedWidth, 4)}
              height={barHeight}
              rx={barRadius}
              fill={barColor}
              filter={isHovered ? "url(#barShadow)" : undefined}
              opacity={isHovered ? 1 : 0.92}
            />

            <rect
              x={barX}
              y={barY}
              width={Math.max(clampedWidth, 4)}
              height={barHeight}
              rx={barRadius}
              fill="rgba(15,23,42,0.25)"
              opacity={isHovered ? 0.2 : 0.1}
            />

            <text
              x={countTextX}
              y={labelY - 4}
              fontSize="12"
              fill={countTextFill}
              textAnchor={countTextAnchor}
            >
              {defaultNumberFormatter.format(item.count)}
            </text>

            <text
              x={percentX}
              y={labelY - 4}
              fontSize="11"
              fill={
                isHovered
                  ? "rgba(165,243,252,0.95)"
                  : "rgba(148, 163, 184, 0.72)"
              }
            >
              {percentLabel}
            </text>

            <circle
              cx={dotX}
              cy={dotY}
              r={isHovered ? 8 : 6}
              fill="url(#dotGlow)"
              opacity={isHovered ? 0.95 : 0.7}
            />
            <circle
              cx={dotX}
              cy={dotY}
              r={isHovered ? 3.5 : 3}
              fill="rgba(226,232,255,0.95)"
            />

            {isHovered && (
              <g transform={`translate(${tooltipX}, ${barY - 32})`}>
                <rect
                  x={0}
                  y={0}
                  width={140}
                  height={48}
                  rx={14}
                  fill="rgba(8,15,30,0.86)"
                  stroke="rgba(148,163,184,0.35)"
                />
                <text
                  x={16}
                  y={20}
                  fontSize="12"
                  fill="rgba(226,232,255,0.9)"
                  fontWeight="600"
                >
                  {item.label}
                </text>
                <text x={16} y={36} fontSize="11" fill="rgba(148,163,184,0.85)">
                  {defaultNumberFormatter.format(item.count)} cases
                </text>
              </g>
            )}
          </g>
        );
      })}

      <line
        x1={paddingLeft + labelColumnWidth}
        x2={paddingLeft + labelColumnWidth + barAreaWidth}
        y1={chartHeight - paddingBottom}
        y2={chartHeight - paddingBottom}
        stroke="rgba(148, 163, 184, 0.3)"
      />

      <text
        x={paddingLeft + labelColumnWidth + barAreaWidth / 2}
        y={chartHeight - paddingBottom + 46}
        fontSize="11"
        fill="rgba(148, 163, 184, 0.75)"
        textAnchor="middle"
      >
        Cases per condition
      </text>
    </svg>
  );
}

function TrainingCurveChart({ data, palette }) {
  const defaultPalette = chartPalette.densenet121;
  const activePalette = palette ?? defaultPalette;
  const values = data.flatMap((entry) => [entry.train, entry.validation]);
  const maxValue = Math.max(0.92, ...values);
  const minValue = Math.min(0.62, ...values);
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 60;
  const paddingY = 28;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const makePath = (key) => {
    return data
      .map((entry, index) => {
        const x =
          paddingX + (usableWidth * index) / Math.max(data.length - 1, 1);
        const value = entry[key];
        const normalized =
          maxValue === minValue
            ? 0
            : (value - minValue) / (maxValue - minValue);
        const y = paddingY + usableHeight - normalized * usableHeight;
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
  };

  const trainPath = makePath("train");
  const validationPath = makePath("validation");

  const xTicks = data.map((entry, index) => {
    const x = paddingX + (usableWidth * index) / Math.max(data.length - 1, 1);
    return { label: `E${entry.epoch}`, x };
  });

  const yTicks = new Array(5).fill(0).map((_, index) => {
    const ratio = index / 4;
    const value = maxValue - (maxValue - minValue) * ratio;
    const y = paddingY + ratio * usableHeight;
    return {
      label: `${Math.round(value * 100)}%`,
      y,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="h-full w-full"
      role="img"
      aria-label="Model training accuracy curves"
    >
      <defs>
        <linearGradient id="trainFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={activePalette.fill} />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0.05)" />
        </linearGradient>
        <linearGradient id="validationLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={activePalette.accent} />
          <stop offset="100%" stopColor={activePalette.line} />
        </linearGradient>
        <radialGradient id="curveBackdrop" cx="20%" cy="0%" r="140%">
          <stop offset="0%" stopColor="rgba(129, 140, 248, 0.35)" />
          <stop offset="65%" stopColor="rgba(21, 30, 58, 0.15)" />
          <stop offset="100%" stopColor="rgba(8, 12, 26, 0.5)" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={paddingX - 30}
        y={paddingY - 20}
        width={usableWidth + 60}
        height={usableHeight + 40}
        rx={34}
        fill="url(#curveBackdrop)"
        stroke="rgba(148, 163, 184, 0.12)"
      />

      {yTicks.map((tick, index) => (
        <g key={`y-${index}`}>
          <line
            x1={paddingX - 18}
            x2={paddingX + usableWidth + 18}
            y1={tick.y}
            y2={tick.y}
            stroke="rgba(148, 163, 184, 0.14)"
            strokeDasharray="6 10"
          />
          <text
            x={paddingX - 24}
            y={tick.y + 4}
            fontSize="10"
            fill="rgba(148, 163, 184, 0.75)"
            textAnchor="end"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {xTicks.map((tick) => (
        <text
          key={tick.label}
          x={tick.x}
          y={chartHeight - 6}
          fontSize="10"
          fill="rgba(148, 163, 184, 0.7)"
          textAnchor="middle"
        >
          {tick.label}
        </text>
      ))}

      <path
        d={`${trainPath} L ${paddingX + usableWidth} ${
          paddingY + usableHeight
        } L ${paddingX} ${paddingY + usableHeight} Z`}
        fill="url(#trainFill)"
        opacity="0.7"
      />

      <path
        d={trainPath}
        fill="none"
        stroke={activePalette.line}
        strokeWidth="2.6"
        strokeLinecap="round"
        filter="url(#glow)"
      />

      <path
        d={validationPath}
        fill="none"
        stroke="url(#validationLine)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="6 10"
        filter="url(#glow)"
      />

      {data.map((entry, index) => {
        const x =
          paddingX + (usableWidth * index) / Math.max(data.length - 1, 1);
        const trainNorm =
          maxValue === minValue
            ? 0
            : (entry.train - minValue) / (maxValue - minValue);
        const validationNorm =
          maxValue === minValue
            ? 0
            : (entry.validation - minValue) / (maxValue - minValue);
        const trainY = paddingY + usableHeight - trainNorm * usableHeight;
        const validationY =
          paddingY + usableHeight - validationNorm * usableHeight;

        return (
          <g key={`markers-${entry.epoch}`}>
            <circle
              cx={x}
              cy={trainY}
              r={4}
              fill={activePalette.line}
              stroke="rgba(15, 23, 42, 0.7)"
              strokeWidth="1.5"
            />
            <circle
              cx={x}
              cy={validationY}
              r={4}
              fill={activePalette.accent}
              stroke="rgba(15, 23, 42, 0.7)"
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function DataPage() {
  useScrollToTop();
  const navigate = useNavigate();
  const [activeModel, setActiveModel] = useState(
    MODEL_LIST[0]?.id ?? "densenet121"
  );
  const [distributionView, setDistributionView] = useState("overview");
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const distribution = useMemo(() => {
    const base = [...datasetClassDistribution];
    if (distributionView === "rarity") {
      base.sort((first, second) => first.count - second.count);
    } else {
      base.sort((first, second) => second.count - first.count);
    }
    return base.map((item) => ({
      ...item,
      label:
        item.label.length > 16 ? `${item.label.slice(0, 15)}…` : item.label,
    }));
  }, [distributionView]);

  const distributionStats = useMemo(() => {
    const total = datasetMeta.totalStudies;
    const average = Math.round(total / datasetClassDistribution.length);
    const sorted = [...datasetClassDistribution].sort(
      (first, second) => second.count - first.count
    );
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const delta = top && average ? (top.count - average) / average : 0;
    return {
      total,
      average,
      top,
      bottom,
      delta,
    };
  }, []);

  const summaryTiles = useMemo(
    () => [
      {
        label: "Classes",
        value: datasetClassDistribution.length,
        display: datasetClassDistribution.length.toString(),
        caption: "Distinct thoracic labels curated for inference and training.",
      },
      {
        label: "Patients",
        value: datasetMeta.uniquePatients,
        display: numberFormatter.format(datasetMeta.uniquePatients),
        caption: "Unique patient records represented across the corpus.",
      },
      {
        label: "Modality",
        value: datasetMeta.modality,
        display: datasetMeta.modality,
        caption: "Acquisition configuration aligned to production inference.",
      },
    ],
    [numberFormatter]
  );

  const diseaseEntries = useMemo(() => {
    return diseaseOrder
      .map((key) => {
        const base = diseaseLibrary[key] ?? {};
        const overrideCopy = diseaseCopyOverrides[key];
        return {
          key,
          ...base,
          definition: overrideCopy ?? base.definition,
        };
      })
      .filter((item) => item?.name && item?.definition);
  }, []);

  const activePerformance = modelPerformance[activeModel];
  const activeCurves = trainingCurves[activeModel] ?? [];
  const palette = chartPalette[activeModel] ?? chartPalette.densenet121;
  const handleNavigate = (path) => navigate(path);
  const distributionDeltaLabel = Number.isFinite(distributionStats.delta)
    ? `${distributionStats.delta >= 0 ? "+" : ""}${(
        distributionStats.delta * 100
      ).toFixed(1)}%`
    : null;
  const latestEpoch = activeCurves.length
    ? activeCurves[activeCurves.length - 1]
    : null;
  const previousEpoch =
    activeCurves.length > 1 ? activeCurves[activeCurves.length - 2] : null;
  const validationDelta =
    latestEpoch && previousEpoch
      ? latestEpoch.validation - previousEpoch.validation
      : null;
  const trainDelta =
    latestEpoch && previousEpoch
      ? latestEpoch.train - previousEpoch.train
      : null;
  const validationDeltaLabel = Number.isFinite(validationDelta)
    ? `${validationDelta >= 0 ? "+" : ""}${(validationDelta * 100).toFixed(1)}%`
    : null;
  const trainDeltaLabel = Number.isFinite(trainDelta)
    ? `${trainDelta >= 0 ? "+" : ""}${(trainDelta * 100).toFixed(1)}%`
    : null;

  const performanceTiles = useMemo(
    () => [
      {
        label: "Accuracy",
        value: percentFormatter(activePerformance?.accuracy ?? 0),
        accent: "from-cyan-400/35 via-sky-500/25 to-transparent",
      },
      {
        label: "AUC",
        value: percentFormatter(activePerformance?.auc ?? 0),
        accent: "from-indigo-400/35 via-violet-500/25 to-transparent",
      },
      {
        label: "F1 score",
        value: percentFormatter(activePerformance?.f1 ?? 0),
        accent: "from-emerald-400/35 via-teal-500/20 to-transparent",
      },
    ],
    [activePerformance]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030711] text-white">
      <AnimatedBackground tone="data" />
      <PageBackdrop variant="data" />
      <BackgroundGrid className="opacity-[0.18]" cellSize={140} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto w-full max-w-6xl px-6 pt-12">
          <PrimaryNav
            onNavigate={handleNavigate}
            maxWidthClass="max-w-5xl"
            dataPath="/data"
          />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
          <motion.header
            className="pt-16 text-center md:pt-20"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <div className="mx-auto max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.28em] text-white/70">
                Dataset Intelligence
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                <span className="gradient-flow-text block text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                  Unified view of the Clarity training corpus
                </span>
              </h1>
              <motion.p
                className="mt-4 text-base text-white/70 sm:text-lg"
                variants={subtleFade}
              >
                Explore class balance, model performance, and clinical
                definition summaries for each thoracic finding.
              </motion.p>
            </div>
          </motion.header>

          <motion.section
            className="mt-12 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]"
            variants={staggered}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <motion.div
              variants={fadeInUp}
              className="relative overflow-hidden rounded-4xl border border-white/14 bg-white/10 px-8 py-8 shadow-[0_32px_80px_-48px_rgba(15,70,160,0.65)] backdrop-blur-3xl"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -top-28 -right-32 h-88 w-88 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.32),transparent_70%)] blur-3xl" />
                <span className="absolute -bottom-36 -left-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.28),transparent_68%)] blur-3xl" />
                <span className="absolute inset-0 bg-[linear-gradient(140deg,rgba(12,22,42,0.85),rgba(9,16,32,0.55))]" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-white/90">
                      Dataset snapshot
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">
                      Aggregated metrics sourced from {datasetMeta.datasetName}{" "}
                      ({datasetMeta.releaseYear}).
                    </p>
                  </div>
                  <motion.div
                    variants={subtleFade}
                    className="rounded-3xl border border-cyan-200/40 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.38),rgba(14,23,42,0.2))] px-6 py-5 text-right shadow-[0_18px_50px_-30px_rgba(14,165,233,0.85)]"
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-white/70">
                      Total studies
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {numberFormatter.format(datasetMeta.totalStudies)}
                    </p>
                    <p className="mt-2 text-xs text-white/60">
                      Across training, validation, and benchmarking splits.
                    </p>
                  </motion.div>
                </div>
                <motion.div
                  className="grid gap-5 sm:grid-cols-3"
                  variants={staggered}
                >
                  {summaryTiles.map((tile) => (
                    <motion.div
                      key={tile.label}
                      variants={subtleFade}
                      whileHover={{ translateY: -6 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative overflow-hidden rounded-3xl border border-white/12 bg-white/8 px-6 py-5"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <div className="relative z-10">
                        <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                          {tile.label}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-white/90">
                          {tile.display}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-white/60">
                          {tile.caption}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex h-full flex-col gap-6"
            >
              <div className="relative overflow-hidden rounded-[28px] border border-white/14 bg-white/10 px-6 py-6 backdrop-blur-3xl">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.25),transparent_70%)]"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white/90">
                      Model selection
                    </h2>
                    <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Toggle models
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {MODEL_LIST.map((model) => {
                      const isActive = model.id === activeModel;
                      return (
                        <motion.button
                          key={model.id}
                          type="button"
                          onClick={() => setActiveModel(model.id)}
                          className={`relative overflow-hidden rounded-full border px-5 py-2 text-sm font-medium transition ${
                            isActive
                              ? "border-cyan-300/70 text-white shadow-[0_12px_32px_-20px_rgba(59,130,246,0.9)]"
                              : "border-white/10 text-white/60 hover:text-white"
                          }`}
                          whileHover={{ translateY: -2 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {isActive && (
                            <span className="absolute inset-0 bg-linear-to-r from-cyan-400/30 via-blue-500/25 to-indigo-500/25" />
                          )}
                          <span className="relative z-10">{model.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/14 bg-white/10 px-6 py-6 backdrop-blur-3xl">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_70%)]"
                />
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-white/90">
                    Performance snapshot
                  </h3>
                  <p className="mt-2 text-sm text-white/65">
                    Offline validation on the held-out fold; live metrics will
                    stream once the backend feed is connected.
                  </p>
                  <motion.div
                    className="mt-6 grid gap-4 sm:grid-cols-3"
                    variants={staggered}
                  >
                    {performanceTiles.map((tile) => (
                      <motion.div
                        key={tile.label}
                        variants={subtleFade}
                        className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-center"
                      >
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tile.accent} opacity-60`}
                        />
                        <div className="relative z-10">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/65">
                            {tile.label}
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {tile.value}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-xs text-white/60">
                    DenseNet inferences complete in{" "}
                    {Math.round(activePerformance?.inferenceTimeMs ?? 0)}ms on
                    T4-class hardware.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>
          <motion.section
            className="mt-14 grid gap-8 xl:grid-cols-[1.25fr,0.75fr]"
            variants={staggered}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <motion.div
              variants={fadeInUp}
              className="relative overflow-hidden rounded-[38px] border border-white/14 bg-white/10 px-7 py-7 shadow-[0_40px_120px_-60px_rgba(37,99,235,0.7)] backdrop-blur-3xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-24 h-104 w-104 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.28),transparent_72%)] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -right-28 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2),transparent_75%)] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(8,16,30,0.65),rgba(5,12,26,0.35))]"
              />
              <div className="relative z-10 flex flex-col gap-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/65">
                      Most common finding
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {distributionStats.top?.label ?? "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      {numberFormatter.format(
                        distributionStats.top?.count ?? 0
                      )}{" "}
                      studies
                      {distributionDeltaLabel && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                          {distributionDeltaLabel}
                          <span className="text-white/50">vs avg</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 p-1.5 shadow-[0_28px_80px_-60px_rgba(59,130,246,0.85)]">
                    {distributionViews.map((view) => {
                      const isActive = view.id === distributionView;
                      return (
                        <motion.button
                          key={view.id}
                          type="button"
                          onClick={() => setDistributionView(view.id)}
                          className={`relative rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.16em] transition ${
                            isActive
                              ? "text-white shadow-[0_16px_32px_-20px_rgba(59,130,246,0.75)]"
                              : "text-white/65 hover:text-white"
                          }`}
                          whileTap={{ scale: 0.96 }}
                        >
                          {isActive && (
                            <span className="absolute inset-0 rounded-full bg-linear-to-r from-cyan-400/35 via-blue-500/25 to-indigo-500/25" />
                          )}
                          <span className="relative z-10 uppercase">
                            {view.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <motion.div
                  className="mt-2 aspect-7/5 w-full overflow-hidden rounded-[30px] border border-white/12 bg-white/6 p-4"
                  variants={subtleFade}
                >
                  <DistributionChart data={distribution} />
                </motion.div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Avg per label
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white/90">
                      {numberFormatter.format(distributionStats.average)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/60">
                      Cases per class baseline
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Rarest label
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white/90">
                      {distributionStats.bottom?.label ?? "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-white/60">
                      {numberFormatter.format(
                        distributionStats.bottom?.count ?? 0
                      )}{" "}
                      samples
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Total studies
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white/90">
                      {numberFormatter.format(distributionStats.total)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/60">
                      Across all 15 conditions
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="relative overflow-hidden rounded-[34px] border border-white/14 bg-white/10 px-6 py-6 backdrop-blur-3xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -top-28 -right-28 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.22),transparent_78%)] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-32 h-88 w-88 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.18),transparent_70%)] blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(7,14,28,0.75),rgba(5,12,24,0.4))]"
              />
              <div className="relative z-10 flex h-full flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Epoch {latestEpoch?.epoch ?? "—"}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      Validation accuracy
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      {latestEpoch
                        ? percentFormatter(latestEpoch.validation)
                        : "—"}
                      {validationDeltaLabel && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                          {validationDeltaLabel}
                          <span className="text-white/50">prev</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/6 px-4 py-3 text-right shadow-[0_28px_80px_-60px_rgba(96,165,250,0.85)]">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/65">
                      Train accuracy
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {latestEpoch ? percentFormatter(latestEpoch.train) : "—"}
                    </p>
                    {trainDeltaLabel && (
                      <p className="mt-1 text-[11px] text-white/60">
                        {trainDeltaLabel} prev epoch
                      </p>
                    )}
                  </div>
                </div>

                <motion.div
                  className="relative mt-2 flex-1 overflow-hidden rounded-[26px] border border-white/12 bg-white/6 p-4"
                  variants={subtleFade}
                >
                  <TrainingCurveChart data={activeCurves} palette={palette} />
                  {latestEpoch && (
                    <div className="pointer-events-none absolute right-5 top-5 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-right text-[11px] text-white/70 backdrop-blur-xl">
                      <p className="text-xs text-white/80">
                        Epoch {latestEpoch.epoch}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        Val {percentFormatter(latestEpoch.validation)}
                      </p>
                      <p className="text-[11px] text-white/60">
                        Train {percentFormatter(latestEpoch.train)}
                      </p>
                    </div>
                  )}
                </motion.div>

                <div className="grid gap-3 text-xs text-white/65">
                  <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/6 px-4 py-2">
                    <span>Epoch span</span>
                    <span>{activeCurves.length} epochs</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/6 px-4 py-2">
                    <span>Current model</span>
                    <span className="text-white/80">
                      {MODEL_LIST.find((model) => model.id === activeModel)
                        ?.label ?? "DenseNet-121"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>

          <motion.section
            className="mt-16"
            variants={staggered}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <motion.div
              variants={fadeInUp}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-3xl font-semibold text-white">
                <span className="text-transparent bg-clip-text bg-[linear-gradient(120deg,#0b1f3f,#3b82f6,#0ea5e9,#3b82f6)]">
                  Clinical label glossary
                </span>
              </h2>
              <motion.p
                className="mt-4 text-base text-white/65"
                variants={subtleFade}
              >
                A quick reference for the 15 thoracic conditions covered within
                the dataset.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3"
              variants={staggered}
            >
              {diseaseEntries.map((disease) => (
                <motion.article
                  key={disease.key}
                  variants={subtleFade}
                  whileHover={{ translateY: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden rounded-[28px] border border-white/12 bg-white/8 px-6 py-6 text-left backdrop-blur-3xl"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold text-white/90">
                      {disease.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      {disease.definition}
                    </p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </motion.section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
