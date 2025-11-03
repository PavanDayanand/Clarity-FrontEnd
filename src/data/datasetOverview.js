export const datasetMeta = {
  name: "NIH ChestX-ray14",
  totalImages: 112120,
  uniquePatients: 30805,
  findingsTracked: 15,
  multiLabelCases: 20796,
  multiLabelShare: 0.185,
  datasetLink: "https://nihcc.app.box.com/v/ChestXray-NIHCC",
  paperLink: "https://arxiv.org/abs/1705.02315",
};

export const datasetDescription = [
  "Chest X-ray exams are widely used, low-cost imaging studies, yet interpreting them reliably can be harder than reading a chest CT.",
  "This NIH release packages 112k studies from 30k patients with weakly supervised labels mined from the original radiology reports (Wang et al., ChestX-ray8).",
];

export const diseaseDistribution = [
  { key: "noFinding", label: "No Finding", count: 60361, percent: 0.426 },
  { key: "infiltration", label: "Infiltration", count: 19894, percent: 0.141 },
  { key: "effusion", label: "Effusion", count: 13317, percent: 0.094 },
  { key: "atelectasis", label: "Atelectasis", count: 11559, percent: 0.082 },
  { key: "nodule", label: "Nodule", count: 6331, percent: 0.045 },
  { key: "mass", label: "Mass", count: 5782, percent: 0.041 },
  { key: "pneumothorax", label: "Pneumothorax", count: 5302, percent: 0.037 },
  { key: "consolidation", label: "Consolidation", count: 4667, percent: 0.033 },
  {
    key: "pleuralThickening",
    label: "Pleural Thickening",
    count: 3385,
    percent: 0.024,
  },
  { key: "cardiomegaly", label: "Cardiomegaly", count: 2776, percent: 0.02 },
  { key: "emphysema", label: "Emphysema", count: 2516, percent: 0.018 },
  { key: "edema", label: "Edema", count: 2303, percent: 0.016 },
  { key: "fibrosis", label: "Fibrosis", count: 1686, percent: 0.012 },
  { key: "pneumonia", label: "Pneumonia", count: 1431, percent: 0.01 },
  { key: "hernia", label: "Hernia", count: 227, percent: 0.002 },
];

export const viewDistribution = [
  { label: "PA", count: 67310 },
  { label: "AP", count: 44810 },
];

export const genderDistribution = [
  { label: "Male", count: 63340 },
  { label: "Female", count: 48780 },
];

export const averageMetrics = {
  densenet121: {
    f1: 0.2163,
    auc: 0.8363,
    precision: 0.4625,
    recall: 0.1668,
    accuracy: 0.934,
  },
  resnet152: {
    f1: 0.2374,
    auc: 0.8337,
    precision: 0.45,
    recall: 0.1927,
    accuracy: 0.9336,
  },
};

