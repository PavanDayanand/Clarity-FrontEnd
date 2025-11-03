export const datasetClassDistribution = [
  { key: "atelectasis", label: "Atelectasis", count: 4215 },
  { key: "cardiomegaly", label: "Cardiomegaly", count: 2165 },
  { key: "consolidation", label: "Consolidation", count: 3452 },
  { key: "edema", label: "Pulmonary Edema", count: 2710 },
  { key: "effusion", label: "Pleural Effusion", count: 4445 },
  { key: "emphysema", label: "Emphysema", count: 2501 },
  { key: "fibrosis", label: "Pulmonary Fibrosis", count: 1684 },
  { key: "hernia", label: "Hiatal Hernia", count: 512 },
  { key: "infiltration", label: "Pulmonary Infiltrate", count: 1986 },
  { key: "mass", label: "Pulmonary Mass", count: 2351 },
  { key: "noFinding", label: "No Finding", count: 6048 },
  { key: "nodule", label: "Pulmonary Nodule", count: 2784 },
  { key: "pleuralThickening", label: "Pleural Thickening", count: 1906 },
  { key: "pneumonia", label: "Pneumonia", count: 2874 },
  { key: "pneumothorax", label: "Pneumothorax", count: 1719 },
];

export const datasetMeta = {
  datasetName: "NIH ChestX-ray14",
  totalStudies: datasetClassDistribution.reduce(
    (total, item) => total + item.count,
    0
  ),
  uniquePatients: 30805,
  releaseYear: 2024,
  modality: "Frontal Chest X-ray",
};

export const modelPerformance = {
  densenet121: {
    accuracy: 0.874,
    auc: 0.932,
    f1: 0.861,
    inferenceTimeMs: 182,
  },
  resnet152: {
    accuracy: 0.892,
    auc: 0.941,
    f1: 0.873,
    inferenceTimeMs: 205,
  },
};

export const trainingCurves = {
  densenet121: [
    { epoch: 1, train: 0.68, validation: 0.64 },
    { epoch: 2, train: 0.74, validation: 0.7 },
    { epoch: 3, train: 0.79, validation: 0.75 },
    { epoch: 4, train: 0.82, validation: 0.78 },
    { epoch: 5, train: 0.84, validation: 0.8 },
    { epoch: 6, train: 0.86, validation: 0.82 },
    { epoch: 7, train: 0.87, validation: 0.83 },
    { epoch: 8, train: 0.885, validation: 0.845 },
    { epoch: 9, train: 0.892, validation: 0.852 },
    { epoch: 10, train: 0.901, validation: 0.86 },
  ],
  resnet152: [
    { epoch: 1, train: 0.69, validation: 0.66 },
    { epoch: 2, train: 0.75, validation: 0.71 },
    { epoch: 3, train: 0.8, validation: 0.76 },
    { epoch: 4, train: 0.83, validation: 0.79 },
    { epoch: 5, train: 0.85, validation: 0.81 },
    { epoch: 6, train: 0.87, validation: 0.83 },
    { epoch: 7, train: 0.89, validation: 0.846 },
    { epoch: 8, train: 0.903, validation: 0.858 },
    { epoch: 9, train: 0.912, validation: 0.866 },
    { epoch: 10, train: 0.921, validation: 0.874 },
  ],
};
