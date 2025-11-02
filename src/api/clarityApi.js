const DEFAULT_BASE_URL = "http://localhost:8000";

const resolveBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
  }
  return DEFAULT_BASE_URL;
};

const API_BASE_URL = resolveBaseUrl();

const toFormData = (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const textPayload = await response.text();
    data = textPayload ? { message: textPayload } : null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ?? `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
  });
  return handleResponse(response);
};

export const predictDisease = async (
  file,
  { model = "densenet121", signal } = {}
) => {
  const formData = toFormData({ file, model });
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
    signal,
  });
  return handleResponse(response);
};

export const generateHeatmap = async (
  file,
  { model = "densenet121", method = "gradcam_pp", layer, signal } = {}
) => {
  const formData = new FormData();
  if (file != null) {
    formData.append("file", file);
  }
  if (model) {
    formData.append("model", model);
  }
  if (method) {
    formData.append("method", method);
  }
  if (layer) {
    formData.append("layer", layer);
  }

  const response = await fetch(`${API_BASE_URL}/predict/heatmap`, {
    method: "POST",
    body: formData,
    signal,
  });

  return handleResponse(response);
};

export const generateGradcam = async (file, options) =>
  generateHeatmap(file, options);

export const generateReport = async (
  file,
  patientInfo,
  { model = "densenet121", signal } = {}
) => {
  if (!file) {
    throw new Error("A diagnostic image is required to generate a report.");
  }
  const formData = toFormData({
    file,
    name: patientInfo?.name,
    age: patientInfo?.age,
    gender: patientInfo?.gender,
    patient_id: patientInfo?.patient_id,
    email: patientInfo?.email,
    model,
  });

  const response = await fetch(`${API_BASE_URL}/predict/report`, {
    method: "POST",
    body: formData,
    signal,
  });

  return handleResponse(response);
};

export const getAvailableLayers = async (modelName, { signal } = {}) => {
  const resolvedModel = modelName ?? "densenet121";
  const encodedModel = encodeURIComponent(resolvedModel);
  const response = await fetch(
    `${API_BASE_URL}/config/layers/${encodedModel}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      signal,
    }
  );
  return handleResponse(response);
};

export const getAvailableMethods = async (modelName, { signal } = {}) => {
  const resolvedModel = modelName ?? "densenet121";
  const encodedModel = encodeURIComponent(resolvedModel);
  const response = await fetch(
    `${API_BASE_URL}/config/methods/${encodedModel}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      signal,
    }
  );
  return handleResponse(response);
};
