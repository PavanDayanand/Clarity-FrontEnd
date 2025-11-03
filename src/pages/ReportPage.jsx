import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
/* eslint-disable-next-line no-unused-vars */
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import { marked } from "marked";
import { buttonDotClasses, primaryButtonClasses } from "../styles/ui.js";
import { defaultDisease } from "../data/diseases.js";
import { entryOverlayStyle, exitOverlayStyle } from "../styles/transitions.js";
import useScrollToTop from "../hooks/useScrollToTop.js";
import PrimaryNav from "../components/PrimaryNav.jsx";
import Footer from "../components/Footer.jsx";
import ScrollIndicator from "../components/ui/ScrollIndicator.jsx";
import BackgroundGrid from "../components/ui/BackgroundGrid.jsx";
import PageBackdrop from "../components/ui/PageBackdrop.jsx";
import { generateReport } from "../api/clarityApi.js";
import { findDiseaseByName, getTopFindings } from "../utils/diseaseLookup.js";
import { usePopup } from "../components/ui/PopupProvider.jsx";
import { useUpload } from "../context/UploadContext.jsx";
import {
  DEFAULT_MODEL_KEY,
  resolveModelKey,
  resolveModelLabel,
} from "../utils/modelUtils.js";

const PLACEHOLDER_IMAGE = "/placeholder-xray.png";
const DEFAULT_IMAGE_NAME = "clarity-upload";
const DEFAULT_IMAGE_EXTENSION = "png";
const A4_DIMENSIONS = { width: 794, height: 1123 };

const getExtensionFromMime = (mimeType) => {
  if (!mimeType || typeof mimeType !== "string") {
    return DEFAULT_IMAGE_EXTENSION;
  }
  const parts = mimeType.split("/");
  if (parts.length < 2) {
    return DEFAULT_IMAGE_EXTENSION;
  }
  const subtype = parts[1]?.split(";")[0]?.trim().toLowerCase();
  if (!subtype) {
    return DEFAULT_IMAGE_EXTENSION;
  }
  return subtype === "jpeg" ? "jpg" : subtype;
};

const ensureImageFileName = (nameHint, mimeType) => {
  const extension = getExtensionFromMime(mimeType);
  if (!nameHint || typeof nameHint !== "string") {
    return `${DEFAULT_IMAGE_NAME}.${extension}`;
  }
  const trimmed = nameHint.trim();
  if (!trimmed) {
    return `${DEFAULT_IMAGE_NAME}.${extension}`;
  }
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(`.${extension}`)) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return trimmed;
  }
  return `${trimmed}.${extension}`;
};

const createFileFromBlob = (blob, nameHint) => {
  if (!blob) {
    return null;
  }

  const mimeType = blob.type || `image/${DEFAULT_IMAGE_EXTENSION}`;
  const fileName = ensureImageFileName(nameHint, mimeType);
  const FileCtor =
    typeof globalThis !== "undefined" ? globalThis.File : undefined;
  const BlobCtor =
    typeof globalThis !== "undefined" ? globalThis.Blob : undefined;

  if (FileCtor && blob instanceof FileCtor) {
    if (!blob.name) {
      return new FileCtor([blob], fileName, { type: mimeType });
    }
    return blob;
  }

  if (FileCtor) {
    try {
      return new FileCtor([blob], fileName, { type: mimeType });
    } catch (error) {
      console.warn("Falling back while creating File from blob", error);
      try {
        const fallbackBlob =
          BlobCtor && blob instanceof BlobCtor
            ? blob
            : BlobCtor
            ? new BlobCtor([blob], { type: mimeType })
            : blob;
        return new FileCtor([fallbackBlob], fileName, { type: mimeType });
      } catch (secondaryError) {
        console.error("Unable to create File from blob", secondaryError);
      }
    }
  }

  if (BlobCtor) {
    try {
      const fallbackBlob =
        blob instanceof BlobCtor
          ? blob
          : new BlobCtor([blob], { type: mimeType });
      return Object.assign(fallbackBlob, {
        name: fileName,
        lastModified: Date.now(),
      });
    } catch (secondaryError) {
      console.error("Unable to create File from blob", secondaryError);
      return null;
    }
  }

  return null;
};

