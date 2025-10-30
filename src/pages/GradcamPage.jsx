import { useMemo, useRef, useState } from "react";
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

function GradcamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const {
    originalImage = "/placeholder-xray.png",
    heatmapImage,
    disease = defaultDisease,
    confidence = 0.82,
    fileName = "Uploaded study",
  } = location.state ?? {};

  const [viewMode, setViewMode] = useState("original");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);

  const confidencePercent = useMemo(
    () => Math.round(Math.min(Math.max(confidence, 0), 1) * 100),
    [confidence]
  );

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
        },
      })
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(132,54,255,0.45),rgba(3,10,28,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(8,22,47,0.95),#020713)]" />
        <div
          className="absolute -top-40 -left-28 rounded-full bg-linear-to-br from-[#321d8f]/70 via-[#5c3ad7]/60 to-transparent blur-3xl opacity-70"
          style={{ width: "30rem", height: "30rem" }}
        />
        <div
          className="absolute bottom-0 -right-48 rounded-full bg-linear-to-tl from-[#0b1a4a]/80 via-[#1e2d6d]/65 to-transparent blur-3xl opacity-90"
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
                      {isSyntheticHeatmap ? (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,70,107,0.55),rgba(56,189,248,0.2),transparent_78%)] mix-blend-screen" />
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
                    </motion.div>
                  )}
                </AnimatePresence>
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
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/60">
                  Coming soon
                </span>
              </div>
              <div className="flex h-full min-h-72 items-center justify-center rounded-[28px] border border-dashed border-cyan-500/40 bg-black/40 text-center text-sm text-white/50">
                Visual probability distribution chart will render here.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/60 sm:text-sm">
                Current top prediction: {disease.name} · Confidence{" "}
                {confidencePercent}%
              </div>
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...smoothTransition, delay: 0.15 }}
            className="mt-14 grid gap-6 md:grid-cols-3"
          >
            {infoCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...smoothTransition, delay: index * 0.08 }}
                className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
              >
                <h3 className="text-lg font-semibold text-white">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70">
                  {card.body}
                </p>
              </motion.div>
            ))}
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
