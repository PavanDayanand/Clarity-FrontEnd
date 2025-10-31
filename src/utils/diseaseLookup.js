import { diseaseLibrary, defaultDisease } from "../data/diseases.js";

const normalizeDiseaseName = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const findDiseaseByName = (label) => {
  if (!label) {
    return defaultDisease;
  }

  const normalized = normalizeDiseaseName(label);

  for (const [key, item] of Object.entries(diseaseLibrary)) {
    const normalizedKey = normalizeDiseaseName(key);
    const normalizedName = normalizeDiseaseName(item.name);

    if (normalized === normalizedName || normalized === normalizedKey) {
      return item;
    }
  }

  return defaultDisease;
};

export const getTopFindings = (positiveFindings, predictionsMap, limit = 5) => {
  if (Array.isArray(positiveFindings) && positiveFindings.length > 0) {
    return [...positiveFindings].sort((a, b) => b.probability - a.probability);
  }

  if (predictionsMap && typeof predictionsMap === "object") {
    return Object.entries(predictionsMap)
      .map(([label, probability]) => ({ disease: label, probability }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, limit);
  }

  return [];
};
