export const diseaseLibrary = {
  atelectasis: {
    name: "Atelectasis",
    definition:
      "A partial or complete collapse of lung tissue where alveoli deflate or fill with fluid, reducing ventilation in the affected segment.",
    causes: [
      "Airway obstruction from mucus, foreign body, or tumor blocking a bronchus.",
      "Post-surgical shallow breathing and anesthesia-related ventilation changes.",
      "External compression from pleural effusion, pneumothorax, or large mass.",
      "Surfactant deficiency causing alveolar collapse, seen in ARDS or prematurity.",
      "Cicatrisation and traction from prior infections such as tuberculosis or fibrosis.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Atelectasis",
  },
  cardiomegaly: {
    name: "Cardiomegaly",
    definition:
      "An enlarged cardiac silhouette indicating the heart muscle has thickened or dilated secondary to underlying pathology.",
    causes: [
      "Chronic hypertension driving ventricular hypertrophy.",
      "Coronary artery disease weakening myocardium after ischemia.",
      "Valvular heart disease leading to chamber dilation and volume overload.",
      "Primary cardiomyopathies from genetic, viral, or toxic injury.",
      "Congestive heart failure with progressive chamber stretching.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Cardiomegaly",
  },
  consolidation: {
    name: "Consolidation",
    definition:
      "Lung parenchyma that has filled with liquid—such as pus, blood, or water—causing normally aerated tissue to appear dense and solid on imaging.",
    causes: [
      "Bacterial or viral pneumonia producing inflammatory exudate.",
      "Pulmonary edema forcing intravascular fluid into alveoli.",
      "Pulmonary hemorrhage with blood occupying air spaces.",
      "Aspiration of gastric contents triggering chemical pneumonitis.",
      "Endobronchial tumor or malignancy infiltrating alveoli.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pulmonary_consolidation",
  },
  edema: {
    name: "Pulmonary Edema",
    definition:
      "Fluid accumulation within the alveoli and interstitial lung space that impairs gas exchange and causes breathlessness.",
    causes: [
      "Cardiogenic failure from left-sided heart dysfunction.",
      "Hypertensive crisis rapidly elevating pulmonary capillary pressure.",
      "Renal failure with fluid overload and impaired clearance.",
      "Acute respiratory distress syndrome causing capillary leak.",
      "High-altitude pulmonary edema triggered by hypoxic vasoconstriction.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pulmonary_edema",
  },
  effusion: {
    name: "Pleural Effusion",
    definition:
      "Excess fluid collection within the pleural space separating lung from chest wall, often causing dyspnea and blunting of costophrenic angles.",
    causes: [
      "Congestive heart failure elevating hydrostatic pressure.",
      "Parapneumonic effusion or empyema from infection.",
      "Malignancy involving pleura such as lung or breast cancer.",
      "Pulmonary embolism provoking inflammatory exudate.",
      "Cirrhosis with low oncotic pressure and volume shifts.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pleural_effusion",
  },
  emphysema: {
    name: "Emphysema",
    definition:
      "A COPD subtype marked by destruction of alveolar walls and elastic fibers, creating large ineffective air spaces.",
    causes: [
      "Long-term tobacco smoke exposure.",
      "Inherited alpha-1 antitrypsin deficiency.",
      "Chronic inhalation of polluted air or industrial fumes.",
      "Occupational dust exposure in mining, cotton, or grain work.",
      "Age-related cumulative damage to lung parenchyma.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Emphysema",
  },
  fibrosis: {
    name: "Pulmonary Fibrosis",
    definition:
      "Progressive scarring and stiffening of interstitial lung tissue that restricts expansion and oxygen transfer.",
    causes: [
      "Idiopathic pulmonary fibrosis with unknown trigger.",
      "Autoimmune diseases such as rheumatoid arthritis or scleroderma.",
      "Occupational inhalants including silica, asbestos, or mold antigens.",
      "Thoracic radiation therapy damaging lung parenchyma.",
      "Medication toxicity from agents like amiodarone or certain chemotherapies.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pulmonary_fibrosis",
  },
  hernia: {
    name: "Hiatal Hernia",
    definition:
      "Portion of the stomach protruding through the diaphragmatic hiatus into the thoracic cavity, sometimes seen on chest imaging.",
    causes: [
      "Chronic intra-abdominal pressure from coughing or straining.",
      "Obesity increasing diaphragmatic load.",
      "Age-related laxity of diaphragmatic musculature.",
      "Trauma or prior surgery weakening the diaphragm.",
      "Pregnancy-related elevation of intra-abdominal pressure.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Hiatal_hernia",
  },
  infiltration: {
    name: "Pulmonary Infiltrate",
    definition:
      "Non-specific radiographic opacity created when fluid, cells, or other material permeate lung parenchyma.",
    causes: [
      "Community or hospital-acquired pneumonia.",
      "Pulmonary tuberculosis producing granulomatous infection.",
      "Cardiogenic or non-cardiogenic pulmonary edema.",
      "Sarcoidosis or other inflammatory granulomatous disease.",
      "Pulmonary hemorrhage with blood filling alveoli.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pulmonary_infiltrate",
  },
  mass: {
    name: "Pulmonary Mass",
    definition:
      "A lung lesion larger than 3 cm in diameter that may represent neoplasm, infection, or inflammatory process.",
    causes: [
      "Primary lung carcinoma.",
      "Metastatic disease from extrapulmonary malignancy.",
      "Lung abscess or fungal ball such as aspergilloma.",
      "Benign tumors including hamartoma.",
      "Inflammatory pseudotumor related to autoimmune disease.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Lung_nodule",
  },
  noFinding: {
    name: "No Finding",
    definition:
      "Radiologist interpretation indicates no abnormality on current imaging study.",
    causes: ["No pathological indicators detected in this examination."],
    wiki: null,
  },
  nodule: {
    name: "Pulmonary Nodule",
    definition:
      "A rounded lung opacity measuring less than 3 cm, requiring correlation for benign versus malignant causes.",
    causes: [
      "Healed granuloma from prior infection such as tuberculosis.",
      "Early-stage primary lung carcinoma.",
      "Metastatic seeding from distant malignancy.",
      "Benign hamartoma or other non-malignant growth.",
      "Active inflammatory or infectious focus including rheumatoid nodules.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Lung_nodule",
  },
  pleuralThickening: {
    name: "Pleural Thickening",
    definition:
      "Fibrous scarring of pleural membranes that can be focal or diffuse and may restrict lung expansion.",
    causes: [
      "Asbestos exposure producing pleural plaques.",
      "Sequelae of severe pneumonia or tuberculosis with empyema.",
      "Organised hemothorax following chest trauma.",
      "Mesothelioma or metastatic pleural disease.",
      "Autoimmune pleuritis from lupus or rheumatoid arthritis.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pleural_thickening",
  },
  pneumonia: {
    name: "Pneumonia",
    definition:
      "Infection-driven inflammation of alveoli filling them with pus or fluid, reducing oxygen exchange and causing systemic symptoms.",
    causes: [
      "Bacterial pathogens such as Streptococcus pneumoniae.",
      "Viral infections including influenza and RSV.",
      "Aspiration of oropharyngeal or gastric contents.",
      "Opportunistic infections in immunocompromised hosts.",
      "Hospital-acquired or ventilator-associated pathogens.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pneumonia",
  },
  pneumothorax: {
    name: "Pneumothorax",
    definition:
      "Air in the pleural space leading to partial or complete lung collapse and sudden chest pain or dyspnea.",
    causes: [
      "Thoracic trauma rupturing lung tissue.",
      "Primary spontaneous bleb rupture in tall, thin individuals.",
      "Underlying lung disease such as COPD, fibrosis, or severe pneumonia.",
      "Iatrogenic injury from procedures like biopsy or central line placement.",
      "Barotrauma from mechanical ventilation.",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pneumothorax",
  },
};

export const defaultDisease = diseaseLibrary.atelectasis;
