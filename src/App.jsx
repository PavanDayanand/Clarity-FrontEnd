import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buttonDotClasses,
  disabledButtonClasses,
  disabledDotClasses,
  primaryButtonClasses,
} from "./styles/ui.js";
import { defaultDisease } from "./data/diseases.js";
import useScrollToTop from "./hooks/useScrollToTop.js";
import { entryOverlayStyle } from "./styles/transitions.js";
import PrimaryNav from "./components/PrimaryNav.jsx";
import Footer from "./components/Footer.jsx";
import ScrollIndicator from "./components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "./components/ui/BackgroundGrid.jsx";
const renderRegionIcon = (type, className = "h-5 w-5") => {
  switch (type) {
    case "india":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 4h12v4l-2.5 2L18 12v8H6v-6l2.5-2.1L6 8Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m10 13 2 1.5L14 13"
          />
        </svg>
      );
    case "global":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="7" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.5 9h13M5.5 15h13M12 5c2.5 2.5 2.5 11 0 13M12 5c-2.5 2.5-2.5 11 0 13"
          />
        </svg>
      );
    default:
      return null;
  }
};

const renderMetricIcon = (type, className = "h-5 w-5") => {
  switch (type) {
    case "cases":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 16 9.5 11.5 12 14l4.5-4.5L19 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5h14v14H5Z"
          />
        </svg>
      );
    case "deaths":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="8" r="3" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 21v-4a4 4 0 0 1 8 0v4"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v3" />
        </svg>
      );
    case "chronic":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c-3.9 0-7 3.2-7 7a7 7 0 0 0 4 6.3V21l3-1.5L15 21v-4.7a7 7 0 0 0 4-6.3c0-3.8-3.1-7-7-7Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 10.5h5" />
        </svg>
      );
    default:
      return null;
  }
};
const statGroups = [
  {
    id: "india",
    region: "India Stats",
    regionIcon: "india",
    title: "India's Lung Health Snapshot",
    subtitle: "Tracking the respiratory burden across the nation.",
    gradient: {
      from: "#2d3bff",
      via: "#465eff",
      to: "#21d8ff",
    },
    highlight: {
      label: "Annual Lung Disease Cases",
      value: 18,
      decimals: 0,
      unit: "M",
      suffix: "+",
      caption: "Estimated yearly cases diagnosed across India.",
    },
    metrics: [
      {
        key: "cases",
        label: "Annual Lung Disease Cases",
        description: "Estimated new diagnoses every year nationwide.",
        value: 18,
        decimals: 0,
        unit: "M",
        suffix: "+",
        caption: "cases / year",
        icon: "cases",
      },
      {
        key: "deaths",
        label: "Deaths due to Lung Cancer",
        description: "Lives lost annually to lung cancer in India.",
        value: 70,
        decimals: 0,
        unit: "K",
        suffix: "+",
        caption: "people / year",
        icon: "deaths",
      },
      {
        key: "chronic",
        label: "Living with Chronic Respiratory Disease",
        description: "Citizens managing COPD, asthma, and allied conditions.",
        value: 32,
        decimals: 0,
        unit: "M",
        suffix: "+",
        caption: "patients",
        icon: "chronic",
      },
    ],
    footnote:
      "Sources: WHO, Ministry of Health & Family Welfare (approximations).",
  },
  {
    id: "global",
    region: "Global Outlook",
    regionIcon: "global",
    title: "Worldwide Respiratory Demand",
    subtitle: "The global picture that underscores urgency for AI triage.",
    compact: true,
    gradient: {
      from: "#231b5f",
      via: "#3c1fa3",
      to: "#5dd6ff",
    },
    highlight: {
      label: "Annual Lung Disease Cases",
      value: 450,
      decimals: 0,
      unit: "M",
      suffix: "+",
      caption: "Cases reported globally every year.",
    },
    metrics: [
      {
        key: "cases",
        label: "Annual Lung Disease Cases",
        description: "New respiratory cases diagnosed worldwide annually.",
        value: 450,
        decimals: 0,
        unit: "M",
        suffix: "+",
        caption: "cases / year",
        icon: "cases",
      },
      {
        key: "deaths",
        label: "Deaths due to Lung Cancer",
        description: "Global annual mortality attributed to lung cancer.",
        value: 1.8,
        decimals: 1,
        unit: "M",
        suffix: "+",
        caption: "people / year",
        icon: "deaths",
      },
      {
        key: "chronic",
        label: "Living with Chronic Respiratory Disease",
        description:
          "People living with chronic respiratory illness worldwide.",
        value: 334,
        decimals: 0,
        unit: "M",
        suffix: "+",
        caption: "people",
        icon: "chronic",
      },
    ],
    footnote: "Sources: WHO Global Health Observatory & IHME (approximations).",
  },
];

const diseaseCards = [
  {
    id: "asthma",
    title: "Asthma",
    description:
      "Chronic airway inflammation that narrows passages and triggers breathlessness during flare-ups.",
    gradient: "from-amber-400/25 via-orange-500/10 to-amber-500/5",
    accent: "text-amber-200",
  },
  {
    id: "copd",
    title: "COPD",
    description:
      "Progressive airflow blockage driven by smoking, pollutants, or occupational exposure.",
    gradient: "from-rose-500/20 via-rose-500/10 to-rose-500/5",
    accent: "text-rose-200",
  },
  {
    id: "pneumonia",
    title: "Pneumonia",
    description:
      "Infection that inflames air sacs, filling them with fluid or pus and restricting oxygen exchange.",
    gradient: "from-sky-500/20 via-sky-500/10 to-sky-500/5",
    accent: "text-sky-200",
  },
  {
    id: "lungCancer",
    title: "Lung Cancer",
    description:
      "Abnormal cell growth that damages lung tissue and spreads quickly without early detection.",
    gradient: "from-red-500/25 via-red-500/10 to-red-500/5",
    accent: "text-red-200",
  },
  {
    id: "tb",
    title: "Tuberculosis",
    description:
      "Airborne bacterial infection that remains prevalent in developing regions without screening.",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5",
    accent: "text-emerald-200",
  },
  {
    id: "fibrosis",
    title: "Pulmonary Fibrosis",
    description:
      "Progressive scarring that stiffens lung tissue and makes every breath more laborious.",
    gradient: "from-indigo-500/25 via-indigo-500/10 to-indigo-500/5",
    accent: "text-indigo-200",
  },
  {
    id: "covid",
    title: "COVID-19 Impact",
    description:
      "Viral respiratory illness that can precipitate acute distress, especially in vulnerable patients.",
    gradient: "from-cyan-400/25 via-cyan-500/10 to-cyan-500/5",
    accent: "text-cyan-200",
  },
];

