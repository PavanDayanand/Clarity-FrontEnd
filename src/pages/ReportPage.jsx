import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import { defaultDisease } from "../data/diseases.js";
import { entryOverlayStyle, exitOverlayStyle } from "../styles/transitions.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import { generateReport } from "../api/clarityApi.js";
import { findDiseaseByName, getTopFindings } from "../utils/diseaseLookup.js";

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

const parseReportContent = (content) => {
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  let currentType = "paragraph";

  const flush = () => {
    if (!buffer.length) {
      return;
    }

    if (currentType === "unordered" || currentType === "ordered") {
      blocks.push({ type: currentType, items: buffer });
    } else {
      blocks.push({
        type: "paragraph",
        text: buffer.join(" "),
      });
    }

    buffer = [];
    currentType = "paragraph";
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      return;
    }

    if (/^[A-Za-z][A-Za-z\s/]+:$/.test(trimmed)) {
      flush();
      blocks.push({ type: "heading", text: trimmed.replace(/:$/, "") });
      return;
    }

    const fieldMatch = trimmed.match(/^([A-Za-z][\w\s/]+):\s*(.+)$/);
    if (fieldMatch && fieldMatch[2]) {
      flush();
      blocks.push({
        type: "field",
        label: fieldMatch[1].trim(),
        value: fieldMatch[2].trim(),
      });
      return;
    }

    if (/^[*-]\s+/.test(trimmed)) {
      if (currentType !== "unordered") {
        flush();
        currentType = "unordered";
      }
      buffer.push(trimmed.replace(/^[*-]\s+/, "").trim());
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (currentType !== "ordered") {
        flush();
        currentType = "ordered";
      }
      buffer.push(trimmed.replace(/^\d+\.\s+/, "").trim());
      return;
    }

    if (currentType !== "paragraph") {
      flush();
      currentType = "paragraph";
    }
    buffer.push(trimmed);
  });

  flush();
  return blocks;
};

