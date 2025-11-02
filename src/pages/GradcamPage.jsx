import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import { defaultDisease } from "../data/diseases.js";
import { entryOverlayStyle, exitOverlayStyle } from "../styles/transitions.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import PageBackdrop from "../components/ui/PageBackdrop.jsx";
import { usePopup } from "../components/ui/PopupProvider.jsx";
import {
  generateHeatmap,
  getAvailableLayers,
  getAvailableMethods,
} from "../api/clarityApi.js";
import { useUpload } from "../context/UploadContext.jsx";
import {
  DEFAULT_MODEL_KEY,
  resolveModelKey,
  resolveModelLabel,
} from "../utils/modelUtils.js";

const infoCards = [
  {
    title: "What is Grad-CAM?",
    body: "Gradient-weighted Class Activation Mapping projects the weighted gradients from the final convolutional layers back onto the image. The resulting heatmap reveals which anatomical structures amplified the network's logits for a chosen class.",
  },
  {
    title: "Why clinicians value it",
    body: "Saliency focus acts as a visual audit log. When the algorithm highlights the same parenchymal patterns that a radiologist would scrutinise, confidence in automation rises. If it locks onto irrelevant anatomy, the flag prompts manual review before sign-off.",
  },
  {
    title: "Interpretation workflow",
    body: "Overlay heatmaps with quantitative confidence bars: agree, defer, or escalate. Annotated disagreements become labelled feedback, letting the data science team retrain on real-world miss patterns and improve future triage accuracy.",
  },
  {
    title: "Limits to remember",
    body: "Grad-CAM visualises spatial attention, not causality. Dense opacities, overlapping conditions, or adversarial noise can distort the signal. Always correlate the map with the patient history, raw image, and structured predictions.",
  },
];

const smoothTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] };
const DEFAULT_HEATMAP_METHOD = "gradcam";

function GradcamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const { showPopup } = usePopup();
  const { uploadData, updateUploadData } = useUpload();
  const locationState = location.state ?? {};
  const file = locationState.file ?? uploadData.file ?? null;
  const originalImage =
    locationState.originalImage ??
    uploadData.originalImage ??
    uploadData.previewUrl ??
    "/placeholder-xray.png";
  const initialHeatmapImage =
    locationState.heatmapImage ??
    uploadData.heatmapImage ??
    uploadData.previewUrl ??
    originalImage;
  const [heatmapImage, setHeatmapImage] = useState(initialHeatmapImage);
  const disease = locationState.disease ?? uploadData.disease ?? defaultDisease;
  const confidence = locationState.confidence ?? uploadData.confidence ?? 0.82;
  const fileName =
    locationState.fileName ?? uploadData.fileName ?? "Uploaded study";
  const predictions =
    locationState.predictions ?? uploadData.predictions ?? null;
  const positiveFindings =
    locationState.positiveFindings ?? uploadData.positiveFindings ?? [];
  const modelKey = resolveModelKey(
    locationState.modelKey ??
      uploadData.modelKey ??
      uploadData.modelDisplayName ??
      DEFAULT_MODEL_KEY
  );
  const modelLabel = resolveModelLabel(
    locationState.modelDisplayName ?? uploadData.modelDisplayName ?? modelKey
  );
  const defaultMethod =
    locationState.heatmapMethod ??
    uploadData.heatmapMethod ??
    DEFAULT_HEATMAP_METHOD;
  const defaultLayer =
    locationState.heatmapLayer ?? uploadData.heatmapLayer ?? "";
  const [selectedMethod, setSelectedMethod] = useState(
    defaultMethod || DEFAULT_HEATMAP_METHOD
  );
  const [selectedLayer, setSelectedLayer] = useState(defaultLayer || "");
  const [availableMethods, setAvailableMethods] = useState([]);
  const [availableLayers, setAvailableLayers] = useState([]);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState(null);
  const topHeatmapDisease =
    locationState.heatmapTopDisease ?? uploadData.heatmapTopDisease ?? null;
  const topHeatmapProbability =
    locationState.heatmapTopProbability ??
    uploadData.heatmapTopProbability ??
    null;

  const [viewMode, setViewMode] = useState("original");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);

  useEffect(() => {
    if (!file) {
      showPopup({
        title: "Upload required",
        message:
          "Return to the home page and add an image to explore Grad-CAM.",
        variant: "warning",
      });
      navigate("/", { replace: true });
    }
  }, [file, navigate, showPopup]);

  useEffect(() => {
    if (!file) {
      setAvailableMethods([]);
      setAvailableLayers([]);
      return;
    }

    let isActive = true;
    const methodsController = new AbortController();
    const layersController = new AbortController();

    const loadConfiguration = async () => {
      try {
        const [methodsResult, layersResult] = await Promise.allSettled([
          getAvailableMethods(modelKey, {
            signal: methodsController.signal,
          }),
          getAvailableLayers(modelKey, {
            signal: layersController.signal,
          }),
        ]);

        if (!isActive) {
          return;
        }

        if (methodsResult.status === "fulfilled") {
          const methodsPayload = methodsResult.value?.methods;
          const methods = Array.isArray(methodsPayload) ? methodsPayload : [];
          setAvailableMethods(methods);
          setSelectedMethod((current) => {
            const normalized = current || DEFAULT_HEATMAP_METHOD;
            if (methods.length === 0) {
              return normalized;
            }
            if (methods.includes(normalized)) {
              return normalized;
            }
            return methods[0];
          });
        } else if (methodsResult.status === "rejected") {
          console.error("Failed to load heatmap methods", methodsResult.reason);
        }

        if (layersResult.status === "fulfilled") {
          const layersPayload = layersResult.value?.layers;
          const layers = Array.isArray(layersPayload) ? layersPayload : [];
          setAvailableLayers(layers);
          setSelectedLayer((current) => {
            const normalized = current || "";
            if (!normalized) {
              return "";
            }
            if (layers.includes(normalized)) {
              return normalized;
            }
            return "";
          });
        } else if (layersResult.status === "rejected") {
          console.error("Failed to load heatmap layers", layersResult.reason);
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("Failed to load heatmap configuration", error);
      }
    };

    loadConfiguration();

    return () => {
      isActive = false;
      methodsController.abort();
      layersController.abort();
    };
  }, [file, modelKey]);

  useEffect(() => {
    if (!file) {
      return undefined;
    }

    const cachedImage = uploadData.heatmapImage;
    const cachedMethod = uploadData.heatmapMethod;
    const cachedLayer = uploadData.heatmapLayer ?? "";
    const normalizedLayer = selectedLayer || "";

    if (
      cachedImage &&
      cachedMethod &&
      cachedMethod.toLowerCase() ===
        (selectedMethod || DEFAULT_HEATMAP_METHOD).toLowerCase() &&
      cachedLayer === normalizedLayer &&
      uploadData.modelKey === modelKey
    ) {
      setHeatmapImage(cachedImage);
      setHeatmapError(null);
      setIsHeatmapLoading(false);
      return undefined;
    }

    let isActive = true;
    const controller = new AbortController();

    setIsHeatmapLoading(true);
    setHeatmapError(null);

    generateHeatmap(file, {
      model: modelKey,
      method: selectedMethod || DEFAULT_HEATMAP_METHOD,
      layer: normalizedLayer || undefined,
      signal: controller.signal,
    })
      .then((data) => {
        if (!isActive) {
          return;
        }

        if (data?.success === false) {
          throw new Error(data?.message ?? "Heatmap request failed.");
        }

        const rawImage = data?.heatmap_image ?? data?.heatmapImage ?? null;
        const resolvedImage = rawImage
          ? rawImage.startsWith("data:image")
            ? rawImage
            : `data:image/png;base64,${rawImage}`
          : null;
        const resolvedMethod =
          data?.method_used ?? selectedMethod ?? DEFAULT_HEATMAP_METHOD;
        const resolvedLayer = data?.layer_used ?? normalizedLayer ?? "";
        const responseModelKey = resolveModelKey(data?.model_used ?? modelKey);
        const responseModelLabel = resolveModelLabel(
          data?.model_used ?? responseModelKey
        );

        const nextImage =
          resolvedImage ?? cachedImage ?? initialHeatmapImage ?? originalImage;
        setHeatmapImage(nextImage);
        if (resolvedImage) {
          setViewMode("heatmap");
        }
        setSelectedMethod(resolvedMethod);
        setSelectedLayer(resolvedLayer || "");
        updateUploadData({
          heatmapImage:
            resolvedImage ?? cachedImage ?? uploadData.heatmapImage ?? null,
          heatmapMethod: resolvedMethod,
          heatmapLayer: resolvedLayer || "",
          heatmapTopDisease: data?.top_disease ?? topHeatmapDisease ?? null,
          heatmapTopProbability:
            data?.top_probability ?? topHeatmapProbability ?? null,
          modelKey: responseModelKey,
          modelDisplayName: responseModelLabel,
          predictions: data?.predictions ?? predictions ?? null,
          positiveFindings: Array.isArray(data?.positive_findings)
            ? data.positive_findings
            : uploadData.positiveFindings,
        });
        setHeatmapError(null);
      })
      .catch((error) => {
        if (!isActive || error?.name === "AbortError") {
          return;
        }
        console.error("Heatmap generation failed", error);
        setHeatmapError(error.message ?? "Unable to generate heatmap.");
        showPopup({
          title: "Heatmap generation failed",
          message: error.message ?? "Unable to generate heatmap.",
          variant: "danger",
        });
      })
      .finally(() => {
        if (isActive) {
          setIsHeatmapLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    file,
    initialHeatmapImage,
    modelKey,
    predictions,
    selectedLayer,
    selectedMethod,
    showPopup,
    topHeatmapDisease,
    topHeatmapProbability,
    updateUploadData,
    uploadData.heatmapImage,
    uploadData.heatmapLayer,
    uploadData.heatmapMethod,
    uploadData.modelKey,
    uploadData.positiveFindings,
  ]);

  if (!file) {
    return null;
  }

  const confidencePercent = useMemo(
    () => Math.round(Math.min(Math.max(confidence ?? 0, 0), 1) * 100),
    [confidence]
  );
  const topHeatmapPercent = useMemo(() => {
    if (typeof topHeatmapProbability === "number") {
      return Math.round(Math.min(Math.max(topHeatmapProbability, 0), 1) * 100);
    }
    return null;
  }, [topHeatmapProbability]);
  const methodOptionsToRender = useMemo(() => {
    if (availableMethods.length > 0) {
      return availableMethods;
    }
    const fallback = selectedMethod || DEFAULT_HEATMAP_METHOD;
    return fallback ? [fallback] : [DEFAULT_HEATMAP_METHOD];
  }, [availableMethods, selectedMethod]);
  const layerOptionsToRender = useMemo(() => {
    if (availableLayers.length > 0) {
      return availableLayers;
    }
    return selectedLayer ? [selectedLayer] : [];
  }, [availableLayers, selectedLayer]);
  const topPredictionChart = useMemo(() => {
    if (!predictions || typeof predictions !== "object") {
      return [];
    }

    return Object.entries(predictions)
      .filter((entry) => typeof entry[1] === "number")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, probability], index) => {
        const clamped = Math.min(Math.max(probability ?? 0, 0), 1);
        return {
          label,
          probability: clamped,
          percent: Math.round(clamped * 100),
          highlight: index === 0,
        };
      });
  }, [predictions]);

  const effectiveHeatmap = heatmapImage ?? originalImage;
  const isSyntheticHeatmap = !heatmapImage || heatmapImage === originalImage;

  const triggerNavigation = (callback) => {
    if (isTransitioning) {
      return;
    }
    pendingNavigation.current = callback;
    setIsTransitioning(true);
  };

  const handleNavigation = (path) => {
    triggerNavigation(() =>
      navigate(path, {
        state: {
          originalImage,
          heatmapImage: effectiveHeatmap,
          disease,
          confidence,
          fileName,
          file,
          predictions,
          positiveFindings,
          modelKey,
          modelDisplayName: modelLabel,
          heatmapMethod: selectedMethod || DEFAULT_HEATMAP_METHOD,
          heatmapLayer: selectedLayer || "",
          heatmapTopDisease: topHeatmapDisease,
          heatmapTopProbability: topHeatmapProbability,
        },
      })
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator />
      <PageBackdrop variant="gradcam" />
      <BackgroundGrid className="z-10 opacity-50" />

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
            key="gradcam-exit-overlay"
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.1 }}
            className="mx-auto w-full max-w-3xl pt-16 text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.15 }}
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                Grad-CAM Visualization
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.25 }}
              className="mt-5 text-base italic text-white/70 sm:text-xl"
            >
              Grad-CAM highlights the regions in the X-ray where the model
              focuses while predicting the disease.
            </motion.p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.2 }}
            className="mt-14 flex w-full flex-col gap-8 lg:flex-row"
          >
            <div className="flex w-full flex-col gap-6 rounded-[34px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-white/90 sm:text-2xl">
                    Imaging Explorer
                  </h2>
                  <p className="mt-2 text-sm italic text-white/65 sm:text-base">
                    Toggle between the clinician upload and Grad-CAM response
                    for {fileName}.
                  </p>
                </div>
                <LayoutGroup id="gradcam-toggle">
                  <div className="inline-flex items-center rounded-full bg-white/10 p-1">
                    {[
                      { id: "original", label: "Original" },
                      { id: "heatmap", label: "Grad-CAM" },
                    ].map((option) => {
                      const isActive = viewMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setViewMode(option.id)}
                          className={`relative rounded-full px-4 py-2 text-xs font-semibold transition ${
                            isActive
                              ? "text-[#1ccad8]"
                              : "text-white/60 hover:text-white/80"
                          }`}
                        >
                          {isActive ? (
                            <motion.span
                              layoutId="toggle-pill"
                              className="absolute inset-0 rounded-full bg-white/10"
                              transition={{
                                type: "spring",
                                stiffness: 320,
                                damping: 28,
                              }}
                            />
                          ) : null}
                          <span className="relative z-10">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-left text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/50">
                  <span className="text-[0.7rem] tracking-[0.28em] text-white/60">
                    Method
                  </span>
                  <div className="relative">
                    <select
                      value={selectedMethod}
                      onChange={(event) => {
                        setSelectedMethod(event.target.value);
                        setHeatmapError(null);
                      }}
                      disabled={isHeatmapLoading}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-semibold text-white/85 outline-none transition hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {methodOptionsToRender.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 5l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </label>
                <label className="flex flex-col gap-2 text-left text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/50">
                  <span className="text-[0.7rem] tracking-[0.28em] text-white/60">
                    Layer
                  </span>
                  <div className="relative">
                    <select
                      value={selectedLayer}
                      onChange={(event) => {
                        setSelectedLayer(event.target.value);
                        setHeatmapError(null);
                      }}
                      disabled={isHeatmapLoading}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-semibold text-white/85 outline-none transition hover:border-cyan-300/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Auto (recommended)</option>
                      {layerOptionsToRender.map((layer) => (
                        <option key={layer} value={layer}>
                          {layer}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 5l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </label>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-black/60 shadow-[0_50px_110px_-60px_rgba(37,99,235,0.6)]">
                <AnimatePresence mode="wait">
                  {viewMode === "original" ? (
                    <motion.img
                      key="original"
                      src={originalImage}
                      alt="Original chest radiograph"
                      className="h-104 w-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  ) : (
                    <motion.div
                      key="heatmap"
                      className="relative h-104 w-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <img
                        src={effectiveHeatmap}
                        alt="Grad-CAM heatmap"
                        className="h-full w-full object-cover"
                      />
                      {isHeatmapLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-cyan-300" />
                        </div>
                      ) : null}
                      {isSyntheticHeatmap ? (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,70,107,0.55),rgba(56,189,248,0.2),transparent_78%)] mix-blend-screen" />
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {heatmapError ? (
                <p className="text-sm font-medium text-rose-300">
                  {heatmapError}
                </p>
              ) : null}

              <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/60 sm:grid-cols-2 sm:text-sm">
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                    Model
                  </p>
                  <p className="text-sm font-semibold text-white/85">
                    {modelLabel}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                    Method
                  </p>
                  <p className="text-sm font-semibold text-white/85">
                    {selectedMethod || DEFAULT_HEATMAP_METHOD}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                    Layer
                  </p>
                  <p className="text-sm font-semibold text-white/85">
                    {selectedLayer ? selectedLayer : "Auto"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                    Peak Focus
                  </p>
                  <p className="text-sm font-semibold text-white/85">
                    {topHeatmapDisease ? (
                      <span>
                        {topHeatmapDisease}
                        {topHeatmapPercent != null
                          ? ` · ${topHeatmapPercent}%`
                          : ""}
                      </span>
                    ) : (
                      <span>Pending</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.25 }}
              className="flex w-full flex-col gap-6 rounded-[34px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white/90 sm:text-2xl">
                  Model Prediction Graph
                </h2>
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/70">
                  {modelLabel}
                </span>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/40 p-6">
                {topPredictionChart.length ? (
                  <div className="space-y-4">
                    {topPredictionChart.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-[0.28em] text-white/55 sm:text-[0.7rem]">
                          {item.label.replace(/_/g, " ")}
                        </span>
                        <div className="relative flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              item.highlight
                                ? "bg-linear-to-r from-cyan-400 via-sky-500 to-blue-600"
                                : "bg-white/45"
                            }`}
                            style={{ width: `${Math.max(item.percent, 4)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-semibold text-white/75">
                          {item.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-40 items-center justify-center text-sm text-white/60">
                    Predictions will appear after running inference.
                  </div>
                )}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/60 sm:text-sm">
                Current top prediction: {disease.name} · Confidence{" "}
                {confidencePercent}%
                {topHeatmapPercent != null
                  ? ` · Focus ${topHeatmapPercent}%`
                  : ""}
              </div>
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...smoothTransition, delay: 0.15 }}
            className="relative mt-14 grid gap-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...smoothTransition, delay: 0.05 }}
              className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
            >
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" />
              <h3 className="text-lg font-semibold text-white">
                AI Report Workflow
              </h3>
              <p className="text-sm leading-relaxed text-white/70">
                Our printable briefs capture predictions, Grad-CAM overlays, and
                clinician notes in one exportable PDF. Review the insight deck,
                modify patient details, then circulate the report to your MDT
                channels without leaving Clarity.
              </p>
              <div className="pointer-events-none absolute -top-6 -left-6 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.35),transparent_65%)] blur-3xl" />
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.35 }}
            className="mt-14 flex flex-wrap justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => handleNavigation("/predict")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">→</span>
              <span>Predict</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/report")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">↗</span>
              <span>Report Generation</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⌂</span>
              <span>Home</span>
              <span className={buttonDotClasses} />
            </button>
          </motion.section>
        </main>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ ...smoothTransition, delay: 0.4 }}
      >
        <Footer />
      </motion.div>
    </div>
  );
}

export default GradcamPage;