function DiseaseCard({ card, index, onOpen }) {
  const prefersReducedMotion = useReducedMotion();

  const variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: prefersReducedMotion ? 0 : 46,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.55,
          delay: index * 0.08,
          ease: [0.22, 0.84, 0.44, 1],
        },
      },
    }),
    [index, prefersReducedMotion]
  );

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      className={`group relative snap-start min-w-[260px] max-w-[280px] overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br ${card.gradient} p-6 text-white shadow-[0_20px_60px_-32px_rgba(6,18,42,0.55)] backdrop-blur-2xl`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/12 opacity-30" />

      {/* Icon */}
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ${card.accent}`}
      >
        {renderDiseaseIcon(card.id, "h-6 w-6")}
      </span>

      {/* Title */}
      <h3 className="mt-6 text-xl font-semibold text-white">{card.title}</h3>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-white/75">
        {card.description}
      </p>
      {/* Learn More Button */}
      <button
        type="button"
        onClick={() => onOpen && onOpen(index)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen && onOpen(index);
          }
        }}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100"
        aria-label={`Learn more about ${card.title}`}
      >
        Learn More
        <span aria-hidden>→</span>
      </button>
    </motion.div>
  );
}

const renderDiseaseIcon = (key, className = "h-6 w-6") => {
  switch (key) {
    case "asthma":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12h5l1.5 6H8.5Zm10.5-6h-4l1 4h4l1-2.5Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="m7 7 2-2 3 3" />
        </svg>
      );
    case "copd":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12c0-3.5 2.7-6.5 6-6.5s6 3 6 6.5-2.7 6.5-6 6.5S5 15.5 5 12Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.5V18" />
        </svg>
      );
    case "pneumonia":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 10c0-2.8 2.4-5 5.5-5s5.5 2.2 5.5 5-2.4 5-5.5 5-5.5-2.2-5.5-5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 14v2.5A2.5 2.5 0 0 0 10.5 19h3A2.5 2.5 0 0 0 16 16.5V14"
          />
        </svg>
      );
    case "lungCancer":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 12c0-3.7 2.6-6.5 5.5-6.5S17.5 8.3 17.5 12s-2.6 6.5-5.5 6.5S6.5 15.7 6.5 12Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.5v13" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6 6" />
        </svg>
      );
    case "tb":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h8l-1 10h-6Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3.5h3" />
        </svg>
      );
    case "fibrosis":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 7c1.5-1.5 3.5-3 5-3s3.5 1.5 5 3M7 17c1.5 1.5 3.5 3 5 3s3.5-1.5 5-3M7 12h10"
          />
        </svg>
      );
    case "covid":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
          />
        </svg>
      );
    default:
      return null;
  }
};

const coreValues = [
  {
    title: "Empathy",
    description:
      "We prioritise the human side of healthcare so every model, interface, and feature supports clinicians and patients alike.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20.25s-6.75-4.3-6.75-9.5a3.75 3.75 0 0 1 6.75-2.25A3.75 3.75 0 0 1 18.75 10.75c0 5.2-6.75 9.5-6.75 9.5Z"
        />
      </svg>
    ),
  },
  {
    title: "Accuracy",
    description:
      "We hold our models to rigorous standards so clinicians can rely on every prediction when decisions matter most.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <circle cx="12" cy="12" r="7.5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v4M12 16v4M4 12h4M16 12h4"
        />
        <circle cx="12" cy="12" r="2.1" />
      </svg>
    ),
  },
  {
    title: "Transparency",
    description:
      "We make the why behind every prediction visible with explainable AI, transforming the black box into a diagnostic ally.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.75 12s3.5-6 9.25-6 9.25 6 9.25 6-3.5 6-9.25 6-9.25-6-9.25-6Z"
        />
        <circle cx="12" cy="12" r="2.3" />
      </svg>
    ),
  },
  {
    title: "Innovation",
    description:
      "We explore new frontiers in healthcare AI, advancing deep learning and explainability with responsibility and care.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12 3 1.35 2.74 3.04.44-2.2 2.16.52 3.03L12 10.87l-2.71 1.43.52-3.03-2.2-2.16 3.04-.44Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.3 14.8 5 21l3.6-1.95L12 21l3.4-1.95L19 21l-1.3-6.2"
        />
      </svg>
    ),
  },
];

const featureRouteViews = {
  "/predict": "summary",
  "/gradcam": "gradcam",
  "/report": "report",
};

const uploadActions = [
  { id: "summary", label: "AI Summary", view: "summary" },
  { id: "gradcam", label: "View Grad-CAM", view: "gradcam" },
  { id: "report", label: "Generate Report", view: "report" },
];

const LOADER_DURATION_MS = 2500;
const LOADER_EXIT_DELAY_MS = 320;
const LOADER_COMPLETION_PAUSE_MS = 420;

const easingOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function useCountUp(target, start, { duration = 1600, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      return;
    }

    let animationFrame;
    let startTime;

    const animate = (timestamp) => {
      if (startTime === undefined) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easingOutCubic(progress);
      const nextValue = target * eased;

      setValue(Number(nextValue.toFixed(decimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration, decimals, start]);

  return value;
}

function StatCounter({
  target,
  decimals = 0,
  unit = "",
  suffix = "",
  start,
  duration = 1600,
  className = "",
}) {
  const counted = useCountUp(target, start, { duration, decimals });
  const formatted =
    decimals > 0 ? counted.toFixed(decimals) : counted.toLocaleString();

  return (
    <span className={className}>
      {formatted}
      {unit}
      {suffix}
    </span>
  );
}

function StatsGroup({ group, staggerIndex = 0 }) {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: "-120px 0px" });
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${group.gradient.from}, ${group.gradient.via}, ${group.gradient.to})`,
  };

  const gridStyle = {
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
    backgroundSize: "120px 120px",
  };

  const nodePositions = [
    { top: "12%", left: "12%" },
    { top: "12%", left: "50%" },
    { top: "12%", right: "12%" },
    { top: "50%", left: "12%" },
    { top: "50%", left: "50%" },
    { top: "50%", right: "12%" },
    { bottom: "12%", left: "12%" },
    { bottom: "12%", left: "50%" },
    { bottom: "12%", right: "12%" },
  ];

  const containerClasses = `relative overflow-hidden rounded-[40px] border border-white/10 bg-[#06132b]/70 shadow-[0_45px_120px_-60px_rgba(4,18,42,0.6)] backdrop-blur-2xl ${
    group.compact ? "p-6 sm:p-8" : "p-6 sm:p-10"
  }`;

  const highlightTextClass = group.compact
    ? "text-5xl font-semibold tracking-tight text-white sm:text-6xl"
    : "text-6xl font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl";

  const titleClass = group.compact
    ? "text-[1.65rem] font-semibold text-white sm:text-[1.9rem]"
    : "text-3xl font-semibold text-white";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.65,
        ease: "easeOut",
        delay: staggerIndex * 0.08,
      }}
      className={containerClasses}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-4xl border border-white/15 p-8 text-center text-white shadow-[0_34px_85px_-55px_rgba(6,20,50,0.6)]">
          <div className="absolute inset-0 opacity-90" style={gradientStyle} />
          <div className="absolute inset-0 opacity-30" style={gridStyle} />
          {nodePositions.map((position, index) => (
            <span
              key={`${group.id}-node-${index}`}
              className="absolute h-2 w-2 rounded-full border border-white/60 bg-white/80"
              style={position}
            />
          ))}
          <div className="relative flex h-full flex-col items-center justify-center gap-3">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : -10 }}
              transition={{ duration: 0.5, delay: 0.1 + staggerIndex * 0.05 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.38em]"
            >
              <span className="text-white/90">
                {renderRegionIcon(group.regionIcon, "h-4 w-4")}
              </span>
              {group.region}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 18 }}
              transition={{ duration: 0.6, delay: 0.2 + staggerIndex * 0.05 }}
              className="flex flex-col items-center gap-2"
            >
              <StatCounter
                target={group.highlight.value}
                decimals={group.highlight.decimals ?? 0}
                unit={group.highlight.unit ?? ""}
                suffix={group.highlight.suffix ?? ""}
                start={inView}
                duration={1900}
                className={highlightTextClass}
              />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/80">
                {group.highlight.label}
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 16 }}
              transition={{ duration: 0.6, delay: 0.32 + staggerIndex * 0.05 }}
              className="max-w-[16rem] text-center text-xs text-white/70"
            >
              {group.highlight.caption}
            </motion.p>
          </div>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : -20 }}
              transition={{ duration: 0.55, delay: 0.12 + staggerIndex * 0.05 }}
              className={titleClass}
            >
              {group.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : -12 }}
              transition={{ duration: 0.55, delay: 0.2 + staggerIndex * 0.05 }}
              className="mt-3 max-w-xl text-sm text-white/70"
            >
              {group.subtitle}
            </motion.p>
          </div>

          <div className="mt-6 space-y-4">
            {group.metrics.map((metric, index) => (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 20 }}
                transition={{
                  duration: 0.6,
                  delay: 0.26 + index * 0.14 + staggerIndex * 0.05,
                  ease: [0.22, 0.84, 0.44, 1],
                }}
                className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-500/10"
              >
                <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                  {renderMetricIcon(metric.icon, "h-5 w-5")}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <StatCounter
                      target={metric.value}
                      decimals={metric.decimals ?? 0}
                      unit={metric.unit ?? ""}
                      suffix={metric.suffix ?? ""}
                      start={inView}
                      duration={metric.duration ?? 1700}
                      className="text-2xl font-semibold text-white"
                    />
                    <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/45">
                      {metric.caption}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {metric.label}
                  </span>
                  <p className="text-xs leading-relaxed text-white/65">
                    {metric.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 18 }}
            transition={{
              duration: 0.6,
              delay: 0.45 + group.metrics.length * 0.12,
            }}
            className="mt-6 inline-flex items-center gap-2 text-xs text-white/45"
          >
            <span className="h-1 w-1 rounded-full bg-cyan-300" />
            {group.footnote}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