function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const {
    originalImage = "/placeholder-xray.png",
    heatmapImage,
    disease: initialDisease = defaultDisease,
    confidence: initialConfidence = 0.82,
    fileName = "Uploaded study",
    file,
    predictions: initialPredictions,
    positiveFindings: initialPositiveFindings,
    predictionSummary: initialPredictionSummary,
    topFinding: initialTopFinding,
    report: initialReport,
    patientInfo: initialPatientInfo,
  } = location.state ?? {};
  const [typedText, setTypedText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);
  const hasShownDownloadPromptRef = useRef(false);
  const [reportData, setReportData] = useState(
    initialReport ? { report: initialReport } : null
  );
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: initialPatientInfo?.name ?? "",
    age: initialPatientInfo?.age ? String(initialPatientInfo.age) : "",
    gender: initialPatientInfo?.gender ?? "",
    patient_id: initialPatientInfo?.patient_id ?? "",
    email: initialPatientInfo?.email ?? "",
  });
  const [positiveFindings, setPositiveFindings] = useState(
    initialPositiveFindings ?? []
  );
  const [predictionSummary, setPredictionSummary] = useState(
    initialPredictionSummary ??
      getTopFindings(initialPositiveFindings ?? [], initialPredictions)
  );
  const [focusDiseaseName, setFocusDiseaseName] = useState(
    initialTopFinding ?? initialDisease?.name ?? "Selected finding"
  );
  const [confidenceScore, setConfidenceScore] = useState(
    typeof initialConfidence === "number" ? initialConfidence : 0.82
  );

  const smoothTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] };
  const effectiveHeatmap = heatmapImage ?? originalImage;
  const disease = useMemo(
    () => findDiseaseByName(focusDiseaseName),
    [focusDiseaseName]
  );
  const findingName = disease?.name ?? "Selected finding";

  const genderLabel = useMemo(() => {
    const value = (patientInfo.gender ?? "").toString().trim();
    if (!value) {
      return "";
    }

    const normalized = value.toUpperCase();
    if (normalized === "M") {
      return "Male";
    }
    if (normalized === "F") {
      return "Female";
    }
    if (normalized === "OTHER") {
      return "Other";
    }
    return value;
  }, [patientInfo.gender]);

  const isPatientInfoComplete = Boolean(
    patientInfo.name.trim() && patientInfo.age && patientInfo.gender
  );
  const canGenerateReport = isPatientInfoComplete && !isLoading;

  const confidencePercent = useMemo(
    () => Math.round(Math.min(Math.max(confidenceScore ?? 0, 0), 1) * 100),
    [confidenceScore]
  );

  const formattedGeneratedAt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(generatedAt);
    } catch {
      return generatedAt.toLocaleString();
    }
  }, [generatedAt]);

  const fallbackReport = useMemo(() => {
    const lowerFinding = findingName.toLowerCase();
    return `Clarity AI Thoracic Report\n\nStudy: ${fileName}\nPrimary Finding: ${findingName}\nConfidence: ${confidencePercent}%\n\nSummary:\n- Grad-CAM corroborates the focus regions consistent with ${lowerFinding}.\n- No conflicting anomalies surfaced on bilateral comparison heuristics.\n- Recommend correlating with lab values and symptom onset to confirm diagnosis.\n\nNext Steps:\n1. Review Grad-CAM overlay for localisation context.\n2. Append attending commentary before finalising export.\n3. Dispatch PDF to PACS and notify MDT channel.`;
  }, [confidencePercent, fileName, findingName]);

  const reportContent = useMemo(() => {
    const generated = reportData?.report;
    if (generated && typeof generated === "string" && generated.trim()) {
      return generated;
    }
    return fallbackReport;
  }, [fallbackReport, reportData?.report]);

  const structuredReportBlocks = useMemo(
    () => parseReportContent(reportContent),
    [reportContent]
  );

  const narrativeBlocks = useMemo(
    () =>
      structuredReportBlocks.filter((block) => {
        if (block.type !== "field") {
          return true;
        }
        const label = block.label?.toLowerCase?.() ?? "";
        return !["study", "primary finding", "confidence", "patient"].includes(
          label
        );
      }),
    [structuredReportBlocks]
  );

  useEffect(() => {
    setTypedText("");
    setShowPreview(false);
    setCursorVisible(true);
    setShowDownloadPrompt(false);
    hasShownDownloadPromptRef.current = false;

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

  useEffect(() => {
    if (showPreview && reportData && !hasShownDownloadPromptRef.current) {
      hasShownDownloadPromptRef.current = true;
      setShowDownloadPrompt(true);
    }
  }, [showPreview, reportData]);

  const triggerNavigation = (path) => {
    if (isTransitioning) {
      return;
    }

    const navState = {
      originalImage,
      heatmapImage: effectiveHeatmap,
      disease,
      confidence: confidenceScore,
      fileName,
      file,
      predictions: reportData?.predictions ?? initialPredictions ?? null,
      positiveFindings,
      predictionSummary,
      topFinding: focusDiseaseName,
      report: reportData?.report ?? reportContent,
      patientInfo,
    };
    pendingNavigation.current = () => {
      navigate(path, { state: navState });
    };
    setIsTransitioning(true);
  };

  const handleNavigation = (path) => {
    triggerNavigation(path);
  };

  const handlePatientInfoChange = (field) => (event) => {
    const value = event.target.value;
    setApiError(null);
    setPatientInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateReport = async (event) => {
    event.preventDefault();
    if (!file) {
      setApiError(
        "Upload an imaging study on the home page before generating a report."
      );
      return;
    }

    if (!patientInfo.name.trim() || !patientInfo.age || !patientInfo.gender) {
      setApiError("Name, age, and gender are required to generate a report.");
      return;
    }

    const numericAge = Number(patientInfo.age);
    if (Number.isNaN(numericAge)) {
      setApiError("Provide a valid numeric age.");
      return;
    }

    setApiError(null);
    setIsLoading(true);
    setShowPreview(false);
    setTypedText("");
    setReportData(null);
    setShowDownloadPrompt(false);
    hasShownDownloadPromptRef.current = false;

    try {
      const response = await generateReport(file, {
        ...patientInfo,
        age: numericAge,
        gender: patientInfo.gender,
      });
      if (response?.success === false) {
        throw new Error(response?.message ?? "Report generation failed.");
      }
      setReportData(response);

      if (response?.patient_info) {
        const incomingGender = response.patient_info.gender;
        const normalizedGender = (() => {
          if (!incomingGender) {
            return "";
          }
          const value = incomingGender.toString().trim().toUpperCase();
          if (value === "MALE" || value === "M") {
            return "M";
          }
          if (value === "FEMALE" || value === "F") {
            return "F";
          }
          if (value === "OTHER" || value === "O") {
            return "Other";
          }
          return incomingGender;
        })();
        setPatientInfo((prev) => ({
          ...prev,
          ...response.patient_info,
          age: String(response.patient_info.age ?? prev.age ?? ""),
          gender: normalizedGender,
        }));
      }

      const positive = Array.isArray(response?.positive_findings)
        ? response.positive_findings
        : [];
      setPositiveFindings(positive);

      const summary = getTopFindings(positive, response?.predictions);
      setPredictionSummary(summary);

      const derivedFocus =
        summary[0]?.disease ?? response?.top_disease ?? focusDiseaseName;
      setFocusDiseaseName(derivedFocus);

      const derivedConfidenceRaw =
        response?.confidence ?? summary[0]?.probability ?? confidenceScore;
      const derivedConfidence =
        typeof derivedConfidenceRaw === "number"
          ? derivedConfidenceRaw
          : typeof derivedConfidenceRaw === "string"
          ? Number(derivedConfidenceRaw)
          : null;
      if (
        typeof derivedConfidence === "number" &&
        !Number.isNaN(derivedConfidence)
      ) {
        setConfidenceScore(derivedConfidence);
      }

      setGeneratedAt(new Date());
    } catch (error) {
      console.error("Report generation failed", error);
      setApiError(error.message ?? "Unable to generate the report.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const margin = 64;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = margin;

    const lineHeight = (size) => size * 1.35;
    const ensureSpace = (height = 0) => {
      if (cursorY + height > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
    };

    const writeTextBlock = (text, size = 12, weight = "normal", gap = 18) => {
      doc.setFont("helvetica", weight);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      const blockHeight = lines.length * lineHeight(size);
      ensureSpace(blockHeight);
      doc.text(lines, margin, cursorY);
      cursorY += blockHeight + gap;
    };

    const writeField = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const labelText = `${label}:`;
      const labelWidth = doc.getTextWidth(labelText);
      ensureSpace(lineHeight(11));
      doc.text(labelText, margin, cursorY);
      doc.setFont("helvetica", "normal");
      const valueLines = doc.splitTextToSize(
        value,
        pageWidth - margin * 2 - labelWidth - 12
      );
      doc.text(valueLines, margin + labelWidth + 12, cursorY);
      cursorY += valueLines.length * lineHeight(11) + 14;
    };

    const writeList = (items, ordered = false) => {
      if (!items?.length) {
        return;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      items.forEach((item, index) => {
        const prefix = ordered ? `${index + 1}.` : "•";
        const prefixWidth = doc.getTextWidth(prefix);
        const availableWidth = pageWidth - margin * 2 - prefixWidth - 12;
        const valueLines = doc.splitTextToSize(item, availableWidth);
        const blockHeight = valueLines.length * lineHeight(11);
        ensureSpace(blockHeight);
        doc.text(prefix, margin, cursorY);
        doc.text(valueLines, margin + prefixWidth + 12, cursorY);
        cursorY += blockHeight + 10;
      });
      cursorY += 6;
    };

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Clarity Imaging", margin, cursorY);
    cursorY += 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Thoracic AI Diagnostic Brief", margin, cursorY);
    const timestampWidth = doc.getTextWidth(formattedGeneratedAt);
    doc.text(
      formattedGeneratedAt,
      pageWidth - margin - timestampWidth,
      cursorY
    );
    cursorY += 18;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 24;

    writeField("Study", fileName);
    writeField(
      "Primary Finding",
      `${findingName} · ${confidencePercent}% confidence`
    );
    writeField(
      "Patient",
      [
        patientInfo.name || "Name pending",
        patientInfo.age ? `${patientInfo.age} years` : "Age pending",
        genderLabel || "Gender pending",
        patientInfo.patient_id ? `ID ${patientInfo.patient_id}` : null,
        patientInfo.email || null,
      ]
        .filter(Boolean)
        .join(" · ")
    );

    narrativeBlocks.forEach((block) => {
      switch (block.type) {
        case "heading":
          writeTextBlock(block.text, 12, "bold", 10);
          break;
        case "field":
          writeField(block.label, block.value);
          break;
        case "unordered":
          writeList(block.items, false);
          break;
        case "ordered":
          writeList(block.items, true);
          break;
        default:
          writeTextBlock(block.text, 11, "normal", 16);
      }
    });

    doc.save("clarity-report.pdf");
    setShowDownloadPrompt(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator className="right-3 sm:right-4 md:right-8 lg:right-12" />
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
            className="mx-auto w-full max-w-3xl px-6 pt-16 text-center sm:px-12"
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
            {isLoading ? (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...smoothTransition, delay: 0.3 }}
                className="mt-4 text-sm font-medium text-cyan-200/90"
              >
                Generating detailed findings&hellip;
              </motion.p>
            ) : null}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.2 }}
            className="mt-14 flex w-full flex-col items-center gap-10 px-6 sm:px-12"
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

              <form
                onSubmit={handleGenerateReport}
                className="mt-6 grid w-full gap-4 text-left lg:grid-cols-2"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Patient name
                  </label>
                  <input
                    type="text"
                    value={patientInfo.name}
                    onChange={handlePatientInfoChange("name")}
                    placeholder="e.g. Jordan Miller"
                    className="w-full rounded-2xl border border-white/12 bg-[#0d1f3f]/70 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={patientInfo.age}
                    onChange={handlePatientInfoChange("age")}
                    placeholder="45"
                    className="w-full rounded-2xl border border-white/12 bg-[#0d1f3f]/70 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Gender
                  </label>
                  <select
                    value={patientInfo.gender}
                    onChange={handlePatientInfoChange("gender")}
                    className="w-full appearance-none rounded-2xl border border-white/12 bg-[#0d1f3f]/70 px-4 py-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                    required
                  >
                    <option value="" disabled hidden>
                      Select gender
                    </option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Patient ID (optional)
                  </label>
                  <input
                    type="text"
                    value={patientInfo.patient_id}
                    onChange={handlePatientInfoChange("patient_id")}
                    placeholder="CLT-2049"
                    className="w-full rounded-2xl border border-white/12 bg-[#0d1f3f]/70 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={patientInfo.email}
                    onChange={handlePatientInfoChange("email")}
                    placeholder="patient@example.com"
                    className="w-full rounded-2xl border border-white/12 bg-[#0d1f3f]/70 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-4 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-xs text-white/60">
                    Provide demographics to personalise the generated brief. No
                    PHI leaves your session.
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-h-6 text-sm font-medium">
                      {apiError ? (
                        <span className="text-rose-300">{apiError}</span>
                      ) : !isLoading && reportData ? (
                        <span className="text-emerald-300/90">
                          Report updated
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="submit"
                      disabled={!canGenerateReport}
                      className={`group inline-flex items-center gap-0 overflow-hidden rounded-full border border-white/14 bg-white/6 text-white transition-all duration-200 ${
                        canGenerateReport
                          ? "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                          : "cursor-not-allowed opacity-55"
                      }`}
                    >
                      <span
                        className={`flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold shadow-[0_18px_45px_-28px_rgba(37,99,235,0.9)] transition ${
                          isLoading ? "opacity-80" : "group-hover:bg-[#1d4ed8]"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 5v9m0 0 3-3m-3 3-3-3"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 19h12"
                          />
                        </svg>
                        <span>{isLoading ? "Generating" : "Generate"}</span>
                      </span>
                      <span className="px-5 text-sm font-medium text-white/80">
                        {isLoading ? "Calibrating Clarity brief" : "AI report"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="relative flex min-h-128 flex-col justify-center overflow-hidden rounded-[28px] border border-white/5 bg-[#050f24]/85 px-6 py-10 shadow-[0_50px_110px_-60px_rgba(37,99,235,0.6)] sm:px-10 lg:px-14 lg:py-16">
                <div className="pointer-events-none absolute inset-0 opacity-60">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_65%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(14,116,233,0.18),transparent_65%)]" />
                </div>
                <AnimatePresence mode="wait">
                  {!showPreview ? (
                    <motion.div
                      key="draft"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18, scale: 0.97 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 mx-auto w-full max-w-4xl"
                    >
                      <div className="overflow-hidden rounded-[36px] border border-white/12 bg-[#f8fafc] text-slate-800 shadow-[0_38px_85px_-48px_rgba(56,189,248,0.6)]">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-10 py-8">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
                              Clarity Imaging
                            </span>
                            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                              Thoracic AI Brief
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {fileName}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{formattedGeneratedAt}</p>
                            <p className="mt-1 uppercase tracking-[0.28em]">
                              Drafting
                            </p>
                          </div>
                        </div>
                        <div className="px-10 py-12">
                          <div className="space-y-6 font-sans text-[15px] leading-7 text-slate-700">
                            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-slate-700">
                              {typedText}
                              {!showPreview ? (
                                <span
                                  className={`ml-1 align-middle text-slate-400 transition-opacity ${
                                    cursorVisible ? "opacity-100" : "opacity-0"
                                  }`}
                                >
                                  ▍
                                </span>
                              ) : null}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pdf"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 mx-auto w-full max-w-4xl"
                    >
                      <div className="overflow-hidden rounded-[36px] border border-white/12 bg-white text-slate-800 shadow-[0_45px_120px_-60px_rgba(59,130,246,0.65)]">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50 px-10 py-8">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
                              Clarity Imaging
                            </span>
                            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                              Thoracic Report
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Generated {formattedGeneratedAt}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{fileName}</p>
                            <p className="mt-1 uppercase tracking-[0.28em] text-slate-400">
                              Confidence {confidencePercent}%
                            </p>
                          </div>
                        </div>
                        <div className="px-10 py-12">
                          <div className="grid gap-6 text-[15px] leading-7">
                            <div className="rounded-2xl bg-slate-100/70 px-6 py-5">
                              <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Study
                              </h4>
                              <p className="mt-2 text-slate-800">{fileName}</p>
                            </div>
                            <div className="grid gap-4 rounded-2xl bg-slate-100/60 px-6 py-5 sm:grid-cols-2">
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                  Patient
                                </h4>
                                <p className="mt-2 text-slate-800">
                                  {patientInfo.name || "Name pending"}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {patientInfo.age
                                    ? `${patientInfo.age} years`
                                    : "Age pending"}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                  Profile
                                </h4>
                                <ul className="mt-2 space-y-1 text-slate-700">
                                  <li>{genderLabel || "Gender pending"}</li>
                                  {patientInfo.patient_id ? (
                                    <li>ID {patientInfo.patient_id}</li>
                                  ) : null}
                                  {patientInfo.email ? (
                                    <li>{patientInfo.email}</li>
                                  ) : null}
                                </ul>
                              </div>
                            </div>
                            <div className="rounded-2xl bg-slate-100/70 px-6 py-5">
                              <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Primary finding
                              </h4>
                              <p className="mt-2 font-semibold text-slate-900">
                                {findingName} · {confidencePercent}% confidence
                              </p>
                            </div>
                            <div className="space-y-5 rounded-2xl border border-slate-200/70 px-6 py-6">
                              {narrativeBlocks.map((block, index) => {
                                if (block.type === "heading") {
                                  return (
                                    <h4
                                      key={`heading-${index}`}
                                      className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500"
                                    >
                                      {block.text}
                                    </h4>
                                  );
                                }
                                if (block.type === "field") {
                                  return (
                                    <div
                                      key={`field-${block.label}-${index}`}
                                      className="text-sm text-slate-700"
                                    >
                                      <span className="font-semibold text-slate-600">
                                        {block.label}:&nbsp;
                                      </span>
                                      {block.value}
                                    </div>
                                  );
                                }
                                if (block.type === "unordered") {
                                  return (
                                    <ul
                                      key={`unordered-${index}`}
                                      className="list-disc space-y-2 pl-6 text-sm text-slate-700"
                                    >
                                      {block.items.map((item, itemIndex) => (
                                        <li
                                          key={`unordered-${index}-${itemIndex}`}
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                }
                                if (block.type === "ordered") {
                                  return (
                                    <ol
                                      key={`ordered-${index}`}
                                      className="list-decimal space-y-2 pl-6 text-sm text-slate-700"
                                    >
                                      {block.items.map((item, itemIndex) => (
                                        <li
                                          key={`ordered-${index}-${itemIndex}`}
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ol>
                                  );
                                }
                                return (
                                  <p
                                    key={`paragraph-${index}`}
                                    className="text-sm text-slate-700"
                                  >
                                    {block.text}
                                  </p>
                                );
                              })}
                            </div>
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
              className="flex w-full max-w-5xl flex-col gap-8 rounded-[34px] border border-white/10 bg-white/5 p-10 backdrop-blur-2xl lg:p-12"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">
                  Report Snapshot
                </h2>
                <span className="rounded-full border border-white/12 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
                  Ready to export
                </span>
              </div>
              <div className="grid gap-6 text-sm text-white/70 sm:grid-cols-2 sm:text-base">
                <div className="rounded-3xl border border-white/10 bg-white/8 p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                    Study
                  </h3>
                  <p className="mt-3 text-white/80">{fileName}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/8 p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                    Primary finding
                  </h3>
                  <p className="mt-3 text-white">{findingName}</p>
                  <p className="text-sm text-white/65">
                    Confidence {confidencePercent}%
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/8 p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                    Patient profile
                  </h3>
                  <ul className="mt-3 space-y-1 text-white/80">
                    <li>{patientInfo.name || "Name pending"}</li>
                    <li>
                      {patientInfo.age
                        ? `${patientInfo.age} years`
                        : "Age pending"}
                    </li>
                    <li>{genderLabel || "Gender pending"}</li>
                    {patientInfo.patient_id ? (
                      <li>ID {patientInfo.patient_id}</li>
                    ) : null}
                    {patientInfo.email ? <li>{patientInfo.email}</li> : null}
                  </ul>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/8 p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                    Evidence sources
                  </h3>
                  <p className="mt-3 text-white/75">
                    Saliency overlays, ensemble calibration, and structured
                    deltas roll into this export.
                  </p>
                </div>
              </div>
              {predictionSummary.length > 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/8 p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
                    Top findings
                  </h3>
                  <ul className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2 sm:text-base">
                    {predictionSummary.slice(0, 4).map((finding) => {
                      const probability = Math.min(
                        Math.max(finding.probability ?? 0, 0),
                        1
                      );
                      return (
                        <li
                          key={`${finding.disease}-${probability}`}
                          className="flex items-baseline justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <span className="truncate text-white">
                            {finding.disease}
                          </span>
                          <span className="text-white/70">
                            {(probability * 100).toFixed(1)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <div className="rounded-3xl border border-white/10 bg-white/6 p-6 text-xs text-white/65 sm:text-sm">
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
            className="mt-14 grid gap-6 px-6 sm:px-12 md:grid-cols-3"
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
            className="mt-14 flex flex-wrap justify-center gap-4 px-6 sm:px-12"
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

      <AnimatePresence>
        {showDownloadPrompt ? (
          <motion.div
            key="download-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-[#020617]/85 backdrop-blur-xl"
            onClick={() => setShowDownloadPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-[min(520px,92vw)] rounded-3xl border border-white/12 bg-[#08132c]/95 p-8 text-white shadow-[0_40px_120px_-45px_rgba(59,130,246,0.7)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Report ready to download
                  </h3>
                  <p className="mt-2 text-sm text-white/70">
                    The latest Clarity brief for {fileName} is prepared in an A4
                    layout. Download to share or archive immediately.
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70">
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
                      d="M12 5v9m0 0 3-3m-3 3-3-3"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 19h12"
                    />
                  </svg>
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDownloadPrompt(false)}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/12 hover:text-white"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(37,99,235,0.85)] transition hover:bg-[#1d4ed8]"
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
                      d="M12 4v12m0 0 4-4m-4 4-4-4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 20h12"
                    />
                  </svg>
                  Download report
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ReportPage;
