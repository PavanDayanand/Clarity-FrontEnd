import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import { defaultDisease } from "../data/diseases.js";
import { entryOverlayStyle, exitOverlayStyle } from "../styles/transitions.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";

const reportInfoCards = [
  {
    title: "What is Report Studio?",
    body: "Guided authoring stitches AI findings, clinician notes, and Grad-CAM overlays into a printable brief that mirrors hospital-ready formatting.",
  },
  {
    title: "Why it matters",
    body: "Narrative summaries surface the evidence path, helping MDT teams consume the key takeaways without scrubbing through raw imaging or logs.",
  },
  {
    title: "How teams use it",
    body: "Drafts export straight into PACS or EHR inboxes. Radiologists review, amend, and finalise in minutes instead of rebuilding reports from scratch.",
  },
];

function ReportPage() {
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
  const [typedText, setTypedText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);

  const smoothTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] };
  const effectiveHeatmap = heatmapImage ?? originalImage;
  const findingName = disease?.name ?? "Selected finding";

  const confidencePercent = useMemo(
    () => Math.round(Math.min(Math.max(confidence, 0), 1) * 100),
    [confidence]
  );

  const reportContent = useMemo(() => {
    const lowerFinding = findingName.toLowerCase();
    return `Clarity AI Thoracic Report\n\nStudy: ${fileName}\nPrimary Finding: ${findingName}\nConfidence: ${confidencePercent}%\n\nSummary:\n- Grad-CAM corroborates the focus regions consistent with ${lowerFinding}.\n- No conflicting anomalies surfaced on bilateral comparison heuristics.\n- Recommend correlating with lab values and symptom onset to confirm diagnosis.\n\nNext Steps:\n1. Review Grad-CAM overlay for localisation context.\n2. Append attending commentary before finalising export.\n3. Dispatch PDF to PACS and notify MDT channel.`;
  }, [confidencePercent, fileName, findingName]);

  useEffect(() => {
    setTypedText("");
    setShowPreview(false);
    setCursorVisible(true);

    if (!reportContent) {
      return;
    }

    let index = 0;
    const total = reportContent.length;
    const typeInterval = setInterval(() => {
      index += 1;
      setTypedText(reportContent.slice(0, index));
      if (index >= total) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setShowPreview(true);
        }, 900);
      }
    }, 14);

    return () => {
      clearInterval(typeInterval);
    };
  }, [reportContent]);

  useEffect(() => {
    if (showPreview) {
      setCursorVisible(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 520);

    return () => {
      clearInterval(blinkInterval);
    };
  }, [showPreview]);

  const triggerNavigation = (path) => {
    if (isTransitioning) {
      return;
    }

    const navState = {
      originalImage,
      heatmapImage: effectiveHeatmap,
      disease,
      confidence,
      fileName,
    };
    pendingNavigation.current = () => {
      navigate(path, { state: navState });
    };
    setIsTransitioning(true);
  };

  const handleNavigation = (path) => {
    triggerNavigation(path);
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clarity-report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,92,255,0.45),rgba(3,10,28,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(2,8,22,0.95),#020713)]" />
        <div
          className="absolute -top-40 -left-32 rounded-full bg-linear-to-br from-[#1b3bff]/70 via-[#4a6bff]/60 to-transparent blur-3xl opacity-80"
          style={{ width: "34rem", height: "34rem" }}
        />
        <div
          className="absolute bottom-0 -right-44 rounded-full bg-linear-to-tl from-[#041e5e]/80 via-[#1c2d73]/65 to-transparent blur-3xl opacity-90"
          style={{ width: "44rem", height: "44rem" }}
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
            key="exit-overlay"
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
            className="mx-auto w-full max-w-3xl text-center pt-16"
          >
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.15 }}
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              <span className="gradient-flow-text text-transparent bg-clip-text bg-[linear-gradient(120deg,#06183a,#0ea5e9,#1e3a8a,#0ea5e9)]">
                Report Generation Preview
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.25 }}
              className="mt-5 text-base italic text-white/70 sm:text-xl"
            >
              Configure printable briefs, merge Grad-CAM evidence, and surface
              key talking points before multidisciplinary rounds.
            </motion.p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.2 }}
            className="mt-14 flex w-full flex-col items-center gap-10"
          >
            <div className="flex w-full max-w-5xl flex-col gap-6 rounded-[34px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl lg:p-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-white/90 sm:text-2xl">
                    Report Composer
                  </h2>
                  <p className="mt-2 text-sm italic text-white/65 sm:text-base">
                    Witness the draft assemble in real time before the PDF
                    viewer takes over.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/60">
                  Auto-generated
                </span>
              </div>

              <div className="relative flex min-h-120 flex-col justify-center overflow-hidden rounded-[28px] border border-white/5 bg-black/60 px-6 py-10 shadow-[0_50px_110px_-60px_rgba(37,99,235,0.6)] sm:px-8 lg:px-12 lg:py-16">
                <AnimatePresence mode="wait">
                  {!showPreview ? (
                    <motion.div
                      key="draft"
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative mx-auto flex w-full max-w-3xl flex-col items-center"
                    >
                      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 -translate-y-full rounded-full border border-white/10 bg-white/10 px-5 py-1.5 text-[11px] uppercase tracking-[0.32em] text-white/70 shadow-[0_8px_25px_-12px_rgba(32,92,255,0.8)]">
                        Generating…
                      </div>
                      <div className="relative flex h-full w-full max-w-2xl">
                        <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#f8fafc] px-10 py-12 text-left text-slate-800 shadow-[0_35px_75px_-45px_rgba(56,189,248,0.55)]">
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
                            <span>Clarity</span>
                            <span>Draft</span>
                          </div>
                          <div className="mt-6 h-px w-full bg-linear-to-r from-slate-200 via-slate-300 to-transparent" />
                          <pre className="mt-8 flex-1 whitespace-pre-wrap overflow-hidden font-mono text-[13px] leading-relaxed text-slate-700">
                            {typedText}
                            {!showPreview ? (
                              <span
                                className={`ml-0.5 ${
                                  cursorVisible ? "opacity-100" : "opacity-0"
                                }`}
                              >
                                ▍
                              </span>
                            ) : null}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pdf"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1d3a] text-white shadow-[0_40px_90px_-55px_rgba(59,130,246,0.6)]"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 bg-[#132349]/90 px-8 py-4">
                        <div className="flex items-center gap-3 text-xs text-white/60">
                          <div className="flex gap-1">
                            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                          </div>
                          clarity-report.pdf
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={handleDownload}
                            className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-white/80 transition hover:bg-white/20 hover:text-white"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-white/60 transition hover:bg-white/20 hover:text-white"
                          >
                            Print
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden bg-[#0b1833] px-8 py-10 sm:px-10 sm:py-12">
                        <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center gap-6">
                          <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white px-10 py-12 text-left shadow-[0_25px_70px_-45px_rgba(56,189,248,0.55)]">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
                              <span>Clarity</span>
                              <span>Report</span>
                            </div>
                            <div className="mt-6 h-px w-full bg-linear-to-r from-slate-200 via-slate-300 to-transparent" />
                            <pre className="mt-8 flex-1 whitespace-pre-wrap overflow-auto font-sans text-[13px] leading-relaxed text-slate-800">
                              {reportContent}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.25 }}
              className="flex w-full max-w-4xl flex-col gap-6 rounded-[34px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl lg:p-10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white/90 sm:text-2xl">
                  Report Snapshot
                </h2>
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/60">
                  Ready to export
                </span>
              </div>
              <div className="space-y-4 text-sm text-white/65 sm:text-base">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.32em] text-cyan-200">
                    Study
                  </div>
                  <p className="mt-2 text-white/80">{fileName}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.32em] text-cyan-200">
                    Primary finding
                  </div>
                  <p className="mt-2 text-white/80">
                    {findingName} · Confidence {confidencePercent}%
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.32em] text-cyan-200">
                    Evidence sources
                  </div>
                  <p className="mt-2 text-white/70">
                    Summaries weave Grad-CAM saliency, confidence bars, and
                    model provenance into a single exportable brief.
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/60 sm:text-sm">
                Need edits? Re-run the prediction or append attending notes in
                your RIS before dispatching the PDF to PACS.
              </div>
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...smoothTransition, delay: 0.18 }}
            className="mt-14 grid gap-6 md:grid-cols-3"
          >
            {reportInfoCards.map((card, index) => (
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
            transition={{ ...smoothTransition, delay: 0.3 }}
            className="mt-14 flex flex-wrap justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => handleNavigation("/predict")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">→</span>
              <span>Back to Prediction</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/gradcam")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">↗</span>
              <span>Review Grad-CAM</span>
              <span className={buttonDotClasses} />
            </button>
            <button
              type="button"
              onClick={() => handleNavigation("/")}
              className={primaryButtonClasses}
            >
              <span className="text-base leading-none">⌂</span>
              <span>Return Home</span>
              <span className={buttonDotClasses} />
            </button>
          </motion.section>
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

export default ReportPage;