const createFileFromDataUrl = (dataUrl, nameHint) => {
  if (
    !dataUrl ||
    typeof dataUrl !== "string" ||
    !dataUrl.trim().startsWith("data:")
  ) {
    return null;
  }

  const matches = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/i);
  if (!matches) {
    return null;
  }
  const mimeType = matches[1];
  const base64Data = matches[2];

  try {
    let binaryString = "";
    const rootScope = typeof globalThis !== "undefined" ? globalThis : {};
    if (typeof rootScope.atob === "function") {
      binaryString = rootScope.atob(base64Data);
    } else if (rootScope.Buffer) {
      binaryString = rootScope.Buffer.from(base64Data, "base64").toString(
        "binary"
      );
    } else {
      throw new Error("No base64 decoder available");
    }

    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return createFileFromBlob(blob, ensureImageFileName(nameHint, mimeType));
  } catch (error) {
    console.error("Failed to convert data URL to file", error);
    return null;
  }
};

const isRecoverableImageSource = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return (
    /^data:image\//i.test(trimmed) ||
    trimmed.startsWith("blob:") ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/")
  );
};

const reportInfoCards = [
  {
    title: "What is Report Studio?",
    body: "Guided authoring stitches AI findings, clinician notes, and Heat Map overlays into a printable brief that mirrors hospital-ready formatting.",
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

const leftFeatureImage = encodeURI("/Gemini Generated Image.png");
const rightFeatureImage = encodeURI("/Chest Blood Vessels MRA Scan.jpeg");

const sanitizeHref = (href) => {
  if (!href) {
    return "#";
  }

  const trimmed = href.trim();
  if (!trimmed) {
    return "#";
  }

  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return "#";
};

marked.use({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: false,
  renderer: {
    link(href, title, text) {
      const safeHref = sanitizeHref(href);
      const titleAttr = title ? ` title="${title}"` : "";
      return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noreferrer noopener">${text}</a>`;
    },
  },
});

const stripHtmlTags = (html) =>
  html.replace(/\s*<br\s*\/?>(\s|$)/gi, "\n").replace(/<[^>]+>/g, " ");

const decodeHtmlEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#96;/g, "`");

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const parseInlineMarkdown = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return { text: "", html: "" };
  }

  const html = marked.parseInline(trimmed).trim();
  const text = normalizeWhitespace(decodeHtmlEntities(stripHtmlTags(html)));
  return { text, html };
};

const parseReportContent = (content) => {
  if (!content) {
    return [];
  }

  const tokens = marked.lexer(content);
  const blocks = [];
  let listBuffer = null;

  const commitList = () => {
    if (listBuffer && listBuffer.items.length) {
      blocks.push({
        type: listBuffer.ordered ? "ordered" : "unordered",
        items: listBuffer.items.map((item) => item.text),
        itemsHtml: listBuffer.items.map((item) => item.html),
      });
    }
    listBuffer = null;
  };

  const pushListItem = (ordered, markdownText) => {
    const inline = parseInlineMarkdown(markdownText);
    if (!inline.text) {
      return;
    }

    if (!listBuffer || listBuffer.ordered !== ordered) {
      commitList();
      listBuffer = { ordered, items: [] };
    }

    listBuffer.items.push(inline);
  };

  tokens.forEach((token) => {
    switch (token.type) {
      case "space":
        commitList();
        break;
      case "hr":
        commitList();
        blocks.push({ type: "separator" });
        break;
      case "heading": {
        commitList();
        const inline = parseInlineMarkdown(token.text);
        if (inline.text) {
          blocks.push({
            type: "heading",
            level: token.depth,
            text: inline.text,
            html: inline.html,
          });
        }
        break;
      }
      case "list": {
        token.items.forEach((item) => {
          if (item.task) {
            const checkboxPrefix = item.checked ? "[x] " : "[ ] ";
            pushListItem(
              Boolean(token.ordered),
              `${checkboxPrefix}${item.text}`
            );
          } else {
            pushListItem(Boolean(token.ordered), item.text);
          }
        });
        commitList();
        break;
      }
      case "code": {
        commitList();
        const codeText =
          typeof token.text === "string" ? token.text.trimEnd() : "";
        if (codeText) {
          blocks.push({
            type: "code",
            text: codeText,
            lang: token.lang ?? null,
          });
        }
        break;
      }
      case "blockquote": {
        commitList();
        const inline = parseInlineMarkdown(token.text);
        if (inline.text) {
          blocks.push({
            type: "blockquote",
            text: inline.text,
            html: inline.html,
          });
        }
        break;
      }
      case "paragraph":
      case "text": {
        commitList();
        const raw = token.text ?? "";

        const headingLike = raw.match(/^([A-Za-z][A-Za-z\s/]+):$/);
        if (headingLike) {
          const inline = parseInlineMarkdown(headingLike[1]);
          if (inline.text) {
            blocks.push({
              type: "heading",
              level: 3,
              text: inline.text,
              html: inline.html,
            });
          }
          break;
        }

        const fieldMatch = raw.match(/^([A-Za-z][\w\s/]+):\s+(.+)$/);
        if (fieldMatch) {
          const label = normalizeWhitespace(fieldMatch[1]);
          const value = parseInlineMarkdown(fieldMatch[2]);
          blocks.push({
            type: "field",
            label,
            value: value.text,
            valueHtml: value.html,
          });
          break;
        }

        const inline = parseInlineMarkdown(raw);
        if (inline.text) {
          blocks.push({
            type: "paragraph",
            text: inline.text,
            html: inline.html,
          });
        }
        break;
      }
      default:
        commitList();
        break;
    }
  });

  commitList();
  return blocks;
};

