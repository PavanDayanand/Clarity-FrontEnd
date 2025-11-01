import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const UploadContext = createContext(null);

const initialState = {
  file: null,
  fileName: "",
  fileSize: null,
  previewUrl: null,
  originalImage: null,
  heatmapImage: null,
  confidence: null,
  disease: null,
  predictions: null,
  positiveFindings: null,
  predictionSummary: null,
  topFinding: null,
  report: null,
  patientInfo: null,
};

export function UploadProvider({ children }) {
  const [uploadData, setUploadData] = useState(initialState);

  const updateUploadData = useCallback((updates) => {
    setUploadData((previous) => ({
      ...previous,
      ...updates,
    }));
  }, []);

  const resetUploadData = useCallback(() => {
    setUploadData({ ...initialState });
  }, []);

  const value = useMemo(
    () => ({
      uploadData,
      updateUploadData,
      resetUploadData,
    }),
    [uploadData, updateUploadData, resetUploadData]
  );

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
