import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { defaultDisease } from "../data/diseases.js";
import {
  entryOverlayStyle,
  exitOverlayStyle,
  slideBlurVariants,
  slideBlurViewport,
} from "../styles/transitions.js";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import { usePopup } from "../components/ui/PopupProvider.jsx";
import { predictDisease } from "../api/clarityApi.js";
import { findDiseaseByName, getTopFindings } from "../utils/diseaseLookup.js";
import { useUpload } from "../context/UploadContext.jsx";
import {
  DEFAULT_MODEL_KEY,
  MODEL_LIST,
  MODEL_KEYS,
  resolveModelKey,
  resolveModelLabel,
} from "../utils/modelUtils.js";

const modelOptions = MODEL_LIST;

const MODEL_STYLES = {
  densenet121: {
    dotClass: "bg-cyan-300",
    borderClass: "border-cyan-200/25",
    backgroundClass: "bg-cyan-200/5",
    gradientClass:
      "bg-linear-to-r from-cyan-200/80 via-cyan-300/80 to-blue-500/85 shadow-[0_22px_70px_-40px_rgba(59,130,246,0.9)]",
    tagTone: "text-cyan-200",
    lineColor: "#38bdf8",
    areaColor: "rgba(56,189,248,0.22)",
  },
  resnet152: {
    dotClass: "bg-indigo-300",
    borderClass: "border-indigo-200/25",
    backgroundClass: "bg-indigo-200/5",
    gradientClass:
      "bg-linear-to-r from-indigo-200/80 via-sky-400/80 to-purple-500/85 shadow-[0_22px_70px_-45px_rgba(129,140,248,0.9)]",
    tagTone: "text-indigo-200",
    lineColor: "#a78bfa",
    areaColor: "rgba(167,139,250,0.22)",
  },
};

const progressDurationMs = 2300;
const progressSegments = 28;
const heroGradientClass =
  "gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]";

function PredictPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const { showPopup } = usePopup();
  const { uploadData, updateUploadData } = useUpload();
  const locationState = location.state ?? {};
  const file = locationState.file ?? uploadData.file ?? null;
  const fileName =
    locationState.fileName ?? uploadData.fileName ?? "Live upload preview";
  const originalImage =
    locationState.originalImage ??
    uploadData.originalImage ??
    uploadData.previewUrl ??
    "/placeholder-xray.png";
  const heatmapImage =
    locationState.heatmapImage ?? uploadData.heatmapImage ?? null;
  const initialDisease =
    locationState.disease ?? uploadData.disease ?? defaultDisease;
  const initialConfidence =
    locationState.confidence ?? uploadData.confidence ?? 0.87;
  const locationPositiveFindings = locationState.positiveFindings;
  const uploadPositiveFindings = uploadData.positiveFindings;
  const initialPredictions =
    locationState.predictions ?? uploadData.predictions ?? null;
  const initialPositiveFindings = useMemo(() => {
    if (Array.isArray(locationPositiveFindings)) {
      return locationPositiveFindings;
    }
    if (Array.isArray(uploadPositiveFindings)) {
      return uploadPositiveFindings;
    }
    return [];
  }, [locationPositiveFindings, uploadPositiveFindings]);
  const requestModelKey = resolveModelKey(
    locationState.modelKey ?? uploadData.modelKey ?? DEFAULT_MODEL_KEY
  );
  const fallbackModelLabel = resolveModelLabel(
    uploadData.modelDisplayName ?? requestModelKey
  );
  const modelCount = MODEL_KEYS.length;
  const modelCountLabel = `${modelCount} model${modelCount === 1 ? "" : "s"}`;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);
  const [predictionData, setPredictionData] = useState(null);
  const [predictionsMap, setPredictionsMap] = useState(initialPredictions);
  const [positiveFindings, setPositiveFindings] = useState(
    initialPositiveFindings
  );
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(file));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeModelId, setActiveModelId] = useState(() => requestModelKey);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [modelConfidenceMap, setModelConfidenceMap] = useState({});
  const [chartView, setChartView] = useState("both");
  const [modelStates, setModelStates] = useState({});
  const [activeComparisonIndex, setActiveComparisonIndex] = useState(0);
  const [chartHoverIndex, setChartHoverIndex] = useState(null);
  const pendingRequestsRef = useRef({});
  const seededDefaultResultRef = useRef(false);

  const loadModelPrediction = useCallback(
    (inputModelKey) => {
      if (!file) {
        return;
      }

      const modelKey = resolveModelKey(inputModelKey ?? DEFAULT_MODEL_KEY);

      if (pendingRequestsRef.current[modelKey]) {
        return;
      }

      const controller = new AbortController();
      pendingRequestsRef.current[modelKey] = controller;

      setModelStates((previous) => {
        const existing = previous[modelKey];
        return {
          ...previous,
          [modelKey]: {
            status: "loading",
            data: existing?.data ?? null,
            error: null,
          },
        };
      });

      predictDisease(file, { model: modelKey, signal: controller.signal })
        .then((response) => {
          setModelStates((previous) => ({
            ...previous,
            [modelKey]: {
              status: "success",
              data: response ?? null,
              error: null,
            },
          }));
        })
        .catch((error) => {
          if (error?.name === "AbortError") {
            return;
          }

          console.error(`Prediction request failed for ${modelKey}`, error);

          setModelStates((previous) => ({
            ...previous,
            [modelKey]: {
              status: "error",
              data: previous[modelKey]?.data ?? null,
              error: error?.message ?? "Unable to generate predictions.",
            },
          }));

          if (modelKey === activeModelId) {
            showPopup({
              title: "Prediction failed",
              message:
                error?.message ??
                "We couldn't generate predictions for this model.",
              variant: "danger",
            });
          }
        })
        .finally(() => {
          delete pendingRequestsRef.current[modelKey];
        });
    },
    [activeModelId, file, showPopup]
  );
  useEffect(() => {
    if (!file) {
      setIsLoading(false);
      showPopup({
        title: "Upload required",
        message: "Return to the home page and add an image to continue.",
        variant: "warning",
      });
      navigate("/", { replace: true });
    }
  }, [file, navigate, showPopup]);

  useEffect(() => {
    if (!file) {
      return;
    }

    if (
      initialPredictions &&
      !seededDefaultResultRef.current &&
      !modelStates[requestModelKey]
    ) {
      seededDefaultResultRef.current = true;
      setModelStates((previous) => ({
        ...previous,
        [requestModelKey]: {
          status: "success",
          data: {
            success: true,
            predictions: initialPredictions,
            positive_findings: initialPositiveFindings,
            confidence: initialConfidence,
            model_used: resolveModelLabel(requestModelKey),
          },
          error: null,
        },
      }));
    }
  }, [
    file,
    initialConfidence,
    initialPositiveFindings,
    initialPredictions,
    modelStates,
    requestModelKey,
  ]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const state = modelStates[requestModelKey];
    if (!state && !pendingRequestsRef.current[requestModelKey]) {
      loadModelPrediction(requestModelKey);
    }
  }, [file, loadModelPrediction, modelStates, requestModelKey]);

  useEffect(() => {
    if (!file) {
      return;
    }

    MODEL_KEYS.forEach((modelKey) => {
      if (!modelStates[modelKey] && !pendingRequestsRef.current[modelKey]) {
        loadModelPrediction(modelKey);
      }
    });
  }, [file, loadModelPrediction, modelStates]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const activeState = modelStates[activeModelId];
    if (!activeState) {
      setIsLoading(true);
      setApiError(null);
      return;
    }

    setIsLoading(activeState.status === "loading");
    setApiError(activeState.status === "error" ? activeState.error : null);
  }, [activeModelId, file, modelStates]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const activeState = modelStates[activeModelId];
    if (!activeState || activeState.status !== "success") {
      return;
    }

    const data = activeState.data ?? null;
    if (!data) {
      return;
    }

    const predictions = data?.predictions ?? null;
    const positive = Array.isArray(data?.positive_findings)
      ? data.positive_findings
      : [];
    const summary = getTopFindings(positive, predictions);
    const leadingFinding = summary[0]?.disease ?? null;
    const derivedConfidenceRaw =
      typeof data?.confidence === "number"
        ? data.confidence
        : typeof summary[0]?.probability === "number"
        ? summary[0].probability
        : initialConfidence;
    const derivedConfidence = Number.isFinite(derivedConfidenceRaw)
      ? derivedConfidenceRaw
      : initialConfidence;
    const confidencePercentTarget = Math.round(
      Math.min(Math.max(derivedConfidence ?? 0, 0), 1) * 100
    );

    setPredictionData(data);
    setPredictionsMap(predictions);
    setPositiveFindings(positive);

    setModelConfidenceMap((previous) => ({
      ...previous,
      [activeModelId]: confidencePercentTarget,
    }));
    setCurrentTarget(confidencePercentTarget);
    setProgressPercent(0);
    setIsSimulating(true);

    updateUploadData({
      file,
      fileName,
      originalImage,
      previewUrl: uploadData.previewUrl ?? originalImage,
      predictions,
      positiveFindings: positive,
      predictionSummary: summary,
      topFinding: leadingFinding,
      confidence: derivedConfidence,
      disease: leadingFinding
        ? findDiseaseByName(leadingFinding) ?? initialDisease
        : initialDisease,
      heatmapImage: null,
      heatmapMethod: null,
      heatmapLayer: null,
      heatmapTopDisease: null,
      heatmapTopProbability: null,
      modelKey: activeModelId,
      modelDisplayName: resolveModelLabel(activeModelId),
    });
  }, [
    activeModelId,
    file,
    fileName,
    initialConfidence,
    initialDisease,
    modelStates,
    originalImage,
    updateUploadData,
    uploadData.previewUrl,
  ]);
  const sortedFindings = useMemo(
    () => getTopFindings(positiveFindings, predictionsMap),
    [positiveFindings, predictionsMap]
  );

  useEffect(() => {
    if (!isSimulating || currentTarget == null || !activeModelId) {
      return undefined;
    }

    let frameId;
    let startTimestamp;

    const animate = (timestamp) => {
      if (!startTimestamp) {
        startTimestamp = timestamp;
      }

      const elapsed = timestamp - startTimestamp;
      const rawProgress = (elapsed / progressDurationMs) * currentTarget;
      const cappedProgress = Math.min(currentTarget, rawProgress);

      setProgressPercent(cappedProgress);

      if (elapsed < progressDurationMs) {
        frameId = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setProgressPercent(currentTarget);
        setModelConfidenceMap((prev) => ({
          ...prev,
          [activeModelId]: currentTarget,
        }));
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isSimulating, currentTarget, activeModelId]);

  const topFinding = sortedFindings[0];

  const confidenceScore = useMemo(() => {
    if (predictionData?.confidence != null) {
      return predictionData.confidence;
    }

    if (topFinding?.probability != null) {
      return topFinding.probability;
    }

    return initialConfidence;
  }, [predictionData, topFinding, initialConfidence]);

  const disease = useMemo(() => {
    if (topFinding?.disease) {
      return findDiseaseByName(topFinding.disease);
    }
    if (initialDisease) {
      return initialDisease;
    }
    return defaultDisease;
  }, [initialDisease, topFinding]);

  const confidenceTargets = useMemo(() => {
    const mapping = {};

    MODEL_KEYS.forEach((modelKey) => {
      const state = modelStates[modelKey];
      if (!state || state.status !== "success") {
        return;
      }

      const data = state.data ?? null;
      if (!data) {
        return;
      }

      const positive = Array.isArray(data?.positive_findings)
        ? data.positive_findings
        : [];
      const summary = getTopFindings(positive, data?.predictions);
      const primaryConfidence =
        typeof data?.confidence === "number"
          ? data.confidence
          : typeof summary[0]?.probability === "number"
          ? summary[0].probability
          : null;

      if (typeof primaryConfidence === "number") {
        mapping[modelKey] = Math.round(
          Math.min(Math.max(primaryConfidence, 0), 1) * 100
        );
      }
    });

    return mapping;
  }, [modelStates]);

  const modelHighlights = useMemo(() => {
    const highlights = {};

    MODEL_KEYS.forEach((modelKey) => {
      const state = modelStates[modelKey];
      if (!state || state.status !== "success") {
        return;
      }

      const data = state.data ?? null;
      if (!data) {
        return;
      }

      const positive = Array.isArray(data?.positive_findings)
        ? data.positive_findings
        : [];
      const summary = getTopFindings(positive, data?.predictions);
      if (summary.length > 0) {
        highlights[modelKey] = summary[0];
      }
    });

    return highlights;
  }, [modelStates]);

  const activeHighlight = useMemo(() => {
    if (!activeModelId) {
      return null;
    }

    const highlight = modelHighlights[activeModelId];
    if (!highlight) {
      return null;
    }

    const label = highlight.disease?.replace(/_/g, " ") ?? null;
    const probability =
      typeof highlight.probability === "number"
        ? Math.round(Math.min(Math.max(highlight.probability, 0), 1) * 100)
        : null;

    return {
      label,
      probability,
    };
  }, [activeModelId, modelHighlights]);

  const activeModel = useMemo(
    () => modelOptions.find((option) => option.id === activeModelId) ?? null,
    [activeModelId]
  );

  const currentProgressValue = useMemo(() => {
    if (isSimulating) {
      return progressPercent;
    }
    if (activeModelId && modelConfidenceMap[activeModelId] != null) {
      return modelConfidenceMap[activeModelId];
    }
    return 0;
  }, [isSimulating, progressPercent, activeModelId, modelConfidenceMap]);

  const filledSegmentCount = useMemo(() => {
    const ratio = Math.min(Math.max(currentProgressValue / 100, 0), 1);
    return Math.round(ratio * progressSegments);
  }, [currentProgressValue]);

  const displayPercent = Math.round(currentProgressValue);

  const baselineKey = MODEL_KEYS[0];
  const baselineConfidence = confidenceTargets[baselineKey] ?? 0;
  const baselineLabel =
    MODEL_LIST.find((model) => model.id === baselineKey)?.label ??
    resolveModelLabel(baselineKey);
  const deltaAgainstBaseline = activeModelId
    ? Math.round(
        (modelConfidenceMap[activeModelId] ?? currentProgressValue) -
          baselineConfidence
      )
    : 0;

  const deltaDescriptor =
    deltaAgainstBaseline > 0
      ? `↑ ${Math.abs(deltaAgainstBaseline)}%`
      : deltaAgainstBaseline < 0
      ? `↓ ${Math.abs(deltaAgainstBaseline)}%`
      : "—";

  const deltaToneClass =
    deltaAgainstBaseline > 0
      ? "text-emerald-300"
      : deltaAgainstBaseline < 0
      ? "text-rose-300"
      : "text-white/60";

  const comparisonDataset = useMemo(() => {
    const modelPredictionMaps = {};

    MODEL_KEYS.forEach((modelKey) => {
      const state = modelStates[modelKey];
      if (state?.status === "success" && state.data?.predictions) {
        modelPredictionMaps[modelKey] = state.data.predictions;
      }
    });

    const seedKey = modelPredictionMaps[activeModelId]
      ? activeModelId
      : MODEL_KEYS.find((key) => modelPredictionMaps[key]) ?? null;

    if (!seedKey) {
      return [];
    }

    const diseaseSet = new Set();

    const addTopDiseases = (predictionMap, limit) => {
      Object.entries(predictionMap ?? {})
        .filter(([, probability]) => typeof probability === "number")
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .forEach(([diseaseName]) => {
          diseaseSet.add(diseaseName);
        });
    };

    addTopDiseases(modelPredictionMaps[seedKey], 6);
    MODEL_KEYS.forEach((modelKey) => {
      if (modelKey === seedKey) {
        return;
      }
      const map = modelPredictionMaps[modelKey];
      if (map) {
        addTopDiseases(map, 3);
      }
    });

    const rankingSource = modelPredictionMaps[seedKey] ?? {};
    const diseaseList = Array.from(diseaseSet).sort(
      (a, b) => (rankingSource[b] ?? 0) - (rankingSource[a] ?? 0)
    );

    return diseaseList.slice(0, 5).map((diseaseName) => {
      const entry = { label: diseaseName };

      MODEL_KEYS.forEach((modelKey) => {
        const rawScore = modelPredictionMaps[modelKey]?.[diseaseName];
        entry[modelKey] = Math.round(
          Math.min(Math.max(rawScore ?? 0, 0), 1) * 100
        );
      });

      return entry;
    });
  }, [activeModelId, modelStates]);

  const hasComparisonData = comparisonDataset.length > 0;

  const chartDataset = useMemo(() => {
    if (comparisonDataset.length > 0) {
      return comparisonDataset;
    }

    const placeholder = { label: "Awaiting data" };
    MODEL_KEYS.forEach((modelKey) => {
      placeholder[modelKey] = 0;
    });
    return [placeholder];
  }, [comparisonDataset]);

  const tableDataset = hasComparisonData ? comparisonDataset : chartDataset;

  const requestedComparisonIndex =
    chartHoverIndex != null ? chartHoverIndex : activeComparisonIndex;

  const chartFocusIndex = Math.min(
    Math.max(requestedComparisonIndex, 0),
    Math.max(chartDataset.length - 1, 0)
  );

  const effectiveComparisonIndex = hasComparisonData
    ? Math.min(
        Math.max(requestedComparisonIndex, 0),
        comparisonDataset.length - 1
      )
    : -1;

  const effectiveComparisonEntry =
    effectiveComparisonIndex >= 0
      ? comparisonDataset[effectiveComparisonIndex] ?? null
      : null;

  const visibleChartModels = useMemo(() => {
    if (chartView === "both") {
      return MODEL_LIST;
    }
    const matched = MODEL_LIST.filter((model) => model.id === chartView);
    if (matched.length > 0) {
      return matched;
    }
    return MODEL_LIST;
  }, [chartView]);

  const chartButtons = useMemo(
    () => [
      { id: "both", label: "Both" },
      ...MODEL_LIST.map((model) => ({
        id: model.id,
        label: model.label,
      })),
    ],
    []
  );

  const modelAverages = useMemo(() => {
    if (comparisonDataset.length === 0) {
      return {};
    }

    return visibleChartModels.reduce((accumulator, model) => {
      const total = comparisonDataset.reduce(
        (sum, item) => sum + (item[model.id] ?? 0),
        0
      );
      accumulator[model.id] =
        comparisonDataset.length > 0 ? total / comparisonDataset.length : 0;
      return accumulator;
    }, {});
  }, [comparisonDataset, visibleChartModels]);

  const combinedAverage = useMemo(() => {
    if (comparisonDataset.length === 0 || visibleChartModels.length === 0) {
      return 0;
    }

    const total = comparisonDataset.reduce((sum, item) => {
      const rowAverage =
        visibleChartModels.reduce(
          (rowSum, model) => rowSum + (item[model.id] ?? 0),
          0
        ) / visibleChartModels.length;
      return sum + rowAverage;
    }, 0);

    return total / comparisonDataset.length;
  }, [comparisonDataset, visibleChartModels]);

  const effectivePeakValue = effectiveComparisonEntry
    ? Math.max(
        ...visibleChartModels.map(
          (model) => effectiveComparisonEntry[model.id] ?? 0
        )
      )
    : 0;

  const dominantModel =
    visibleChartModels.length >= 1 && effectiveComparisonEntry
      ? visibleChartModels.reduce((winner, model) => {
          const value = effectiveComparisonEntry[model.id] ?? 0;
          if (!winner || value > winner.value) {
            return { id: model.id, label: model.label, value };
          }
          return winner;
        }, null)
      : null;

  const modelSpread =
    visibleChartModels.length >= 2 && effectiveComparisonEntry
      ? (effectiveComparisonEntry[visibleChartModels[0].id] ?? 0) -
        (effectiveComparisonEntry[visibleChartModels[1].id] ?? 0)
      : 0;

  const summaryCards = useMemo(() => {
    if (comparisonDataset.length === 0) {
      return [];
    }

    const cards = [];
    const spreadMagnitude = Math.abs(modelSpread);
    const activeLabel = effectiveComparisonEntry
      ? effectiveComparisonEntry.label.replace(/_/g, " ")
      : "No selection";

    cards.push({
      id: "active",
      title: "Active condition",
      primary: activeLabel,
      secondary:
        effectivePeakValue > 0
          ? `Peak ${Math.round(effectivePeakValue)}%`
          : "Awaiting predictions",
      tone: effectivePeakValue >= 65 ? "positive" : "neutral",
    });

    cards.push({
      id: "combined",
      title: "Combined average",
      primary: `${Math.round(combinedAverage)}%`,
      secondary: `Across top ${comparisonDataset.length} classes`,
      tone: combinedAverage >= 55 ? "positive" : "neutral",
    });

    visibleChartModels.forEach((model) => {
      const style = MODEL_STYLES[model.id] ?? {};
      cards.push({
        id: `model-${model.id}`,
        title: model.label,
        primary: `${Math.round(modelAverages[model.id] ?? 0)}%`,
        secondary: "Average confidence",
        accentClass: style.tagTone ?? "text-cyan-200",
      });
    });

    if (visibleChartModels.length >= 2) {
      const spreadTone =
        spreadMagnitude < 2
          ? "neutral"
          : modelSpread > 0
          ? "positive"
          : "negative";

      const leaderLabel =
        spreadMagnitude < 0.5 || !dominantModel
          ? "Models aligned"
          : `${dominantModel.label.split(" ")[0]} ahead`;

      cards.push({
        id: "spread",
        title: "Model spread",
        primary: `${spreadMagnitude.toFixed(1)} pts`,
        secondary: leaderLabel,
        tone: spreadTone,
      });
    }

    return cards.slice(0, 5);
  }, [
    combinedAverage,
    comparisonDataset.length,
    dominantModel,
    effectiveComparisonEntry,
    effectivePeakValue,
    modelAverages,
    modelSpread,
    visibleChartModels,
  ]);

  const lineChartConfig = useMemo(() => {
    if (chartDataset.length === 0) {
      return null;
    }

    const labels = chartDataset.map((item) => item.label.replace(/_/g, " "));

    const maxValue = Math.max(
      100,
      ...chartDataset.flatMap((item) =>
        visibleChartModels.map((model) => item[model.id] ?? 0)
      )
    );

    const viewWidth = 820;
    const viewHeight = 320;
    const margin = { top: 38, right: 40, bottom: 56, left: 64 };
    const plotWidth = viewWidth - margin.left - margin.right;
    const plotHeight = viewHeight - margin.top - margin.bottom;
    const denominator = Math.max(labels.length - 1, 1);

    const xPositions = labels.map(
      (_, index) => margin.left + (plotWidth * index) / denominator
    );
    const xPercents = labels.map((_, index) =>
      denominator === 0 ? 0.5 : index / denominator
    );

    const lines = visibleChartModels.map((model) => {
      const style = MODEL_STYLES[model.id] ?? {};
      const lineColor = style.lineColor ?? "#38bdf8";
      const areaColor = style.areaColor ?? "rgba(56,189,248,0.22)";
      const points = labels.map((label, index) => {
        const clamped = Math.max(
          0,
          Math.min(chartDataset[index]?.[model.id] ?? 0, maxValue)
        );
        const y =
          margin.top +
          plotHeight * (1 - clamped / (maxValue === 0 ? 1 : maxValue));
        return { x: xPositions[index], y, value: Math.round(clamped), label };
      });

      const linePath =
        points.length > 0
          ? points
              .map(
                (point, pointIndex) =>
                  `${pointIndex === 0 ? "M" : "L"}${point.x},${point.y.toFixed(
                    2
                  )}`
              )
              .join(" ")
          : "";

      const areaPath =
        points.length > 0
          ? [
              `M${points[0].x},${margin.top + plotHeight}`,
              ...points.map((point) => `L${point.x},${point.y}`),
              `L${points[points.length - 1].x},${margin.top + plotHeight}`,
              "Z",
            ].join(" ")
          : "";

      return { model, lineColor, areaColor, points, linePath, areaPath };
    });

    const yTicks = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i += 1) {
      const value = Math.round((maxValue / tickCount) * i);
      const y =
        margin.top + plotHeight * (1 - value / (maxValue === 0 ? 1 : maxValue));
      yTicks.push({ value, y });
    }

    return {
      viewBox: `0 0 ${viewWidth} ${viewHeight}`,
      width: viewWidth,
      height: viewHeight,
      margin,
      plotWidth,
      plotHeight,
      labels,
      xPositions,
      xPercents,
      lines,
      yTicks,
      maxValue,
    };
  }, [chartDataset, visibleChartModels]);

  useEffect(() => {
    setModelConfidenceMap((previous) => {
      if (!previous || typeof previous !== "object") {
        return { ...confidenceTargets };
      }

      let hasChanges = false;
      const next = { ...previous };

      Object.entries(confidenceTargets).forEach(([key, value]) => {
        if (value != null && next[key] !== value) {
          next[key] = value;
          hasChanges = true;
        }
      });

      Object.keys(next).forEach((key) => {
        if (!(key in confidenceTargets)) {
          delete next[key];
          hasChanges = true;
        }
      });

      return hasChanges ? next : previous;
    });
  }, [confidenceTargets]);

  const smoothTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] };
  const effectiveHeatmap = heatmapImage ?? originalImage;

  const definition =
    disease.definition ??
    disease.description ??
    "No supporting definition provided.";
  const causesList =
    Array.isArray(disease.causes) && disease.causes.length > 0
      ? disease.causes
      : disease.cause
      ? [disease.cause]
      : ["No documented risk factors supplied for this finding."];

  const triggerNavigation = (callback) => {
    if (isTransitioning) {
      return;
    }
    pendingNavigation.current = callback;
    setIsTransitioning(true);
  };

  const handleNavigation = (path) => {
    const navigationModelKey = resolveModelKey(
      uploadData.modelKey ?? predictionData?.model_used ?? requestModelKey
    );
    const navigationModelLabel =
      uploadData.modelDisplayName ??
      resolveModelLabel(
        predictionData?.model_used ?? navigationModelKey ?? fallbackModelLabel
      );
    triggerNavigation(() =>
      navigate(path, {
        state: {
          originalImage,
          heatmapImage: effectiveHeatmap,
          disease,
          confidence: confidenceScore,
          fileName,
          file,
          predictions: predictionsMap ?? predictionData?.predictions,
          positiveFindings,
          predictionSummary: sortedFindings,
          topFinding: topFinding?.disease ?? disease?.name,
          modelKey: navigationModelKey,
          modelDisplayName: navigationModelLabel,
          heatmapMethod: uploadData.heatmapMethod ?? null,
          heatmapLayer: uploadData.heatmapLayer ?? null,
          heatmapTopDisease: uploadData.heatmapTopDisease ?? null,
          heatmapTopProbability: uploadData.heatmapTopProbability ?? null,
        },
      })
    );
  };

  const handleReload = () => {
    triggerNavigation(() => window.location.reload());
  };

  const handleModelSelect = useCallback(
    (modelId) => {
      if (activeModelId === modelId) {
        const cachedPercent = modelConfidenceMap[modelId] ?? 0;
        setCurrentTarget(cachedPercent);
        setProgressPercent(0);
        setIsSimulating(true);
        return;
      }

      setActiveModelId(modelId);

      const state = modelStates[modelId];
      if (!state || state.status !== "success") {
        loadModelPrediction(modelId);
      }
    },
    [activeModelId, loadModelPrediction, modelConfidenceMap, modelStates]
  );

  const handleChartViewChange = useCallback((view) => {
    if (view !== "both" && !MODEL_KEYS.includes(view)) {
      return;
    }
    setChartView(view);
  }, []);

  const handleOpenPreview = useCallback(() => {
    if (!originalImage) {
      return;
    }
    setIsPreviewOpen(true);
  }, [originalImage]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  if (!file) {
    return null;
  }

  const chartViewport = {
    ...slideBlurViewport,
    amount: 0.2,
  };

  const revealProps = {
    variants: slideBlurVariants,
    initial: "hidden",
    whileInView: "visible",
    viewport: slideBlurViewport,
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator className="right-3 sm:right-4 md:right-8 lg:right-12" />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,92,255,0.45),rgba(3,10,28,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(2,8,22,0.95),#020713)]" />
        <div
          className="absolute -top-40 -left-24 rounded-full bg-linear-to-br from-[#1b3bff]/70 via-[#4a6bff]/60 to-transparent blur-3xl opacity-70"
          style={{ width: "30rem", height: "30rem" }}
        />
        <div
          className="absolute bottom-0 -right-48 rounded-full bg-linear-to-tl from-[#041e5e]/80 via-[#1c2d73]/65 to-transparent blur-3xl opacity-90"
          style={{ width: "42rem", height: "42rem" }}
        />
      </div>
      <BackgroundGrid className="z-10 opacity-20" />

      <motion.div
        className="pointer-events-none absolute inset-0 z-20 backdrop-blur-[1.5px]"
        style={entryOverlayStyle}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence>
        {isTransitioning ? (
          <motion.div
            key="predict-exit-overlay"
            className="pointer-events-auto absolute inset-0 z-30 backdrop-blur-[1.5px]"
            style={exitOverlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.38 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
            onAnimationComplete={() => {
              const pending = pendingNavigation.current;
              if (pending) {
                pendingNavigation.current = null;
                pending();
                return;
              }
              setIsTransitioning(false);
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-24 pt-10 sm:px-8">
        <header className="px-6 pt-8 sm:px-10">
          <PrimaryNav onNavigate={handleNavigation} maxWidthClass="max-w-5xl" />
        </header>

        <main className="flex-1">
          <motion.section
            {...revealProps}
            custom={0}
            className="mx-auto w-full max-w-6xl px-6 pt-16 text-center sm:px-16 lg:px-20"
          >
            <motion.h1
              variants={slideBlurVariants}
              custom={0.05}
              className="text-5xl font-semibold tracking-tight sm:text-[3.2rem]"
            >
              <span className={heroGradientClass}>Diagnostic Workspace</span>
            </motion.h1>
            <motion.p
              variants={slideBlurVariants}
              custom={0.12}
              className="mt-6 text-base font-medium text-white/70 sm:text-lg"
            >
              Upload an image and pick a model to review predictions instantly.
            </motion.p>
            {isLoading ? (
              <motion.p
                variants={slideBlurVariants}
                custom={0.18}
                className="mt-4 text-sm font-medium text-cyan-200/90"
              >
                Processing image with Clarity AI&hellip;
              </motion.p>
            ) : null}
            {apiError ? (
              <motion.p
                variants={slideBlurVariants}
                custom={0.2}
                className="mt-4 text-sm font-medium text-rose-300"
              >
                {apiError}
              </motion.p>
            ) : null}
          </motion.section>

          <div className="mx-auto mt-10 grid w-full max-w-7xl items-start gap-10 px-6 sm:mt-12 sm:px-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <motion.section
              {...revealProps}
              custom={0.05}
              className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 px-10 py-12 shadow-[0_65px_150px_-70px_rgba(37,99,235,0.55)] backdrop-blur-2xl sm:px-12"
            >
              <motion.div
                variants={slideBlurVariants}
                custom={0.08}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.32em] text-cyan-200">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Uploaded Study
                </div>
                <span className="text-xs text-white/55 sm:text-sm">
                  {fileName}
                </span>
              </motion.div>
              <div className="group relative mt-6 flex w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/8 bg-[#020916]/90 shadow-[0_60px_140px_-80px_rgba(15,118,255,0.6)]">
                <motion.img
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...smoothTransition, delay: 0.08 }}
                  src={originalImage}
                  alt="Uploaded radiograph"
                  className="w-full object-contain"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-semibold text-white opacity-0 backdrop-blur-[0px] transition group-hover:opacity-100 group-hover:bg-black/40 group-hover:backdrop-blur-[2px]"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white shadow-[0_18px_45px_-28px_rgba(59,130,246,0.9)]">
                    Preview
                  </span>
                </button>
              </div>
              <motion.div
                variants={slideBlurVariants}
                custom={0.18}
                className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/55 sm:text-sm"
              >
                <span className="truncate text-white/60">{fileName}</span>
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="inline-flex items-center gap-2 text-cyan-200/85 transition hover:text-cyan-100"
                >
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
                      d="M4.5 12c1.5-3 4.5-5 7.5-5s6 2 7.5 5c-1.5 3-4.5 5-7.5 5s-6-2-7.5-5Zm7.5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                    />
                  </svg>
                  Open preview
                </button>
              </motion.div>
              {activeHighlight ? (
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.22}
                  className="mt-6 rounded-[22px] border border-white/10 bg-[#07132a]/80 px-5 py-4 text-left shadow-[0_35px_90px_-60px_rgba(37,99,235,0.45)]"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/45">
                    Current top class
                  </p>
                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white/90 sm:text-xl">
                      {activeHighlight.label ?? "Pending"}
                    </h3>
                    <span className="text-2xl font-semibold text-cyan-200">
                      {activeHighlight.probability != null
                        ? `${activeHighlight.probability}%`
                        : "--"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/55 sm:text-sm">
                    Updated when you switch models.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.22}
                  className="mt-6 rounded-[22px] border border-white/10 bg-[#07132a]/60 px-5 py-4 text-left text-sm text-white/55 shadow-[0_35px_90px_-60px_rgba(37,99,235,0.35)]"
                >
                  Run a model to surface the leading class and confidence.
                </motion.div>
              )}
            </motion.section>

            <div className="flex flex-col gap-8">
              <motion.section
                {...revealProps}
                custom={0.1}
                className="rounded-[34px] border border-white/10 bg-white/5 px-10 py-12 shadow-[0_70px_150px_-80px_rgba(14,116,233,0.55)] backdrop-blur-2xl sm:px-12"
              >
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.12}
                  className="flex flex-wrap items-start justify-between gap-3"
                >
                  <div>
                    <h2 className="text-lg font-semibold sm:text-2xl">
                      <span className={heroGradientClass}>Model selector</span>
                    </h2>
                    <p className="mt-4 max-w-sm text-sm italic text-white/65">
                      Run a simulation pass to see how each network calibrates
                      confidence for this upload.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                    {modelCountLabel}
                  </span>
                </motion.div>
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.16}
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                >
                  {modelOptions.map((option, index) => {
                    const isActive = activeModelId === option.id;
                    const state = modelStates[option.id];
                    const status = state?.status ?? null;
                    const hasResult = status === "success";
                    const isLoadingModel = status === "loading";
                    const isDisabled =
                      isSimulating && !isActive && isLoadingModel;
                    const buttonDelay = 0.18 + index * 0.05;
                    const style = MODEL_STYLES[option.id] ?? {
                      dotClass: "bg-cyan-300",
                      borderClass: "border-white/10",
                      backgroundClass: "bg-white/5",
                      gradientClass:
                        "bg-linear-to-r from-cyan-200/80 via-cyan-300/80 to-blue-500/85",
                      tagTone: "text-cyan-200",
                    };
                    const highlight = modelHighlights[option.id] ?? null;
                    const highlightLabel = highlight?.disease
                      ? highlight.disease.replace(/_/g, " ")
                      : null;
                    const highlightPercent = highlight?.probability
                      ? Math.round(
                          Math.min(Math.max(highlight.probability ?? 0, 0), 1) *
                            100
                        )
                      : null;
                    const confidenceValue = hasResult
                      ? Math.round(
                          modelConfidenceMap[option.id] ??
                            confidenceTargets[option.id] ??
                            (typeof state?.data?.confidence === "number"
                              ? Math.min(
                                  Math.max(state.data.confidence, 0),
                                  1
                                ) * 100
                              : 0)
                        )
                      : 0;

                    const statusLabel = (() => {
                      if (isLoadingModel) {
                        return "Loading...";
                      }
                      if (hasResult) {
                        return `${confidenceValue}%`;
                      }
                      return "Run";
                    })();

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleModelSelect(option.id)}
                        whileTap={{ scale: 0.98 }}
                        {...revealProps}
                        custom={buttonDelay}
                        className={`relative flex h-full flex-col gap-5 rounded-[28px] border px-6 py-7 text-left transition ${
                          isActive
                            ? "border-cyan-300/60 bg-[#081632]/95 shadow-[0_50px_120px_-70px_rgba(14,165,233,0.55)]"
                            : "border-white/10 bg-white/5 hover:border-cyan-200/40 hover:bg-white/10"
                        } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-2.5 text-[0.65rem] uppercase tracking-[0.32em] text-white/55">
                          {option.badges.map((badge) => (
                            <span
                              key={`${option.id}-${badge}`}
                              className={`rounded-full border border-white/12 px-3 py-1 text-[0.6rem] font-semibold ${
                                isActive
                                  ? "bg-white/10 text-cyan-200"
                                  : "bg-white/5 text-white/60"
                              }`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white/90">
                            {option.label}
                          </h3>
                          {!hasResult ? (
                            <p className="mt-2 text-sm text-white/70">
                              Select to run predictions.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/55">
                          <span className={style.tagTone ?? "text-white/60"}>
                            {option.footnote}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              hasResult
                                ? style.tagTone ?? "text-cyan-200"
                                : "text-white/45"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl border px-4 py-3 text-xs text-white/70 ${
                            style.borderClass ?? "border-white/10"
                          } ${style.backgroundClass ?? "bg-white/5"}`}
                        >
                          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                            Top Class
                          </p>
                          {isLoadingModel ? (
                            <p className="mt-2 text-sm text-white/60">
                              Generating predictions...
                            </p>
                          ) : hasResult && highlightLabel ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm font-semibold text-white/90">
                                {highlightLabel}
                              </p>
                              <p className="text-xs text-white/60">
                                {highlightPercent != null
                                  ? `${highlightPercent}% confidence`
                                  : "Confidence unavailable"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-white/55">
                              Run inference to reveal the leading class.
                            </p>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.section>

              <motion.section
                {...revealProps}
                custom={0.16}
                className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#080f24]/90 px-10 py-12 shadow-[0_80px_160px_-75px_rgba(56,189,248,0.5)] backdrop-blur-2xl sm:px-12"
              >
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.18}
                  className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-white/50"
                >
                  <span className="rounded-full border border-white/10 px-3 py-1 text-white/50">
                    dev
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-white/50">
                    back-end
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-white/50">
                    architecture
                  </span>
                </motion.div>
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.2}
                  className="mt-5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="text-2xl font-semibold sm:text-3xl">
                      <span className={heroGradientClass}>
                        Confidence timeline
                      </span>
                    </h3>
                  </div>
                  <span className={`text-sm font-semibold ${deltaToneClass}`}>
                    {deltaDescriptor} &nbsp; vs {baselineLabel} baseline
                  </span>
                </motion.div>
                <motion.p
                  variants={slideBlurVariants}
                  custom={0.24}
                  className="mt-4 text-sm italic text-white/65 sm:text-base"
                >
                  {activeModel
                    ? isSimulating
                      ? `${activeModel.label} is calibrating this input in real-time.`
                      : `${activeModel.label} resolved at ${displayPercent}% confidence.`
                    : "Select a model to stream the simulated inference."}
                </motion.p>
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.28}
                  className="mt-6 flex flex-wrap items-end gap-4"
                >
                  <span className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                    {displayPercent}%
                  </span>
                  <div className="flex flex-col text-xs text-white/55">
                    <span>
                      {activeModel ? activeModel.label : "Awaiting selection"}
                    </span>
                    <span>
                      Runtime &bull; {progressDurationMs / 1000}s sweep
                    </span>
                  </div>
                </motion.div>
                <div className="mt-8 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  {Array.from({ length: progressSegments }).map((_, index) => (
                    <span
                      key={`progress-segment-${index}`}
                      className={`h-6 flex-1 rounded-md transition ${
                        index < filledSegmentCount
                          ? "bg-linear-to-b from-cyan-200/80 via-cyan-300/80 to-blue-500/80 shadow-[0_12px_45px_-25px_rgba(59,130,246,0.85)]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.32}
                  className="mt-5 flex items-center justify-between text-xs text-white/55 sm:text-sm"
                >
                  <span>{isSimulating ? "Calibrating" : "Complete"}</span>
                  <span className="text-white/65">
                    {activeModel
                      ? `Anchored to ${activeModel.label}`
                      : "Pick a model to start"}
                  </span>
                </motion.div>
              </motion.section>
            </div>
          </div>

          <motion.section
            {...revealProps}
            viewport={chartViewport}
            custom={0.22}
            className="mx-auto mt-14 w-full max-w-7xl px-6 sm:px-16"
          >
            <motion.div
              variants={slideBlurVariants}
              custom={0.24}
              className="overflow-hidden rounded-4xl border border-white/10 bg-white/5 px-10 py-12 shadow-[0_70px_160px_-80px_rgba(15,118,255,0.55)] backdrop-blur-2xl sm:px-14"
            >
              <motion.div
                variants={slideBlurVariants}
                custom={0.26}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h2 className="text-2xl font-semibold sm:text-[2rem]">
                    <span className={heroGradientClass}>
                      Model comparison funnel
                    </span>
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm italic text-white/65 sm:text-base">
                    Hover the rows or funnel layers to inspect how each
                    architecture ranks the top five suspected conditions. Toggle
                    between individual or combined views to isolate behaviour.
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-white/12 bg-white/10 p-1 text-xs font-semibold text-white/60">
                  {chartButtons.map((button) => (
                    <button
                      key={button.id}
                      type="button"
                      onClick={() => handleChartViewChange(button.id)}
                      className={`rounded-full px-4 py-1 transition ${
                        chartView === button.id
                          ? "bg-[#08142b]/90 text-cyan-200 shadow-[0_0_25px_-10px_rgba(56,189,248,0.7)]"
                          : "text-white/55 hover:text-white/80"
                      }`}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </motion.div>
              <motion.div
                variants={slideBlurVariants}
                custom={0.3}
                className="mt-8 rounded-[40px] border border-white/10 bg-[#060f23]/85 px-8 py-10 shadow-[0_70px_180px_-90px_rgba(37,99,235,0.55)]"
              >
                {!hasComparisonData ? (
                  <p className="text-sm text-white/55">
                    Run inference to populate the model comparison graph.
                  </p>
                ) : null}

                {summaryCards.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {summaryCards.map((card) => {
                      const toneClass =
                        card.accentClass ??
                        (card.tone === "positive"
                          ? "text-emerald-300"
                          : card.tone === "negative"
                          ? "text-rose-300"
                          : "text-white");
                      const glowClass =
                        card.tone === "positive"
                          ? "shadow-[0_40px_120px_-90px_rgba(16,185,129,0.6)]"
                          : card.tone === "negative"
                          ? "shadow-[0_40px_120px_-90px_rgba(239,68,68,0.6)]"
                          : "shadow-[0_35px_110px_-90px_rgba(37,99,235,0.55)]";

                      return (
                        <div
                          key={card.id}
                          className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[#081227]/85 px-5 py-6 backdrop-blur ${glowClass}`}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#13295a_0%,transparent_70%)] opacity-75" />
                          <div className="relative flex flex-col gap-3">
                            <span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/45">
                              {card.title}
                            </span>
                            <span
                              className={`text-2xl font-semibold ${toneClass}`}
                            >
                              {card.primary}
                            </span>
                            <span className="text-sm text-white/60">
                              {card.secondary}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-10">
                  <div className="relative overflow-visible rounded-4xl border border-white/10 bg-[#050b19]/85 px-6 pb-12 pt-8 shadow-[0_70px_160px_-90px_rgba(37,99,235,0.6)]">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-[0.7rem] uppercase tracking-[0.3em] text-white/45">
                        Confidence trajectory
                      </span>
                      <div className="flex flex-wrap items-center gap-5 text-[0.7rem] uppercase tracking-[0.28em] text-white/45">
                        {visibleChartModels.map((model) => {
                          const style = MODEL_STYLES[model.id] ?? {};
                          return (
                            <span
                              key={model.id}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: style.lineColor ?? "#38bdf8",
                                }}
                              />
                              {model.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {lineChartConfig ? (
                      <div className="relative">
                        <svg
                          viewBox={lineChartConfig.viewBox}
                          className="h-80 w-full"
                          preserveAspectRatio="none"
                          role="img"
                          aria-label="Model confidence comparison chart"
                          onMouseLeave={() => setChartHoverIndex(null)}
                        >
                          <defs>
                            <linearGradient
                              id="chart-background-gradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="rgba(12,24,52,0.95)"
                              />
                              <stop
                                offset="100%"
                                stopColor="rgba(5,11,25,0.95)"
                              />
                            </linearGradient>
                          </defs>
                          <rect
                            x="0"
                            y="0"
                            width={lineChartConfig.width}
                            height={lineChartConfig.height}
                            fill="url(#chart-background-gradient)"
                          />
                          <g>
                            {lineChartConfig.yTicks.map((tick, index) => (
                              <g key={`y-${index}`}>
                                <line
                                  x1={lineChartConfig.margin.left}
                                  x2={
                                    lineChartConfig.width -
                                    lineChartConfig.margin.right
                                  }
                                  y1={tick.y}
                                  y2={tick.y}
                                  stroke="rgba(148,197,255,0.18)"
                                  strokeDasharray="6 6"
                                />
                                <text
                                  x={lineChartConfig.margin.left - 18}
                                  y={tick.y + 4}
                                  textAnchor="end"
                                  fontSize="12"
                                  fill="rgba(226,232,240,0.55)"
                                >
                                  {tick.value}
                                </text>
                              </g>
                            ))}
                          </g>
                          <line
                            x1={lineChartConfig.margin.left}
                            x2={lineChartConfig.margin.left}
                            y1={lineChartConfig.margin.top}
                            y2={
                              lineChartConfig.height -
                              lineChartConfig.margin.bottom
                            }
                            stroke="rgba(148,197,255,0.28)"
                          />
                          <line
                            x1={lineChartConfig.margin.left}
                            x2={
                              lineChartConfig.width -
                              lineChartConfig.margin.right
                            }
                            y1={
                              lineChartConfig.height -
                              lineChartConfig.margin.bottom
                            }
                            y2={
                              lineChartConfig.height -
                              lineChartConfig.margin.bottom
                            }
                            stroke="rgba(148,197,255,0.28)"
                          />
                          {typeof chartFocusIndex === "number" &&
                          chartFocusIndex >= 0 &&
                          chartFocusIndex <
                            lineChartConfig.xPositions.length ? (
                            <line
                              x1={lineChartConfig.xPositions[chartFocusIndex]}
                              x2={lineChartConfig.xPositions[chartFocusIndex]}
                              y1={lineChartConfig.margin.top - 6}
                              y2={
                                lineChartConfig.height -
                                lineChartConfig.margin.bottom +
                                10
                              }
                              stroke="rgba(148,197,255,0.35)"
                              strokeDasharray="4 6"
                            />
                          ) : null}
                          {lineChartConfig.lines.map((line) => (
                            <g key={`line-${line.model.id}`}>
                              <path
                                d={line.areaPath}
                                fill={line.areaColor}
                                opacity={chartView === "both" ? 0.22 : 0.3}
                              />
                              <path
                                d={line.linePath}
                                fill="none"
                                stroke={line.lineColor}
                                strokeWidth={3.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={chartView === "both" ? 0.9 : 1}
                              />
                              {line.points.map((point, pointIndex) => {
                                const isFocused =
                                  pointIndex === chartFocusIndex;
                                return (
                                  <circle
                                    key={`point-${line.model.id}-${pointIndex}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={isFocused ? 6 : 4}
                                    fill={line.lineColor}
                                    stroke="#0f172a"
                                    strokeWidth={2.2}
                                    className={`transition-transform duration-200 ${
                                      hasComparisonData
                                        ? "cursor-pointer"
                                        : "cursor-default"
                                    }`}
                                    tabIndex={hasComparisonData ? 0 : -1}
                                    onMouseEnter={() => {
                                      if (!hasComparisonData) {
                                        return;
                                      }
                                      setChartHoverIndex(pointIndex);
                                    }}
                                    onFocus={() => {
                                      if (!hasComparisonData) {
                                        return;
                                      }
                                      setChartHoverIndex(pointIndex);
                                    }}
                                    onClick={() => {
                                      if (!hasComparisonData) {
                                        return;
                                      }
                                      setActiveComparisonIndex(pointIndex);
                                      setChartHoverIndex(null);
                                    }}
                                    onKeyDown={(event) => {
                                      if (!hasComparisonData) {
                                        return;
                                      }
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        setActiveComparisonIndex(pointIndex);
                                        setChartHoverIndex(null);
                                      }
                                    }}
                                  />
                                );
                              })}
                            </g>
                          ))}
                          <g>
                            {lineChartConfig.labels.map((label, index) => (
                              <text
                                key={`x-${label}`}
                                x={lineChartConfig.xPositions[index]}
                                y={
                                  lineChartConfig.height -
                                  lineChartConfig.margin.bottom +
                                  28
                                }
                                textAnchor="middle"
                                fontSize="12"
                                fill="rgba(226,232,240,0.65)"
                              >
                                {label}
                              </text>
                            ))}
                          </g>
                        </svg>
                        {hasComparisonData &&
                        effectiveComparisonEntry &&
                        typeof chartFocusIndex === "number" &&
                        chartFocusIndex >= 0 &&
                        chartFocusIndex < lineChartConfig.xPercents.length ? (
                          <div
                            className="pointer-events-none absolute top-4 flex -translate-x-1/2 flex-col gap-2 rounded-3xl border border-white/10 bg-[#0b1737]/90 px-4 py-3 text-xs text-white/70 shadow-[0_25px_60px_-40px_rgba(37,99,235,0.75)] backdrop-blur transition-all duration-200 ease-out transform-gpu will-change-transform"
                            style={{
                              left: `${
                                lineChartConfig.xPercents[chartFocusIndex] * 100
                              }%`,
                            }}
                          >
                            <span className="text-[0.7rem] uppercase tracking-[0.26em] text-white/45">
                              {effectiveComparisonEntry.label.replace(
                                /_/g,
                                " "
                              )}
                            </span>
                            <div className="flex flex-col gap-1 text-sm text-white/75">
                              {visibleChartModels.map((model) => (
                                <span
                                  key={`tooltip-${model.id}`}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{
                                        backgroundColor:
                                          MODEL_STYLES[model.id]?.lineColor ??
                                          "#38bdf8",
                                      }}
                                    />
                                    {model.label}
                                  </span>
                                  <span className="font-semibold">
                                    {Math.round(
                                      effectiveComparisonEntry[model.id] ?? 0
                                    )}
                                    %
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-80 items-center justify-center text-sm text-white/60">
                        Chart unavailable.
                      </div>
                    )}
                    {!hasComparisonData ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#050b19]/55 text-sm font-semibold text-white/70">
                        Awaiting predictions
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-10 overflow-hidden rounded-4xl border border-white/10 bg-[#060f23]/75">
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-4 text-[0.65rem] uppercase tracking-[0.26em] text-white/45">
                      <span className="flex-1">Condition</span>
                      {visibleChartModels.map((model) => (
                        <span
                          key={`header-${model.id}`}
                          className="w-24 text-right"
                        >
                          {model.label.split(" ")[0]}
                        </span>
                      ))}
                      <span className="w-16 text-right">Peak</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {tableDataset.map((item, index) => {
                      const isActive =
                        hasComparisonData && index === effectiveComparisonIndex;
                      const peakValue = Math.max(
                        ...visibleChartModels.map(
                          (model) => item[model.id] ?? 0
                        )
                      );

                      return (
                        <button
                          key={`row-${item.label}`}
                          type="button"
                          onMouseEnter={() => {
                            if (!hasComparisonData) {
                              return;
                            }
                            setChartHoverIndex(index);
                          }}
                          onFocus={() => {
                            if (!hasComparisonData) {
                              return;
                            }
                            setChartHoverIndex(index);
                          }}
                          onMouseLeave={() => setChartHoverIndex(null)}
                          onBlur={() => setChartHoverIndex(null)}
                          onClick={() => {
                            if (!hasComparisonData) {
                              return;
                            }
                            setActiveComparisonIndex(index);
                            setChartHoverIndex(null);
                          }}
                          disabled={!hasComparisonData}
                          className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-all duration-200 ease-out transform-gpu will-change-transform ${
                            isActive
                              ? "bg-white/10 text-white shadow-[0_35px_90px_-80px_rgba(56,189,248,0.6)]"
                              : "text-white/70 hover:bg-white/5 hover:text-white hover:scale-[1.01] hover:shadow-[0_20px_60px_-40px_rgba(56,189,248,0.12)]"
                          } ${
                            hasComparisonData
                              ? ""
                              : "cursor-not-allowed opacity-70"
                          }`}
                        >
                          <span className="flex-1 text-sm font-semibold">
                            {item.label.replace(/_/g, " ")}
                          </span>
                          {visibleChartModels.map((model) => (
                            <span
                              key={`row-${item.label}-${model.id}`}
                              className="w-24 text-right text-sm font-semibold"
                            >
                              {Math.round(item[model.id] ?? 0)}%
                            </span>
                          ))}
                          <span className="w-16 text-right text-sm font-semibold text-white/80">
                            {Math.round(peakValue)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {hasComparisonData && effectiveComparisonEntry ? (
                  <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1633]/80 p-6 text-sm text-white/65 sm:text-base">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-lg font-semibold text-white/85">
                        {effectiveComparisonEntry.label.replace(/_/g, " ")}
                      </h4>
                      <span className="text-sm font-semibold text-cyan-200">
                        Peak{" "}
                        {Math.max(
                          ...visibleChartModels.map(
                            (model) => effectiveComparisonEntry[model.id] ?? 0
                          )
                        )}
                        %
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {visibleChartModels.map((model) => {
                        const value = Math.max(
                          0,
                          Math.min(effectiveComparisonEntry[model.id] ?? 0, 100)
                        );
                        return (
                          <div
                            key={`detail-${model.id}`}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                          >
                            <span className="font-semibold text-white/85">
                              {model.label}
                            </span>
                            <span className="text-sm font-semibold text-white/75">
                              {value}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            {...revealProps}
            custom={0.3}
            className="mx-auto mt-14 w-full max-w-7xl px-6 sm:px-16"
          >
            <motion.div
              variants={slideBlurVariants}
              custom={0.32}
              className="overflow-hidden rounded-[36px] border border-white/10 bg-[#061027]/85 px-10 py-12 shadow-[0_80px_180px_-90px_rgba(59,130,246,0.45)] backdrop-blur-2xl sm:px-14"
            >
              <motion.div
                variants={slideBlurVariants}
                custom={0.34}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200"
              >
                Condition insight
              </motion.div>
              <motion.div
                variants={slideBlurVariants}
                custom={0.36}
                className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="max-w-2xl space-y-5">
                  <h2 className="text-3xl font-semibold sm:text-[2.2rem]">
                    <span className={heroGradientClass}>{disease.name}</span>
                  </h2>
                  <p className="text-base italic text-white/70 sm:text-lg">
                    {definition}
                  </p>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 sm:text-base">
                    <span className="font-semibold text-white/85">
                      Common causes &amp; risk factors
                    </span>
                    <ul className="mt-3 space-y-2">
                      {causesList.map((item, index) => (
                        <li
                          key={`${disease.name}-cause-${index}`}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <motion.div
                  variants={slideBlurVariants}
                  custom={0.4}
                  className="flex flex-col gap-5 text-sm text-white/60 sm:text-base"
                >
                  {disease.wiki ? (
                    <a
                      href={disease.wiki}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-cyan-200 transition hover:text-cyan-100"
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
                          d="M5 12h8M5 16h6M5 8h10M13 4h6l-6 16H7L5 4h8Z"
                        />
                      </svg>
                      Learn more on Wikipedia
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/50">
                      <span className="inline-flex h-2 w-2 rounded-full bg-white/40" />
                      No external reference available
                    </div>
                  )}
                  {sortedFindings.length > 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/65 sm:text-sm">
                      <span className="font-semibold text-white/85">
                        Top model findings
                      </span>
                      <ul className="mt-3 space-y-2">
                        {sortedFindings.slice(0, 3).map((finding) => (
                          <li
                            key={`${finding.disease}-${finding.probability}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate text-white/80">
                              {finding.disease}
                            </span>
                            <span className="text-white/70">
                              {(
                                Math.min(
                                  Math.max(finding.probability ?? 0, 0),
                                  1
                                ) * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-xs text-white/55 sm:text-sm">
                    Generated with Clarity v2.3. Validate alongside clinical
                    judgement. Escalate to radiologist-on-call if symptoms
                    diverge from predicted presentation.
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            {...revealProps}
            custom={0.42}
            className="mt-14 flex flex-wrap justify-center gap-4 px-6 sm:px-12"
          >
            <motion.button
              variants={slideBlurVariants}
              custom={0.44}
              type="button"
              onClick={() => {
                if (!isLoading) {
                  handleNavigation("/gradcam");
                }
              }}
              disabled={isLoading}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">↗</span>
              <span>View Heat Map</span>
              <span className={buttonDotClasses} />
            </motion.button>
            <motion.button
              variants={slideBlurVariants}
              custom={0.48}
              type="button"
              onClick={() => {
                if (!isLoading) {
                  handleNavigation("/report");
                }
              }}
              disabled={isLoading}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⇢</span>
              <span>Report Generation</span>
              <span className={buttonDotClasses} />
            </motion.button>
            <motion.button
              variants={slideBlurVariants}
              custom={0.52}
              type="button"
              onClick={() => triggerNavigation(() => navigate(-1))}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">←</span>
              <span>Back to Upload</span>
              <span className={buttonDotClasses} />
            </motion.button>
            <motion.button
              variants={slideBlurVariants}
              custom={0.56}
              type="button"
              onClick={() => triggerNavigation(() => navigate("/"))}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⌂</span>
              <span>Return Home</span>
              <span className={buttonDotClasses} />
            </motion.button>
          </motion.section>

          <motion.div
            {...revealProps}
            custom={0.6}
            className="mt-6 flex justify-center px-6 sm:px-12"
          >
            <button
              type="button"
              onClick={handleReload}
              className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-5 py-2 text-sm font-medium text-white/80 backdrop-blur-2xl shadow-[0_18px_45px_-30px_rgba(37,99,235,0.8)] transition hover:border-white/20 hover:bg-white/15 hover:text-white"
            >
              <span className="inline-flex items-center rounded-full bg-[#1553f5] px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_30px_-18px_rgba(32,92,255,0.95)] transition group-hover:bg-[#1f61ff]">
                ↻ Reload
              </span>
              <span className="pr-1">Stay on latest data</span>
            </button>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {isPreviewOpen ? (
          <motion.div
            key="study-preview"
            className="fixed inset-0 z-40 flex items-center justify-center bg-[#010510]/85 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.8, 0.5, 1] }}
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.8, 0.5, 1] }}
              className="relative w-[min(92vw,900px)] rounded-3xl border border-white/15 bg-[#020a1a]/95 p-6 shadow-[0_80px_200px_-90px_rgba(37,99,235,0.65)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
              <div className="mt-3 max-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <img
                  src={originalImage}
                  alt="Uploaded radiograph preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ ...smoothTransition, delay: 0.35 }}
      >
        <Footer />
      </motion.div>
    </div>
  );
}

export default PredictPage;