const randomConfidence = () => 0.76 + Math.random() * 0.18;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadRef = useRef(null);
  const aboutRef = useRef(null);
  const spotlightRef = useRef(null);
  const statsRef = useRef(null);
  useScrollToTop();
  const reduceMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewScale, setPreviewScale] = useState(100);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(randomConfidence());
  const [spotlightBroken, setSpotlightBroken] = useState(false);
  const [activeSlide, setActiveSlide] = useState(null);
  const [isLoaderActive, setIsLoaderActive] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderMessage, setLoaderMessage] = useState("Calibrating upload…");
  const [loaderShownForUpload, setLoaderShownForUpload] = useState(false);
  const spotlightPoints = useMemo(
    () => [
      "Overlay pinpoints right upper lobe opacity with 0.84 confidence.",
      "Model cross-checks opacity with global texture patterns before flagging.",
      "Suggested follow-up: CT confirmation and pulmonology consult within 48 hours.",
    ],
    []
  );
  const loaderFrameRef = useRef(null);
  const loaderTimeoutRef = useRef(null);
  const pendingViewRef = useRef(null);
  const loaderSecondsRemaining = Math.max(
    Math.ceil((LOADER_DURATION_MS / 1000) * (1 - loaderProgress / 100)),
    0
  );
  const loaderStatusText = loaderMessage.startsWith("Ready")
    ? "Analysis ready"
    : `≈${Math.max(loaderSecondsRemaining, 1)}s left`;
  const loaderHeadline = loaderMessage.startsWith("Ready")
    ? "Analysis complete"
    : "Analysing upload…";
  const loaderFooterText = loaderMessage.startsWith("Ready")
    ? "Launching experience"
    : "Clarity is preparing your workspace";

  useEffect(() => {
    if (activeSlide === null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setActiveSlide(null);
      } else if (e.key === "ArrowLeft") {
        setActiveSlide(
          (s) => (s - 1 + diseaseCards.length) % diseaseCards.length
        );
      } else if (e.key === "ArrowRight") {
        setActiveSlide((s) => (s + 1) % diseaseCards.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlide]);

  useEffect(() => {
    if (location.hash === "#about") {
      aboutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  // parallax / subtle scroll-linked transforms for a few prominent sections
  const { scrollYProgress: spotlightProgress } = useScroll(
    spotlightRef && spotlightRef.current
      ? { target: spotlightRef, offset: ["start end", "end start"] }
      : {}
  );
  const spotlightY = useTransform(
    spotlightProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -18]
  );
  const spotlightYSpring = useSpring(spotlightY, {
    stiffness: 120,
    damping: 28,
  });

  const { scrollYProgress: statsProgress } = useScroll(
    statsRef && statsRef.current
      ? { target: statsRef, offset: ["start end", "end start"] }
      : {}
  );
  const statsY = useTransform(
    statsProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -12]
  );
  const statsYSpring = useSpring(statsY, { stiffness: 100, damping: 26 });

  const { scrollYProgress: uploadProgress } = useScroll(
    uploadRef && uploadRef.current
      ? { target: uploadRef, offset: ["start end", "end start"] }
      : {}
  );

  // (pop animation removed)
  const uploadY = useTransform(
    uploadProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -10]
  );
  const uploadYSpring = useSpring(uploadY, { stiffness: 100, damping: 26 });

  const clearLoaderTimers = useCallback(() => {
    if (loaderFrameRef.current) {
      cancelAnimationFrame(loaderFrameRef.current);
      loaderFrameRef.current = null;
    }
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
  }, []);

  const cancelLoader = useCallback(() => {
    clearLoaderTimers();
    pendingViewRef.current = null;
    setIsLoaderActive(false);
    setLoaderProgress(0);
    setLoaderMessage("Calibrating upload…");
  }, [clearLoaderTimers]);

  useEffect(() => {
    return () => {
      clearLoaderTimers();
    };
  }, [clearLoaderTimers]);

  useEffect(() => {
    if (isLoaderActive) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isLoaderActive]);

  const navigateWithView = useCallback(
    (view) => {
      if (!uploadedFile) {
        return;
      }

      const baseImage = previewUrl ?? "/iStock-115987328.webp";
      const payload = {
        originalImage: baseImage,
        heatmapImage: baseImage,
        disease: defaultDisease,
        confidence: confidenceScore,
        view,
        fileName: uploadedFile?.name ?? "Uploaded study",
        file: uploadedFile,
        previewUrl,
      };

      if (view === "gradcam") {
        navigate("/gradcam", { state: payload });
        return;
      }

      if (view === "report") {
        navigate("/report", { state: payload });
        return;
      }

      navigate("/predict", { state: payload });
    },
    [navigate, previewUrl, uploadedFile, confidenceScore]
  );

  const finalizeLoader = useCallback(() => {
    loaderTimeoutRef.current = null;
    const targetView = pendingViewRef.current;
    pendingViewRef.current = null;

    if (!targetView) {
      setIsLoaderActive(false);
      return;
    }

    setLoaderShownForUpload(true);
    setIsLoaderActive(false);
    loaderTimeoutRef.current = window.setTimeout(() => {
      navigateWithView(targetView);
      loaderTimeoutRef.current = null;
    }, LOADER_EXIT_DELAY_MS);
  }, [navigateWithView]);

  const resolveLoaderPhaseMessage = useCallback((progress) => {
    if (progress >= 90) {
      return "Compiling structured summary…";
    }
    if (progress >= 60) {
      return "Aligning Grad-CAM overlays…";
    }
    if (progress >= 30) {
      return "Scoring differential predictions…";
    }
    return "Calibrating upload…";
  }, []);

  const startLoader = useCallback(
    (view) => {
      clearLoaderTimers();
      pendingViewRef.current = view;
      setLoaderProgress(0);
      setLoaderMessage(resolveLoaderPhaseMessage(0));
      setIsLoaderActive(true);

      const startedAt = performance.now();

      const tick = (now) => {
        const elapsed = now - startedAt;
        const progress = Math.min(
          Math.round((elapsed / LOADER_DURATION_MS) * 100),
          100
        );
        setLoaderProgress(progress);
        setLoaderMessage((current) => {
          const next = resolveLoaderPhaseMessage(progress);
          return current === next ? current : next;
        });

        if (elapsed < LOADER_DURATION_MS) {
          loaderFrameRef.current = requestAnimationFrame(tick);
        } else {
          loaderFrameRef.current = null;
          setLoaderProgress(100);
          loaderTimeoutRef.current = window.setTimeout(() => {
            setLoaderMessage("Ready — launching experience");
            finalizeLoader();
          }, LOADER_COMPLETION_PAUSE_MS);
        }
      };

      loaderFrameRef.current = requestAnimationFrame(tick);
    },
    [clearLoaderTimers, finalizeLoader, resolveLoaderPhaseMessage]
  );

  const handleScrollToUpload = () => {
    uploadRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleFile = (file) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    cancelLoader();
    setLoaderShownForUpload(false);

    if (!file) {
      setUploadedFile(null);
      setPreviewUrl(null);
      setPreviewScale(100);
      setPreviewRotation(0);
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewScale(100);
    setPreviewRotation(0);
    setConfidenceScore(randomConfidence());
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer?.files ?? [];
    handleFile(file);
  };

  const handleInputChange = (event) => {
    const [file] = event.target.files ?? [];
    handleFile(file);
  };

  const handleNavigateToPredict = (view = "summary") => {
    if (!uploadedFile || isLoaderActive) {
      if (!uploadedFile) {
        return;
      }
      return;
    }

    if (!loaderShownForUpload) {
      startLoader(view);
      return;
    }

    navigateWithView(view);
  };

  const handlePrimaryNavigation = (path) => {
    if (isLoaderActive) {
      return;
    }

    const featureView = featureRouteViews[path];

    if (featureView) {
      if (!uploadedFile) {
        handleScrollToUpload();
        return;
      }

      handleNavigateToPredict(featureView);
      return;
    }

    if (path === "/") {
      navigate("/");
      return;
    }

    navigate(path);
  };

  const resetUpload = () => {
    handleFile(null);
    setIsDragging(false);
  };

  const handleRotation = (direction) => {
    setPreviewRotation((current) => {
      const delta = direction === "left" ? -90 : 90;
      return (current + delta + 360) % 360;
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010718] text-white">
      <ScrollIndicator />

      <AnimatePresence>
        {isLoaderActive ? (
          <motion.div
            key="clarity-loader"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#02061f]/80 backdrop-blur-[10px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative w-[min(460px,92vw)] overflow-hidden rounded-4xl border border-white/12 bg-[linear-gradient(140deg,rgba(24,54,147,0.97),rgba(8,18,56,0.97))] p-8 text-left shadow-[0_48px_160px_-60px_rgba(35,108,255,0.9)]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,149,255,0.6),transparent_60%)]" />
                <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[rgba(64,120,255,0.28)] blur-3xl" />
                <div className="absolute -top-20 right-10 h-40 w-40 rounded-full bg-[rgba(109,160,255,0.32)] blur-[90px]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.48em] text-sky-100/85">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-sky-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v6l3-3m-3 3-3-3"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 13a4.5 4.5 0 0 0 9 0c0-1.657 1.343-3 3-3"
                      />
                    </svg>
                  </span>
                  {loaderHeadline}
                </div>
                <div className="mt-6 flex items-baseline gap-6">
                  <span className="text-6xl font-semibold text-white drop-shadow-[0_12px_35px_rgba(23,78,203,0.35)]">
                    {loaderProgress}
                    <span className="text-2xl align-super">%</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm text-sky-100/85">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-200/80" />
                    {loaderStatusText}
                  </span>
                </div>
                <div className="mt-7">
                  <div className="relative h-14 overflow-hidden rounded-3xl border border-white/15 bg-white/10 backdrop-blur-[2px]">
                    <motion.div
                      className="absolute inset-y-1 left-1 flex items-center justify-end rounded-2xl bg-[linear-gradient(115deg,#e8f1ff,#a7c5ff,#6f97ff)] text-sm font-semibold text-[#16316f] shadow-[0_10px_55px_-30px_rgba(129,178,255,0.9)]"
                      animate={{ width: `${Math.max(loaderProgress, 8)}%` }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      style={{ minWidth: "4.5rem" }}
                    >
                      <span className="pr-4">{loaderProgress}%</span>
                    </motion.div>
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)]" />
                  </div>
                  <div className="mt-3 flex justify-between text-[0.65rem] font-semibold tracking-[0.36em] text-sky-100/60">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
                <div className="mt-7 flex items-center gap-3 text-sm text-sky-100/90">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-sky-300 shadow-[0_0_15px_rgba(125,162,255,0.9)]" />
                  {loaderMessage}
                </div>
                <div className="mt-6 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.4em] text-sky-100/45">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                  </span>
                  {loaderFooterText}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(8,40,90,0.7),rgba(1,6,18,1))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(1,10,26,0.95),#01030d)]" />
        <div
          className="absolute -top-44 -left-32 rounded-full bg-linear-to-br from-[#0f2560]/75 via-[#1b3d7a]/60 to-transparent blur-[140px] opacity-90"
          style={{ width: "34rem", height: "34rem" }}
        />
        <div
          className="absolute bottom-0 -right-48 rounded-full bg-linear-to-tl from-[#07163a]/85 via-[#102552]/65 to-transparent blur-[160px] opacity-95"
          style={{ width: "46rem", height: "46rem" }}
        />
        <div className="absolute top-1/3 right-1/3 h-60 w-60 rounded-full bg-white/8 blur-3xl opacity-35 mix-blend-screen" />
      </div>
      <BackgroundGrid className="z-10 opacity-50" />

      <motion.div
        className="pointer-events-none absolute inset-0 z-20 backdrop-blur-[1.5px]"
        style={entryOverlayStyle}
        initial={{ opacity: 0.45 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-24 pt-10 sm:px-8">
        <header className="px-6 pt-8 sm:px-10">
          <PrimaryNav
            onNavigate={handlePrimaryNavigation}
            maxWidthClass="max-w-5xl"
          />
        </header>

        <section id="home" className="relative px-6 pt-12 text-center sm:px-12">
          <motion.img
            initial={{ opacity: 0, y: 40, rotate: -4 }}
            animate={{ opacity: 0.8, y: 0, rotate: -1.5 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            src="/Chest%20X-ray%20Label%20250.jpg"
            alt="Annotated lateral chest X-ray highlighting key structures"
            className="pointer-events-none absolute left-0 top-24 hidden w-64 max-w-full select-none opacity-70 drop-shadow-[0_40px_80px_rgba(6,18,42,0.65)] lg:block xl:left-10 xl:top-16 xl:w-72"
            style={{
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 92%)",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 92%)",
              WebkitMaskSize: "125% 125%",
              maskSize: "125% 125%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              filter: "drop-shadow(0 55px 90px rgba(8,20,52,0.85))",
            }}
            loading="lazy"
          />
          <motion.img
            initial={{ opacity: 0, y: 40, rotate: 4 }}
            animate={{ opacity: 0.8, y: 0, rotate: 1.5 }}
            transition={{
              duration: 1.1,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            src="/CXRNLPA%20250.jpg"
            alt="Annotated frontal chest X-ray identifying organs"
            className="pointer-events-none absolute right-0 top-32 hidden w-64 max-w-full select-none opacity-70 drop-shadow-[0_40px_80px_rgba(6,18,42,0.65)] lg:block xl:right-10 xl:top-20 xl:w-72"
            style={{
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 92%)",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 92%)",
              WebkitMaskSize: "125% 125%",
              maskSize: "125% 125%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              filter: "drop-shadow(0 55px 90px rgba(8,20,52,0.85))",
            }}
            loading="lazy"
          />
          <motion.h1
            initial={{ opacity: 0, y: 32, filter: "blur(18px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
            style={{ willChange: "transform, filter" }}
            className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-6xl md:text-7xl"
          >
            <span className="gradient-flow-text block text-transparent bg-clip-text bg-[linear-gradient(120deg,#040b1a,#0ea5e9,#1e3a8a,#0ea5e9)]">
              See Beyond the Image — Diagnose with Clarity.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
            style={{ willChange: "transform, filter" }}
            className="mx-auto mt-6 max-w-2xl text-lg italic text-white/70 sm:text-xl"
          >
            Clarity accelerates thoracic diagnostics with AI-guided intuition:
            upload a chest X-ray, and we surface probable conditions, heat-maps,
            and printable summaries in seconds.
          </motion.p>
          <motion.button
            onClick={handleScrollToUpload}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className={`mt-10 ${primaryButtonClasses}`}
          >
            <span className="text-base leading-none">↓</span>
            <span>Upload X-ray</span>
            <span className={buttonDotClasses} />
          </motion.button>
        </section>

        <section id="spotlight" className="relative px-6 pt-16 sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 rounded-[34px] bg-white/5 px-6 py-10 backdrop-blur-2xl ring-1 ring-white/5 sm:px-10 lg:flex-row lg:gap-14"
          >
            <motion.div
              ref={spotlightRef}
              style={{ y: spotlightYSpring }}
              className="w-full max-w-xl overflow-hidden rounded-[28px] shadow-[0_30px_70px_-40px_rgba(14,165,233,0.8)]"
            >
              {spotlightBroken ? (
                <div className="flex h-full min-h-80 w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.25),rgba(2,7,19,0.95))]">
                  <div className="text-center text-sm text-white/60">
                    Preview coming soon.
                  </div>
                </div>
              ) : (
                <img
                  src="/iStock-115987328.webp"
                  alt="AI spotlight highlighting lung opacity"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setSpotlightBroken(true)}
                />
              )}
            </motion.div>

            <div className="w-full text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                AI Clinical Spotlight
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
                <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                  Case Insight: Atypical Lobar Opacity
                </span>
              </h2>
              <p className="mt-4 text-base italic text-white/65 sm:text-lg">
                Generated by Clarity's ensemble of thoracic classifiers, this
                anonymised scan showcases how our Grad-CAM overlays isolate
                regions of suspicion while keeping radiologists in control of
                the narrative.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/60">
                {spotlightPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <motion.a
                href="#upload"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`mt-8 inline-flex ${primaryButtonClasses}`}
              >
                <span className="text-base leading-none">→</span>
                <span>Analyse a new study</span>
                <span className={buttonDotClasses} />
              </motion.a>
            </div>
          </motion.div>
        </section>

        <section id="statistics" className="relative px-6 pt-20 sm:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[110px]" />
            <div className="absolute right-10 top-40 h-60 w-60 rounded-full bg-violet-500/10 blur-[120px]" />
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={`stat-particle-${index}`}
                className="particle-rise absolute h-1.5 w-1.5 rounded-full bg-cyan-300/45"
                style={{
                  left: `${8 + ((index * 7) % 90)}%`,
                  bottom: `${(index * 13) % 85}%`,
                  animationDelay: `${index * 0.6}s`,
                  animationDuration: `${5 + (index % 4)}s`,
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center text-4xl font-semibold text-white sm:text-5xl"
              style={{ y: statsYSpring }}
            >
              <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                Global & Indian Respiratory Insights
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
              className="mx-auto mt-4 max-w-3xl text-center text-base italic text-white/65 sm:text-lg"
              style={{ y: statsYSpring }}
            >
              Live counters highlight how urgent lung-health interventions
              remain—from India’s rising case load to the global population
              managing chronic respiratory disease.
            </motion.p>

            <div className="relative mt-12 flex flex-col gap-12">
              {statGroups.map((group, index) => (
                <StatsGroup key={group.id} group={group} staggerIndex={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="diseases" className="relative px-6 pt-20 sm:px-12">
          <div className="pointer-events-none absolute inset-x-0 -top-20 -z-10 flex justify-center">
            <div className="h-56 w-[420px] rounded-full bg-[radial-gradient(65%_65%_at_50%_50%,rgba(18,38,68,0.6),rgba(6,18,38,0.12)_70%,transparent)] blur-[120px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-6xl">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center text-4xl font-semibold text-white sm:text-5xl"
            >
              <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                Most Common Lung Diseases
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
              className="mx-auto mt-4 max-w-3xl text-center text-base italic text-white/65 sm:text-lg"
            >
              Swipe through the respiratory conditions clinicians flag most
              often. Each profile comes with a short briefing so teams can
              triage outcomes faster.
            </motion.p>

            <div className="relative mt-6">
              <div className="pointer-events-none absolute inset-y-12 left-0 -z-10 w-48 -translate-x-16 rounded-full bg-[linear-gradient(90deg,rgba(3,12,28,0.88),rgba(3,12,28,0.6),transparent)] blur-[72px]" />
              <div className="pointer-events-none absolute inset-y-12 right-0 -z-10 w-48 translate-x-16 rounded-full bg-[linear-gradient(270deg,rgba(3,12,28,0.88),rgba(3,12,28,0.6),transparent)] blur-[72px]" />
              <div className="disease-carousel relative z-20 -mx-6 flex gap-6 overflow-x-auto overflow-y-visible pb-6 pl-6 pr-12 snap-x snap-mandatory sm:-mx-8 sm:pl-12 sm:pr-20">
                {diseaseCards.map((card, index) => (
                  <DiseaseCard
                    key={card.id}
                    card={card}
                    index={index}
                    onOpen={() => setActiveSlide(index)}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-[#121f3d]/70 px-3 py-1.5 text-xs font-semibold text-white/70 shadow-[0_18px_40px_-28px_rgba(30,90,220,0.4)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      const carousel =
                        document.querySelector(".disease-carousel");
                      carousel?.scrollBy({ left: -320, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1f46ff] px-3 py-1.5 text-white transition hover:bg-[#2b51ff]"
                  >
                    <span aria-hidden className="text-sm">
                      ←
                    </span>
                    Scroll
                  </button>
                  <span className="text-[0.75rem] font-medium text-white/55">
                    Drag or use arrows
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const carousel =
                        document.querySelector(".disease-carousel");
                      carousel?.scrollBy({ left: 320, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1f46ff] px-3 py-1.5 text-white transition hover:bg-[#2b51ff]"
                  >
                    Scroll
                    <span aria-hidden className="text-sm">
                      →
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
              className="mx-auto mt-12 flex max-w-md items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70"
            >
              <span className="flex h-2.5 w-2.5 animate-ping rounded-full bg-teal-300/80" />
              <span>
                Did you know? An adult can take around{" "}
                <span className="font-semibold text-white">20,000 breaths</span>{" "}
                every day—making early respiratory insights all the more
                critical.
              </span>
            </motion.div>
          </div>
        </section>

        <section
          id="upload"
          ref={uploadRef}
          className="relative px-6 pt-20 pb-16 sm:px-12"
        >
          <motion.div
            ref={uploadRef}
            style={{ y: uploadYSpring }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-4xl rounded-4xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_35px_110px_-40px_rgba(20,120,255,0.65)] backdrop-blur-3xl"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-white">
                    <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                      Edit image
                    </span>
                  </h2>
                  <p className="mt-1 text-base italic text-white/60 sm:text-lg">
                    At least 256x256px, PNG or JPG file
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetUpload}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 text-white/70 transition hover:border-white/25 hover:text-white"
                  aria-label="Clear image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m7 7 10 10M17 7 7 17"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-6 lg:flex-row">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`relative flex-1 rounded-3xl border-2 px-6 py-8 transition ${
                    isDragging
                      ? "border-cyan-300/70 bg-cyan-400/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex h-full min-h-60 items-center justify-center rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
                    {previewUrl ? (
                      <div className="flex h-60 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#050d20]/60">
                        <img
                          src={previewUrl}
                          alt={uploadedFile?.name || "Uploaded preview"}
                          className="max-h-full max-w-full object-contain transition-transform duration-300"
                          style={{
                            transform: `scale(${
                              previewScale / 100
                            }) rotate(${previewRotation}deg)`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-white/70">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-10 w-10"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4 16 6-6 4 4 6-6"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6"
                          />
                        </svg>
                        <p className="mt-4 text-sm font-medium text-white/80">
                          Drop image here
                        </p>
                        <p className="text-xs text-white/55">
                          Supports DICOM, JPEG, PNG
                        </p>
                      </div>
                    )}
                  </div>
                  {uploadedFile && (
                    <div className="absolute bottom-4 left-6 right-6 rounded-2xl border border-white/10 bg-[#0a1d3b]/80 px-4 py-3 text-sm text-white/80 shadow-[0_18px_45px_-28px_rgba(33,150,243,0.6)] backdrop-blur-md">
                      <div className="font-medium text-white">
                        {uploadedFile.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex w-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl lg:w-80">
                  <div>
                    <span className="text-sm font-semibold text-white/90">
                      Scale image
                    </span>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-white/40">–</span>
                      <input
                        type="range"
                        min="70"
                        max="120"
                        value={previewScale}
                        onChange={(event) =>
                          setPreviewScale(Number(event.target.value))
                        }
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400"
                      />
                      <span className="text-xs text-white/40">+</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-white/90">
                      Rotate image
                    </span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleRotation("left")}
                        className="flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 text-white/70 transition hover:border-cyan-300/40 hover:text-cyan-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 7.5H6a8.25 8.25 0 1 1-2.41 5.84"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 4.5v3h3"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotation("right")}
                        className="flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 text-white/70 transition hover:border-cyan-300/40 hover:text-cyan-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 16.5H18a8.25 8.25 0 1 1 2.41-5.84"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 19.5v-3h-3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-white/90">
                      Upload image
                    </span>
                    <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-cyan-300/40 hover:text-cyan-100">
                      Browse
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.dicom,.dcm"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-white/55">
                      Maximum size: 30 MB
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!uploadedFile}
                  onClick={() => handleNavigateToPredict("summary")}
                  className={`rounded-2xl px-6 py-2 text-sm font-semibold text-white transition ${
                    uploadedFile
                      ? "bg-linear-to-r from-cyan-400 via-sky-500 to-blue-600 shadow-[0_18px_45px_-28px_rgba(33,150,243,0.7)] hover:shadow-[0_18px_48px_-22px_rgba(33,150,243,0.8)]"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {uploadActions.map((action) => {
                const isDisabled = !uploadedFile;
                const motionProps = isDisabled
                  ? {}
                  : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } };

                return (
                  <motion.button
                    key={action.id}
                    type="button"
                    onClick={() => handleNavigateToPredict(action.view)}
                    disabled={isDisabled}
                    className={
                      isDisabled ? disabledButtonClasses : primaryButtonClasses
                    }
                    {...motionProps}
                  >
                    <span className="text-base leading-none">↗</span>
                    <span>{action.label}</span>
                    <span
                      className={
                        isDisabled ? disabledDotClasses : buttonDotClasses
                      }
                    />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section
          id="about"
          ref={aboutRef}
          className="relative px-6 pt-16 pb-24 sm:px-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[46px] border border-white/12 bg-linear-to-br from-white/95 via-sky-50/95 to-blue-100/90 text-slate-900 shadow-[0_40px_120px_-55px_rgba(46,115,255,0.65)]"
            style={{ y: aboutRef ? statsYSpring : undefined }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-10 h-64 w-64 rotate-12 rounded-[36px] bg-white/60 blur-3xl" />
              <div className="absolute -bottom-28 right-10 h-72 w-72 -rotate-6 rounded-[36px] bg-sky-200/70 blur-[120px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.28),transparent_55%)]" />
            </div>

            <div className="relative grid gap-14 px-8 py-14 sm:px-16 sm:py-20">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-[3.4rem]">
                  Where Healthcare
                  <span className="text-blue-600">.</span>
                  <br className="hidden sm:block" />
                  Meets Clarity
                  <span className="text-blue-500">.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed text-slate-600">
                  At Clarity, we bring the worlds of Machine Learning and
                  Artificial Intelligence together to redefine how medical
                  imaging is understood. Our platform is designed to assist
                  radiologists and doctors by offering fast, accurate, and
                  explainable diagnostic insights from chest X-rays.
                </p>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  We believe that technology should not replace expertise — it
                  should empower it. With every prediction, visualization, and
                  generated report, Clarity aims to enhance medical
                  decision-making and make diagnostics more transparent,
                  efficient, and reliable.
                </p>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  Our goal is simple: to make healthcare smarter, diagnostics
                  clearer, and patient outcomes better — one image at a time.
                </p>
                <p className="mt-6 text-base leading-relaxed text-slate-600">
                  Clarity isn’t just a project — it’s a vision to make medical
                  intelligence accessible, understandable, and trustworthy for
                  every healthcare professional.
                </p>
              </div>

              <div className="relative rounded-[36px] border border-slate-900/20 bg-[#0a1635]/95 p-8 text-white shadow-[0_32px_90px_-55px_rgba(10,23,52,0.9)] backdrop-blur-xl sm:p-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-sm">
                    <h3 className="text-3xl font-semibold text-white">
                      Our Core Values
                    </h3>
                    <p className="mt-3 text-sm text-white/70">
                      At Clarity, our foundation rests on four strong pillars
                      that guide every innovation we create.
                    </p>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200"
                  >
                    Trusted by clinicians
                  </motion.span>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {coreValues.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{
                        delay: index * 0.12,
                        duration: 0.45,
                        ease: [0.22, 0.84, 0.44, 1],
                      }}
                      className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 text-left transition hover:border-blue-300/40 hover:bg-blue-500/10"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200">
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-white/70">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
      {/* Slide viewer: lightbox-style interactive presentation for disease cards */}
      {activeSlide !== null ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setActiveSlide(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl rounded-3xl bg-[#061025]/95 p-8 text-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 p-3 text-2xl">
                  {renderDiseaseIcon(diseaseCards[activeSlide].id, "h-6 w-6")}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">
                    {diseaseCards[activeSlide].title}
                  </h3>
                  <p className="mt-1 text-sm text-white/70">
                    {diseaseCards[activeSlide].description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlide(
                      (s) => (s - 1 + diseaseCards.length) % diseaseCards.length
                    )
                  }
                  className="rounded-full bg-white/6 p-2 text-white/80 hover:bg-white/12"
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlide((s) => (s + 1) % diseaseCards.length)
                  }
                  className="rounded-full bg-white/6 p-2 text-white/80 hover:bg-white/12"
                  aria-label="Next"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlide(null)}
                  className="ml-3 rounded-full bg-white/6 p-2 text-white/80 hover:bg-white/12"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-black/40 p-4">
                <img
                  src={`/iStock-115987328.webp`}
                  alt={diseaseCards[activeSlide].title}
                  className="h-56 w-full object-cover rounded-lg"
                />
              </div>
              <div>
                <h4 className="text-lg font-semibold">Details</h4>
                <p className="mt-3 text-sm text-white/70">
                  {diseaseCards[activeSlide].description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => alert("Placeholder: open prediction flow")}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open in Clarity
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlide(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
      <Footer />
    </div>
  );
}

export default App;