const inferImageFormat = (source) => {
  if (!source) {
    return "PNG";
  }

  const dataMatch = source.match(/^data:image\/(\w+);/i);
  if (dataMatch?.[1]) {
    return dataMatch[1].toUpperCase();
  }

  const lower = source.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "JPEG";
  }
  if (lower.endsWith(".webp")) {
    return "WEBP";
  }
  if (lower.endsWith(".bmp")) {
    return "BMP";
  }
  return "PNG";
};

const fetchImageDataUrl = async (source) => {
  if (!source) {
    return null;
  }

  if (source.startsWith("data:")) {
    return source;
  }

  try {
    const response = await fetch(source, { cache: "force-cache" });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read image."));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to fetch report image", error);
    return null;
  }
};

const loadImageMetadata = async (source) => {
  const dataUrl = await fetchImageDataUrl(source);
  if (!dataUrl) {
    return null;
  }

  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        dataUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => resolve({ dataUrl, width: 0, height: 0 });
    image.src = dataUrl;
  });
};

const buildFallbackReport = (fileName, findingName, confidencePercent) => {
  const resolvedFinding = findingName || "Selected finding";
  const resolvedConfidence = Number.isFinite(confidencePercent)
    ? confidencePercent
    : 0;
  const friendlyFinding = resolvedFinding.toLowerCase();

  return `Clarity AI Thoracic Report\n\nStudy: ${fileName}\nPrimary Finding: ${resolvedFinding}\nConfidence: ${resolvedConfidence}%\n\nHighlights:\n- Heat Map corroborates the focus regions consistent with ${friendlyFinding}.\n- No conflicting anomalies surfaced on bilateral comparison heuristics.\n- Recommend correlating with lab values and symptom onset to confirm diagnosis.\n\nRecommended Actions:\n1. Review Heat Map overlay for localisation context.\n2. Append attending commentary before finalising export.\n3. Dispatch PDF to PACS and notify MDT channel.`;
};