export const classMetrics = [
  {
    label: "Atelectasis",
    densenet121: {
      f1: 0.2147,
      auc: 0.8225,
      precision: 0.528,
      recall: 0.1348,
      accuracy: 0.8998,
    },
    resnet152: {
      f1: 0.268,
      auc: 0.8203,
      precision: 0.5092,
      recall: 0.1819,
      accuracy: 0.899,
    },
  },
  {
    label: "Cardiomegaly",
    densenet121: {
      f1: 0.2538,
      auc: 0.9136,
      precision: 0.4934,
      recall: 0.1708,
      accuracy: 0.9733,
    },
    resnet152: {
      f1: 0.3037,
      auc: 0.9124,
      precision: 0.5222,
      recall: 0.2141,
      accuracy: 0.9739,
    },
  },
  {
    label: "Consolidation",
    densenet121: {
      f1: 0.0136,
      auc: 0.805,
      precision: 0.7143,
      recall: 0.0068,
      accuracy: 0.9559,
    },
    resnet152: {
      f1: 0.0188,
      auc: 0.8147,
      precision: 0.4375,
      recall: 0.0096,
      accuracy: 0.9556,
    },
  },
  {
    label: "Edema",
    densenet121: {
      f1: 0.0347,
      auc: 0.9016,
      precision: 0.2333,
      recall: 0.0187,
      accuracy: 0.9764,
    },
    resnet152: {
      f1: 0.0837,
      auc: 0.8997,
      precision: 0.3214,
      recall: 0.0481,
      accuracy: 0.9761,
    },
  },
  {
    label: "Effusion",
    densenet121: {
      f1: 0.4221,
      auc: 0.8876,
      precision: 0.6309,
      recall: 0.3171,
      accuracy: 0.9004,
    },
    resnet152: {
      f1: 0.4996,
      auc: 0.8828,
      precision: 0.5395,
      recall: 0.4651,
      accuracy: 0.8931,
    },
  },
  {
    label: "Emphysema",
    densenet121: {
      f1: 0.365,
      auc: 0.9349,
      precision: 0.5591,
      recall: 0.2709,
      accuracy: 0.974,
    },
    resnet152: {
      f1: 0.4202,
      auc: 0.9315,
      precision: 0.511,
      recall: 0.3568,
      accuracy: 0.9729,
    },
  },
  {
    label: "Fibrosis",
    densenet121: {
      f1: 0.047,
      auc: 0.8068,
      precision: 0.2593,
      recall: 0.0258,
      accuracy: 0.9828,
    },
    resnet152: {
      f1: 0.0473,
      auc: 0.8139,
      precision: 0.28,
      recall: 0.0258,
      accuracy: 0.9829,
    },
  },
  {
    label: "Hernia",
    densenet121: {
      f1: 0.25,
      auc: 0.9028,
      precision: 0.3846,
      recall: 0.1852,
      accuracy: 0.9982,
    },
    resnet152: {
      f1: 0.3636,
      auc: 0.8746,
      precision: 0.4706,
      recall: 0.2963,
      accuracy: 0.9983,
    },
  },
  {
    label: "Infiltration",
    densenet121: {
      f1: 0.1381,
      auc: 0.7122,
      precision: 0.4327,
      recall: 0.0822,
      accuracy: 0.8177,
    },
    resnet152: {
      f1: 0.1192,
      auc: 0.7131,
      precision: 0.4706,
      recall: 0.0682,
      accuracy: 0.8207,
    },
  },
  {
    label: "Mass",
    densenet121: {
      f1: 0.3058,
      auc: 0.8415,
      precision: 0.4808,
      recall: 0.2242,
      accuracy: 0.9551,
    },
    resnet152: {
      f1: 0.2966,
      auc: 0.8481,
      precision: 0.5101,
      recall: 0.2091,
      accuracy: 0.9563,
    },
  },
  {
    label: "No Finding",
    densenet121: {
      f1: 0.7494,
      auc: 0.7786,
      precision: 0.7245,
      recall: 0.7762,
      accuracy: 0.7196,
    },
    resnet152: {
      f1: 0.7506,
      auc: 0.7797,
      precision: 0.7233,
      recall: 0.78,
      accuracy: 0.72,
    },
  },
  {
    label: "Nodule",
    densenet121: {
      f1: 0.095,
      auc: 0.7791,
      precision: 0.5632,
      recall: 0.0519,
      accuracy: 0.9434,
    },
    resnet152: {
      f1: 0.1208,
      auc: 0.7707,
      precision: 0.4962,
      recall: 0.0688,
      accuracy: 0.9426,
    },
  },
  {
    label: "Pleural Thickening",
    densenet121: {
      f1: 0.0576,
      auc: 0.8097,
      precision: 0.4054,
      recall: 0.031,
      accuracy: 0.9702,
    },
    resnet152: {
      f1: 0.0546,
      auc: 0.8164,
      precision: 0.4828,
      recall: 0.0289,
      accuracy: 0.9706,
    },
  },
  {
    label: "Pneumonia",
    densenet121: {
      f1: 0,
      auc: 0.7693,
      precision: 0,
      recall: 0,
      accuracy: 0.987,
    },
    resnet152: { f1: 0, auc: 0.748, precision: 0, recall: 0, accuracy: 0.987 },
  },
  {
    label: "Pneumothorax",
    densenet121: {
      f1: 0.2973,
      auc: 0.88,
      precision: 0.5282,
      recall: 0.2069,
      accuracy: 0.957,
    },
    resnet152: {
      f1: 0.2139,
      auc: 0.8803,
      precision: 0.4762,
      recall: 0.1379,
      accuracy: 0.9554,
    },
  },
];
