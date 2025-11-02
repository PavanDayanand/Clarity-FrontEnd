export const MODEL_KEYS = ["densenet121", "resnet152"];

export const MODEL_LABELS = {
  densenet121: "DenseNet121",
  resnet152: "ResNet152",
};

export const MODEL_CONFIG = {
  densenet121: {
    id: "densenet121",
    label: "DenseNet121",
    tagline: "Dense connectivity for fine-grained thoracic insight.",
    summary:
      "121-layer dense convolutional network tuned on NIH ChestX-ray14 for balanced recall across pleural findings.",
    badges: ["vision", "baseline"],
    footnote: "Default model — IG & Saliency ready",
  },
  resnet152: {
    id: "resnet152",
    label: "ResNet152",
    tagline: "Deep residual architecture prioritising precision.",
    summary:
      "152-layer residual backbone optimised for rapid triage with faster Grad-CAM generation.",
    badges: ["vision", "speed"],
    footnote: "Faster heatmaps · CAM focused",
  },
};

export const MODEL_LIST = MODEL_KEYS.map((key) => ({
  ...MODEL_CONFIG[key],
}));

export const DEFAULT_MODEL_KEY = MODEL_KEYS[0];

const normalizeInput = (value) => {
  if (value == null) {
    return "";
  }
  return value.toString().trim().toLowerCase();
};

const sanitizeToken = (value) =>
  normalizeInput(value).replace(/[^a-z0-9]/g, "");

export const resolveModelKey = (input, fallback = DEFAULT_MODEL_KEY) => {
  const normalized = normalizeInput(input);
  const sanitized = sanitizeToken(input);

  if (!normalized) {
    return fallback;
  }

  if (MODEL_KEYS.includes(normalized)) {
    return normalized;
  }

  if (sanitized.includes("resnet152") || sanitized === "resnet152") {
    return "resnet152";
  }

  if (sanitized.includes("densenet121") || sanitized === "densenet121") {
    return "densenet121";
  }

  if (normalized.includes("resnet") && normalized.includes("152")) {
    return "resnet152";
  }

  if (normalized.includes("dense") && normalized.includes("121")) {
    return "densenet121";
  }

  return fallback;
};

export const resolveModelLabel = (input) => {
  const keyCandidate = resolveModelKey(input, input);
  if (MODEL_LABELS[keyCandidate]) {
    return MODEL_LABELS[keyCandidate];
  }

  if (typeof input === "string" && input.trim()) {
    return input.trim();
  }

  return MODEL_LABELS[DEFAULT_MODEL_KEY];
};