function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollToTop();
  const { uploadData, updateUploadData } = useUpload();
  const locationState = location.state ?? {};
  const file = locationState.file ?? uploadData.file ?? null;
  const fileName =
    locationState.fileName ?? uploadData.fileName ?? "Uploaded study";
  const originalImage =
    locationState.originalImage ??
    uploadData.originalImage ??
    uploadData.previewUrl ??
    PLACEHOLDER_IMAGE;
  const heatmapImage =
    locationState.heatmapImage ??
    uploadData.heatmapImage ??
    uploadData.previewUrl ??
    null;
  const heatmapMethod =
    locationState.heatmapMethod ?? uploadData.heatmapMethod ?? null;
  const heatmapLayer =
    locationState.heatmapLayer ?? uploadData.heatmapLayer ?? null;
  const heatmapTopDisease =
    locationState.heatmapTopDisease ?? uploadData.heatmapTopDisease ?? null;
  const heatmapTopProbability =
    locationState.heatmapTopProbability ??
    uploadData.heatmapTopProbability ??
    null;
  const modelKey = resolveModelKey(
    locationState.modelKey ??
      uploadData.modelKey ??
      locationState.modelDisplayName ??
      uploadData.modelDisplayName ??
      DEFAULT_MODEL_KEY
  );
  const modelLabel = resolveModelLabel(
    locationState.modelDisplayName ?? uploadData.modelDisplayName ?? modelKey
  );
  const initialDisease =
    locationState.disease ?? uploadData.disease ?? defaultDisease;
  const initialConfidence =
    locationState.confidence ?? uploadData.confidence ?? 0.82;
  const initialPredictions =
    locationState.predictions ?? uploadData.predictions ?? null;
  const initialPositiveFindings =
    locationState.positiveFindings ?? uploadData.positiveFindings ?? [];
  const derivedSummary = getTopFindings(
    initialPositiveFindings ?? [],
    initialPredictions
  );
  const initialPredictionSummary =
    locationState.predictionSummary ??
    uploadData.predictionSummary ??
    derivedSummary;
  const initialTopFinding =
    locationState.topFinding ??
    uploadData.topFinding ??
    initialPredictionSummary?.[0]?.disease ??
    initialDisease?.name ??
    "Selected finding";
  const initialReport = locationState.report ?? uploadData.report ?? null;
  const initialPatientInfo =
    locationState.patientInfo ?? uploadData.patientInfo ?? null;
  const initialReportContent =
    typeof initialReport === "string" ? initialReport.trim() : "";
  const [typedText, setTypedText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingNavigation = useRef(null);
  const [reportData, setReportData] = useState(
    initialReportContent ? { report: initialReportContent } : null
  );
  const [reportContent, setReportContent] = useState(initialReportContent);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [patientInfo, setPatientInfo] = useState({
    name: initialPatientInfo?.name ?? "",
    age: initialPatientInfo?.age ? String(initialPatientInfo.age) : "",
    gender: initialPatientInfo?.gender ?? "",
    patient_id: initialPatientInfo?.patient_id ?? "",
    email: initialPatientInfo?.email ?? "",
  });
  const [positiveFindings, setPositiveFindings] = useState(
    initialPositiveFindings
  );
  const [predictionSummary, setPredictionSummary] = useState(
    initialPredictionSummary
  );
  const [focusDiseaseName, setFocusDiseaseName] = useState(initialTopFinding);
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
  const previewImageSource = originalImage;
  const hasReportContent = Boolean(reportContent && reportContent.trim());
  const isTypingReport = hasReportContent && !showPreview;
  const isPreviewReady = hasReportContent && showPreview;
  const canDownloadReport = isPreviewReady && !isDownloading;

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

  const previewStatusMessage = useMemo(() => {
    if (isLoading) {
      return "Generating detailed findings…";
    }
    if (isTypingReport) {
      return "Composing the narrative…";
    }
    if (isPreviewReady) {
      return `PDF preview ready • ${formattedGeneratedAt}`;
    }
    if (hasReportContent) {
      return "Preparing preview…";
    }
    return "Generate a report to preview the PDF layout.";
  }, [
    formattedGeneratedAt,
    hasReportContent,
    isLoading,
    isPreviewReady,
    isTypingReport,
  ]);

  const structuredReportBlocks = useMemo(
    () => parseReportContent(reportContent),
    [reportContent]
  );
  const { showPopup } = usePopup();

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
    if (!file) {
      showPopup({
        title: "Upload required",
        message:
          "Add an imaging study on the home page before generating reports.",
        variant: "warning",
      });
      navigate("/", { replace: true });
    }
  }, [file, navigate, showPopup]);

  useEffect(() => {
    if (!reportContent) {
      setTypedText("");
      setShowPreview(false);
      setCursorVisible(true);
      return undefined;
    }

    setTypedText("");
    setShowPreview(false);
    setCursorVisible(true);

    const total = reportContent.length;
    if (total === 0) {
      const timeoutId = window.setTimeout(() => {
        setShowPreview(true);
      }, 300);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    let frameId;
    let completionTimeout;
    const durationMs = 5000;
    const content = reportContent;
    const startTime = performance.now();

    const step = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const nextLength = Math.max(0, Math.round(progress * total));
      setTypedText(content.slice(0, nextLength));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
        return;
      }

      completionTimeout = window.setTimeout(() => {
        setShowPreview(true);
      }, 600);
    };

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (completionTimeout) {
        window.clearTimeout(completionTimeout);
      }
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
      confidence: confidenceScore,
      fileName,
      file,
      predictions: reportData?.predictions ?? initialPredictions ?? null,
      positiveFindings,
      predictionSummary,
      topFinding: focusDiseaseName,
      report: reportData?.report ?? reportContent,
      patientInfo,
      modelKey,
      modelDisplayName: modelLabel,
      heatmapMethod,
      heatmapLayer,
      heatmapTopDisease,
      heatmapTopProbability,
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
    setDownloadError(null);
    setPatientInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateReport = async (event) => {
    event.preventDefault();

    let activeFile = null;
    let resolvedImageSource = null;

    if (file instanceof File) {
      activeFile = file;
    } else if (file instanceof Blob) {
      activeFile = createFileFromBlob(file, fileName);
    }

    const candidateSources = Array.from(
      new Set(
        [
          locationState.originalImage,
          uploadData.originalImage,
          uploadData.previewUrl,
        ].filter(isRecoverableImageSource)
      )
    );

    if (!activeFile) {
      for (const source of candidateSources) {
        let candidateFile = null;

        if (source.startsWith("data:")) {
          candidateFile = createFileFromDataUrl(source, fileName);
        } else {
          try {
            const response = await fetch(source);
            if (!response.ok) {
              continue;
            }
            const blob = await response.blob();
            if (!blob || !blob.size) {
              continue;
            }
            candidateFile = createFileFromBlob(blob, fileName);
          } catch {
            continue;
          }
        }

        if (candidateFile) {
          activeFile = candidateFile;
          resolvedImageSource = source;
          break;
        }
      }
    }

    if (!activeFile) {
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

    const basePatientInfo = {
      ...patientInfo,
      age: String(numericAge),
    };

    if (activeFile !== file) {
      const updates = {
        file: activeFile,
        fileName: activeFile.name ?? fileName,
      };
      if (
        resolvedImageSource &&
        isRecoverableImageSource(resolvedImageSource)
      ) {
        updates.originalImage = resolvedImageSource;
        updates.previewUrl = resolvedImageSource;
      }
      updateUploadData(updates);
    }

    setApiError(null);
    setIsLoading(true);
    setShowPreview(false);
    setTypedText("");
    setReportData(null);
    setReportContent("");

    try {
      const response = await generateReport(
        activeFile,
        {
          ...patientInfo,
          age: numericAge,
          gender: patientInfo.gender,
        },
        { model: modelKey }
      );
      if (response?.success === false) {
        throw new Error(response?.message ?? "Report generation failed.");
      }
      let resolvedPatientInfo = basePatientInfo;

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
        resolvedPatientInfo = {
          ...resolvedPatientInfo,
          ...response.patient_info,
          age: String(
            response.patient_info.age ?? resolvedPatientInfo.age ?? ""
          ),
          gender: normalizedGender,
        };
      }

      setPatientInfo(resolvedPatientInfo);

      const positive = Array.isArray(response?.positive_findings)
        ? response.positive_findings
        : [];
      setPositiveFindings(positive);

      const summary = getTopFindings(positive, response?.predictions);
      setPredictionSummary(summary);

      const nextFocusDisease =
        summary[0]?.disease ?? response?.top_disease ?? focusDiseaseName;
      setFocusDiseaseName(nextFocusDisease);

      const nextDiseaseRecord = nextFocusDisease
        ? findDiseaseByName(nextFocusDisease)
        : disease;
      const nextDiseaseName =
        nextDiseaseRecord?.name ?? findingName ?? "Selected finding";

      const derivedConfidenceRaw =
        response?.confidence ?? summary[0]?.probability ?? confidenceScore;
      const nextConfidenceScore =
        typeof derivedConfidenceRaw === "number"
          ? derivedConfidenceRaw
          : typeof derivedConfidenceRaw === "string"
          ? Number(derivedConfidenceRaw)
          : confidenceScore;
      const normalizedConfidenceScore = Number.isFinite(nextConfidenceScore)
        ? nextConfidenceScore
        : confidenceScore;
      if (Number.isFinite(normalizedConfidenceScore)) {
        setConfidenceScore(normalizedConfidenceScore);
      }
      const nextConfidencePercent = Math.round(
        Math.min(Math.max(normalizedConfidenceScore ?? 0, 0), 1) * 100
      );

      const incomingReport = (response?.report ?? "").trim();
      const resolvedReportText = incomingReport
        ? incomingReport
        : buildFallbackReport(fileName, nextDiseaseName, nextConfidencePercent);

      setReportData({ ...response, report: resolvedReportText });
      setReportContent(resolvedReportText);

      const responseModelKey = resolveModelKey(
        response?.model_used ?? modelKey
      );
      const responseModelLabel = resolveModelLabel(
        response?.model_used ?? responseModelKey
      );

      const nextOriginalImage =
        resolvedImageSource && isRecoverableImageSource(resolvedImageSource)
          ? resolvedImageSource
          : originalImage;
      const nextPreviewUrl =
        uploadData.previewUrl ??
        (resolvedImageSource && isRecoverableImageSource(resolvedImageSource)
          ? resolvedImageSource
          : originalImage);

      updateUploadData({
        file: activeFile,
        fileName: activeFile.name ?? fileName,
        originalImage: nextOriginalImage,
        previewUrl: nextPreviewUrl,
        heatmapImage: effectiveHeatmap,
        disease: nextFocusDisease
          ? findDiseaseByName(nextFocusDisease) ?? initialDisease
          : initialDisease,
        confidence: Number.isFinite(normalizedConfidenceScore)
          ? normalizedConfidenceScore
          : confidenceScore,
        predictions: response?.predictions ?? initialPredictions ?? null,
        positiveFindings: positive,
        predictionSummary: summary,
        topFinding: nextFocusDisease,
        report: resolvedReportText,
        patientInfo: resolvedPatientInfo,
        modelKey: responseModelKey,
        modelDisplayName: responseModelLabel,
      });

      setGeneratedAt(new Date());
      showPopup({
        title: "Report ready",
        message: "Download your Clarity PDF or continue reviewing findings.",
        variant: "success",
      });
    } catch (error) {
      console.error("Report generation failed", error);
      setApiError(error.message ?? "Unable to generate the report.");
      showPopup({
        title: "Report generation failed",
        message: error.message ?? "Unable to generate the report.",
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportContent?.trim()) {
      setDownloadError("Generate a report before downloading.");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
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

      const includeImage =
        previewImageSource && isRecoverableImageSource(previewImageSource);
      const imageCaption =
        includeImage && heatmapTopDisease
          ? `Original imaging study • Focus ${heatmapTopDisease}`
          : "Original imaging study";
      const imageMetadata = includeImage
        ? await loadImageMetadata(previewImageSource)
        : null;

      if (imageMetadata?.dataUrl) {
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight * 0.32;
        const aspectRatio =
          imageMetadata.width && imageMetadata.height
            ? imageMetadata.width / imageMetadata.height
            : A4_DIMENSIONS.width / A4_DIMENSIONS.height;
        let renderWidth = availableWidth;
        let renderHeight = renderWidth / aspectRatio;
        if (renderHeight > availableHeight) {
          renderHeight = availableHeight;
          renderWidth = renderHeight * aspectRatio;
        }
        const imageFormat = inferImageFormat(imageMetadata.dataUrl);
        ensureSpace(renderHeight + 28);
        try {
          doc.addImage(
            imageMetadata.dataUrl,
            imageFormat,
            margin,
            cursorY,
            renderWidth,
            renderHeight,
            undefined,
            "FAST"
          );
          cursorY += renderHeight + 16;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          doc.text(imageCaption, margin, cursorY);
          cursorY += 18;
          doc.setTextColor(30, 41, 59);
        } catch (imageError) {
          console.warn("Failed to embed report image", imageError);
        }
      }

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
      showPopup({
        title: "Download ready",
        message: "Your Clarity PDF has been saved to device storage.",
        variant: "success",
      });
    } catch (error) {
      console.error("Report download failed", error);
      setDownloadError("Unable to download the report. Please try again.");
      showPopup({
        title: "Download failed",
        message: "Unable to download the report. Please try again.",
        variant: "danger",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031029] text-white">
      <ScrollIndicator className="right-3 sm:right-4 md:right-8 lg:right-12" />
      <PageBackdrop variant="report" />
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

        <main className="relative flex-1">
          {/* Decorative hero-style imagery hugging the composer panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.22 }}
            className="pointer-events-none absolute -left-24 top-60 hidden xl:block"
          >
            <div className="relative h-88 w-64 -rotate-6 rounded-[42px] border border-white/10 bg-white/5 p-3 shadow-[0_40px_120px_-60px_rgba(12,74,185,0.65)] backdrop-blur-3xl">
              <div className="absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.3),transparent_70%)] blur-3xl" />
              <img
                src={leftFeatureImage}
                alt="Radiology artifacts floating beside the report preview"
                className="relative z-10 h-full w-full rounded-[28px] border border-white/15 object-cover"
                style={{
                  maskImage:
                    "radial-gradient(circle at center, rgba(0,0,0,1) 68%, rgba(0,0,0,0) 96%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at center, rgba(0,0,0,1) 68%, rgba(0,0,0,0) 96%)",
                  maskSize: "140% 140%",
                  WebkitMaskSize: "140% 140%",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/8" />
              <span className="pointer-events-none absolute -bottom-10 right-8 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                imaging
              </span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.28 }}
            className="pointer-events-none absolute -right-24 top-96 hidden xl:block"
          >
            <div className="relative h-96 w-68 rotate-6 rounded-[42px] border border-white/10 bg-[#120d1c]/70 p-3 shadow-[0_40px_130px_-60px_rgba(244,114,182,0.6)] backdrop-blur-3xl">
              <div className="absolute -right-14 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,138,101,0.32),transparent_72%)] blur-3xl" />
              <img
                src={rightFeatureImage}
                alt="Chest vessel scan emphasising the report context"
                className="relative z-10 h-full w-full rounded-[28px] border border-white/12 object-cover"
                style={{
                  maskImage:
                    "radial-gradient(circle at center, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 96%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at center, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 96%)",
                  maskSize: "135% 135%",
                  WebkitMaskSize: "135% 135%",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" />
              <span className="pointer-events-none absolute -top-10 left-6 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/70">
                heat map
              </span>
            </div>
          </motion.div>
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
              Configure printable briefs, merge Heat Map evidence, and surface
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
                <div className="relative z-20 mb-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/70">
                    {previewStatusMessage}
                  </p>
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                    {downloadError ? (
                      <span className="text-xs font-semibold text-rose-300">
                        {downloadError}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!canDownloadReport}
                      aria-disabled={!canDownloadReport}
                      aria-busy={isDownloading}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/14 px-4 py-2 text-sm font-semibold transition ${
                        canDownloadReport
                          ? "bg-white/12 text-white hover:bg-white/16 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                          : "cursor-not-allowed bg-white/6 text-white/45"
                      }`}
                    >
                      {isDownloading ? (
                        <svg
                          className="h-4 w-4 animate-spin text-cyan-200"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M12 3a9 9 0 018.94 8.06 1.2 1.2 0 01-1.18 1.34c-.62 0-1.13-.46-1.19-1.08A6.8 6.8 0 0012 5.2V3z"
                          />
                        </svg>
                      ) : (
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
                            d="M12 4v12m0 0 4-4m-4 4-4-4"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 20h12"
                          />
                        </svg>
                      )}
                      <span>
                        {isDownloading ? "Preparing" : "Download PDF"}
                      </span>
                    </button>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {!showPreview ? (
                    <motion.div
                      key="draft"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18, scale: 0.97 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 mx-auto w-full"
                    >
                      <div
                        className="relative mx-auto overflow-hidden rounded-[36px] border border-white/12 bg-[#f8fafc] text-slate-800 shadow-[0_38px_85px_-48px_rgba(56,189,248,0.6)]"
                        style={{
                          width: "100%",
                          maxWidth: `${A4_DIMENSIONS.width}px`,
                          aspectRatio: `${A4_DIMENSIONS.width} / ${A4_DIMENSIONS.height}`,
                          maxHeight: "80vh",
                        }}
                      >
                        <div className="absolute inset-0 flex flex-col overflow-hidden">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-10 py-8">
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
                          <div className="flex-1 overflow-y-auto px-10 py-12">
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
                      className="relative z-10 mx-auto w-full"
                    >
                      <div
                        className="relative mx-auto overflow-hidden rounded-[36px] border border-white/12 bg-white text-slate-800 shadow-[0_45px_120px_-60px_rgba(59,130,246,0.65)]"
                        style={{
                          width: "100%",
                          maxWidth: `${A4_DIMENSIONS.width}px`,
                          aspectRatio: `${A4_DIMENSIONS.width} / ${A4_DIMENSIONS.height}`,
                          maxHeight: "80vh",
                        }}
                      >
                        <div className="absolute inset-0 flex flex-col overflow-hidden">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/90 px-10 py-8">
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
                              <p className="mt-1 text-slate-400">
                                {modelLabel}
                              </p>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto px-10 py-10">
                            <div className="grid gap-6 text-[15px] leading-7">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <article className="rounded-2xl bg-slate-100/70 px-6 py-5">
                                  <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Study
                                  </h4>
                                  <p className="mt-2 text-slate-800">
                                    {fileName}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Generated {formattedGeneratedAt}
                                  </p>
                                </article>
                                <article className="rounded-2xl bg-slate-100/70 px-6 py-5">
                                  <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Primary finding
                                  </h4>
                                  <p className="mt-2 font-semibold text-slate-900">
                                    {findingName}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {confidencePercent}% confidence ·{" "}
                                    {modelLabel}
                                  </p>
                                </article>
                                <article className="rounded-2xl bg-slate-100/60 px-6 py-5 sm:col-span-2">
                                  <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Patient overview
                                  </h4>
                                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
                                    <span>
                                      {patientInfo.name || "Name pending"}
                                    </span>
                                    <span>
                                      {patientInfo.age
                                        ? `${patientInfo.age} years`
                                        : "Age pending"}
                                    </span>
                                    <span>
                                      {genderLabel || "Gender pending"}
                                    </span>
                                    {patientInfo.patient_id ? (
                                      <span>ID {patientInfo.patient_id}</span>
                                    ) : null}
                                    {patientInfo.email ? (
                                      <span>{patientInfo.email}</span>
                                    ) : null}
                                  </div>
                                </article>
                              </div>

                              {previewImageSource ? (
                                <figure className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                                  <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900/10">
                                    <img
                                      src={previewImageSource}
                                      alt="Uploaded imaging study"
                                      className="h-auto w-full object-contain"
                                      style={{ maxHeight: "320px" }}
                                    />
                                  </div>
                                  <figcaption className="mt-3 text-xs text-slate-500">
                                    Original imaging study · {fileName}
                                    {heatmapTopDisease
                                      ? ` • Focus ${heatmapTopDisease}`
                                      : ""}
                                  </figcaption>
                                </figure>
                              ) : null}

                              <div className="space-y-5 rounded-2xl border border-slate-200/70 px-6 py-6">
                                {narrativeBlocks.length ? (
                                  narrativeBlocks.map((block, index) => {
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
                                          {block.items.map(
                                            (item, itemIndex) => (
                                              <li
                                                key={`unordered-${index}-${itemIndex}`}
                                              >
                                                {item}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      );
                                    }
                                    if (block.type === "ordered") {
                                      return (
                                        <ol
                                          key={`ordered-${index}`}
                                          className="list-decimal space-y-2 pl-6 text-sm text-slate-700"
                                        >
                                          {block.items.map(
                                            (item, itemIndex) => (
                                              <li
                                                key={`ordered-${index}-${itemIndex}`}
                                              >
                                                {item}
                                              </li>
                                            )
                                          )}
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
                                  })
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    Narrative content will appear once the AI
                                    report is generated.
                                  </p>
                                )}
                              </div>
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
                  {isPreviewReady ? "Ready to export" : "Awaiting report"}
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
              <span className="text-base leading-none">↗️</span>
              <span>Review Heat Map</span>
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
