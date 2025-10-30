import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { defaultDisease } from "../data/diseases.js";
import { entryOverlayStyle, exitOverlayStyle } from "../styles/transitions.js";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";

const progressGradient =
  "bg-[linear-gradient(90deg,rgba(34,211,238,0.6),rgba(79,70,229,0.8))]";

function PredictPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const {
    originalImage = "/placeholder-xray.png",
    heatmapImage,
    disease = defaultDisease,
    confidence = 0.87,
    fileName = "Live upload preview",
  } = location.state ?? {};
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);

  const confidencePercent = useMemo(
    () => Math.round(Math.min(Math.max(confidence, 0), 1) * 100),
    [confidence]
  );

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

  const handleReload = () => {
    triggerNavigation(() => window.location.reload());
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator />
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.1 }}
            className="mx-auto w-full max-w-3xl pt-16 text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={smoothTransition}
              className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#060d1d] shadow-[0_25px_60px_-35px_rgba(59,130,246,0.95)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(104,159,255,0.55),transparent_70%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_75%,rgba(26,88,220,0.42),transparent_70%)]" />
              <span className="relative text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-white/85">
                AI
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.15 }}
              className="mt-8 flex items-center justify-center gap-3 text-[2.5rem] font-semibold tracking-tight drop-shadow-[0_18px_30px_rgba(34,197,246,0.35)] sm:text-6xl"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200 shadow-[0_14px_35px_-18px_rgba(59,130,246,0.8)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-7 w-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 9A4.5 4.5 0 0 1 12 4.5c2.5 0 4.5 2.1 4.5 4.5 0 4.5 3 6 3 8.25 0 1.79-1.71 3.25-3.5 3.25h-7c-1.79 0-3.5-1.46-3.5-3.25 0-2.25 3-3.75 3-8.25Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 17h4M9 13.5h6"
                  />
                </svg>
              </span>
              <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                AI Prediction Summary
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.25 }}
              className="mx-auto mt-6 max-w-3xl text-base italic text-white/70 sm:text-xl"
            >
              Clarity surfaces the most probable conditions based on our
              multi-modal thoracic models. Review the generated overlays,
              understand the supporting evidence, and continue with informed
              follow-up steps.
            </motion.p>
          </motion.section>

          <div className="mt-12 flex flex-col gap-10">
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smoothTransition}
              className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-8 shadow-[0_60px_130px_-60px_rgba(37,99,235,0.55)] backdrop-blur-2xl"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.32em] text-cyan-200">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Uploaded Study
                </div>
                <span className="text-xs text-white/50 sm:text-sm">
                  {fileName}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70 sm:text-base">
                Review the clinician supplied radiograph. All downstream
                insights derive from this input; ensure anonymisation policies
                are honoured before sharing.
              </p>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...smoothTransition, delay: 0.05 }}
                className="mt-8 overflow-hidden rounded-[28px] border border-white/5 bg-black/50"
              >
                <img
                  src={originalImage}
                  alt="Uploaded radiograph"
                  className="h-80 w-full object-cover sm:h-96 lg:h-112"
                />
              </motion.div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.05 }}
              className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 sm:text-2xl">
                    Confidence Level
                  </h2>
                  <p className="mt-2 text-sm text-white/65 sm:text-base">
                    Probability calibrated across validation cohorts and updated
                    nightly. Confidence animates to reflect the latest model
                    verdict.
                  </p>
                </div>
                <span className="text-2xl font-semibold text-cyan-200">
                  {confidencePercent}%
                </span>
              </div>
              <div className="relative mt-8 h-5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${progressGradient}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div
                  className="absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-cyan-200/30 shadow-[0_0_30px_rgba(56,189,248,0.45)]"
                  initial={{ left: 0 }}
                  animate={{ left: `calc(${confidencePercent}% - 2rem)` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/55 sm:text-sm">
                <span>Low</span>
                <span className="text-white/70">Model certainty</span>
                <span>High</span>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.1 }}
              className="rounded-4xl border border-white/10 bg-white/5 p-9 backdrop-blur-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Condition Insight
              </div>
              <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl space-y-5">
                  <h2 className="text-3xl font-semibold text-white/90 sm:text-[2.3rem]">
                    {disease.name}
                  </h2>
                  <p className="text-base text-white/70 sm:text-lg">
                    {definition}
                  </p>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 sm:text-base">
                    <span className="font-semibold text-white/85">
                      Common causes &amp; risk factors:
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
                <div className="flex flex-col gap-5 text-sm text-white/60 sm:text-base">
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
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-xs text-white/55 sm:text-sm">
                    Generated with Clarity v2.3. Validate alongside clinical
                    judgement. Escalate to radiologist-on-call if symptoms
                    diverge from predicted presentation.
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.3 }}
            className="mt-14 flex flex-wrap justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => handleNavigation("/gradcam")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">↗</span>
              <span>View Grad-CAM</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/report")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⇢</span>
              <span>Report Generation</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => triggerNavigation(() => navigate(-1))}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">←</span>
              <span>Back to Upload</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => triggerNavigation(() => navigate("/"))}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⌂</span>
              <span>Return Home</span>
              <span className={buttonDotClasses} />
            </button>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.35 }}
            className="mt-6 flex justify-center"
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
