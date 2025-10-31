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

export const predictDisease = async (file) => {
  const formData = toFormData({ file });
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
};

export const generateGradcam = async (file) => {
  const formData = toFormData({ file });
  const response = await fetch(`${API_BASE_URL}/predict/gradcam`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
};

export const generateReport = async (file, patientInfo) => {
  const formData = toFormData({
    file,
    name: patientInfo?.name,
    age: patientInfo?.age,
    gender: patientInfo?.gender,
    patient_id: patientInfo?.patient_id,
    email: patientInfo?.email,
  });

  const response = await fetch(`${API_BASE_URL}/predict/report`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
};
