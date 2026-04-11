// ═══════════════════════════════════════════════════════════════════════════
// SUBMARINE CATALYST — Client-Side Data Quality Layer
// sc-data-fix.js — load on every scanner page
//
// What this does:
// 1. Classifies indication from free text (fixes "Infectious" default bug)
// 2. Computes a corrected PoA from the text-classified indication
// 3. Patches any SCANNER_DATA or BUYOUT_DATA in memory before render
// 4. Runs after get-scanner-data response, before renderScanner()
//
// Deploy: add <script src="/js/sc-data-fix.js"></script> to every HTML page
// ═══════════════════════════════════════════════════════════════════════════

(function() {

// ── Indication rates (mirrors score-events v2) ───────────────────────────
var INDICATION_RATES = {
  Oncology: 0.855, Hematology: 0.870, Rare: 0.820,
  Gene_therapy: 0.780, Ophthalmology: 0.740, Dermatology: 0.780,
  Immunology: 0.760, Infectious: 0.800, Metabolic: 0.720,
  Respiratory: 0.750, Gastro: 0.720, Cardiovascular: 0.600,
  Pain: 0.520, Neurology: 0.490, Psychiatry: 0.510,
  Neuromuscular: 0.560, DMD: 0.530, ALS: 0.420,
  Musculoskeletal: 0.650, Unknown: 0.680
};

// ── Text-search indication classifier (mirrors score-events v2) ──────────
function classifyIndication(raw) {
  var t = (raw || '').toLowerCase();

  // Already a valid key — pass through
  if (INDICATION_RATES[raw]) return raw;

  // Ultra-specific first
  if (t.includes('duchenne') || t.includes(' dmd') || t.includes('becker md')) return 'DMD';
  if (t.includes('als') || t.includes('amyotrophic lateral') || t.includes('lou gehrig')) return 'ALS';
  if (t.includes('muscular dystrophy') || t.includes('myopathy') || t.includes('myasthenia') ||
      t.includes('neuropathy') || t.includes('neuromuscular') || t.includes('spinal muscular') ||
      t.includes(' sma') || t.includes('friedreich') || t.includes('facioscapulo')) return 'Neuromuscular';

  // Kidney / nephrology (key bug fix — these were hitting "Infectious")
  if (t.includes('kidney') || t.includes('nephro') || t.includes('renal') ||
      t.includes('igan') || t.includes('iga nephro') || t.includes('fsgs') ||
      t.includes('focal segmental') || t.includes('glomerulo') ||
      t.includes('alport') || t.includes('nephrotic')) return 'Rare';

  // CNS
  if (t.includes('alzheimer') || t.includes('parkinson') || t.includes('huntington') ||
      t.includes('multiple sclerosis') || t.includes('epilep') || t.includes('seizure') ||
      t.includes('migraine') || t.includes('stroke') || t.includes('tremor') ||
      t.includes('neuropathic pain') || t.includes('restless leg') || t.includes('narcolepsy')) return 'Neurology';
  if (t.includes('schizophrenia') || t.includes('bipolar') || t.includes('depression') ||
      t.includes('anxiety') || t.includes('ptsd') || t.includes(' ocd') || t.includes('adhd') ||
      t.includes('autism') || t.includes('psychiatric')) return 'Psychiatry';

  // Oncology
  if (t.includes('cancer') || t.includes('carcinoma') || t.includes('lymphoma') ||
      t.includes('leukemia') || t.includes('melanoma') || t.includes('sarcoma') ||
      t.includes('glioblastoma') || t.includes('myeloma') || t.includes('tumor') ||
      t.includes('oncol') || t.includes('nsclc') || t.includes('hnscc') ||
      t.includes('adenocarci') || t.includes('squamous cell')) return 'Oncology';
  if (t.includes('hematol') || t.includes('myelofibros') || t.includes(' mds') ||
      t.includes(' aml') || t.includes(' cll') || t.includes(' cml') ||
      t.includes('polycythemia') || t.includes('essential thrombocythem')) return 'Hematology';

  // Gene / cell therapy
  if (t.includes('gene therapy') || t.includes('lentiviral') || t.includes(' aav') ||
      t.includes('crispr') || t.includes('car-t') || t.includes('cell therapy') ||
      t.includes('gene editing')) return 'Gene_therapy';

  // Rare / orphan (after more specific catches above)
  if (t.includes(' rare') || t.includes('orphan') || t.includes('ultra-rare') ||
      t.includes('lysosomal') || t.includes('gaucher') || t.includes('fabry') ||
      t.includes('pompe') || t.includes('phenylketonuria') || t.includes(' pku') ||
      t.includes('hemophilia') || t.includes('sickle cell') || t.includes('thalassemia') ||
      t.includes('wilson') || t.includes('hunter syndrome') || t.includes('niemann') ||
      t.includes(' mps') || t.includes('lad-i') || t.includes('hereditary')) return 'Rare';

  // Cardiovascular / metabolic
  if (t.includes('heart failure') || t.includes('cardiac') || t.includes('cardiovascular') ||
      t.includes('atrial fib') || t.includes('hypertension') || t.includes('hyperlipidemia') ||
      t.includes('atherosclerosis') || t.includes('thrombosis') || t.includes('hocm')) return 'Cardiovascular';
  if (t.includes('diabetes') || t.includes('obesity') || t.includes(' nash') ||
      t.includes('nafld') || t.includes('metabolic') || t.includes('lipodystrophy') ||
      t.includes('thyroid') || t.includes('acromegaly') || t.includes('cushing') ||
      t.includes('mash') || t.includes('steatohepatitis')) return 'Metabolic';

  // Infectious (only if genuinely infectious)
  if (t.includes(' hiv') || t.includes('hepatitis') || t.includes('bacterial') ||
      t.includes('fungal') || t.includes('infection') || t.includes('antibiotic') ||
      t.includes('antiviral') || t.includes('tuberculosis') || t.includes(' rsv') ||
      t.includes('influenza') || t.includes('covid') || t.includes('malaria')) return 'Infectious';

  // Immunology
  if (t.includes('psoriasis') || t.includes('rheumatoid') || t.includes('lupus') ||
      t.includes('crohn') || t.includes('ulcerative colitis') || t.includes('atopic') ||
      t.includes('eczema') || t.includes('graft') || t.includes('transplant') ||
      t.includes('autoimmune') || t.includes('sjogren') || t.includes('sarcoidosis') ||
      t.includes('myositis') || t.includes('vasculitis')) return 'Immunology';

  // Respiratory
  if (t.includes('asthma') || t.includes(' copd') || t.includes('pulmonary') ||
      t.includes(' ipf') || t.includes('cystic fibrosis') || t.includes('respiratory') ||
      t.includes('bronchi')) return 'Respiratory';

  // GI
  if (t.includes('gastroparesis') || t.includes(' ibs') || t.includes('gastric') ||
      t.includes('gastroesoph') || t.includes(' gerd') || t.includes('gastrointestinal') ||
      t.includes('constipation') || t.includes('cholestatic') || t.includes('biliary') ||
      t.includes('primary biliary') || t.includes(' pbc') || t.includes('cholangitis')) return 'Gastro';

  // Derm / Optho / MSK / Pain
  if (t.includes('dermat') || t.includes('skin') || t.includes('alopecia') ||
      t.includes('vitiligo') || t.includes('hidradenitis') || t.includes('prurigo')) return 'Dermatology';
  if (t.includes('ophthal') || t.includes('retinal') || t.includes('macular') ||
      t.includes('glaucoma') || t.includes(' eye') || t.includes('dry eye') ||
      t.includes('uveitis')) return 'Ophthalmology';
  if (t.includes('musculoskeletal') || t.includes('osteoporosis') || t.includes('osteoarthritis') ||
      t.includes('fibromyalgia') || t.includes('ankylosing')) return 'Musculoskeletal';
  if (t.includes(' pain') || t.includes('opioid') || t.includes('analgesic') ||
      t.includes('nociceptive')) return 'Pain';

  return 'Unknown';
}

// ── Pathway rate lookup ──────────────────────────────────────────────────
var PATHWAY_RATES = {
  breakthrough: 0.900, priority: 0.810, accelerated: 0.720,
  resubmission: 0.650, snda: 0.800, supplement: 0.800, standard: 0.750
};

function getPathwayRate(notes) {
  var n = (notes || '').toLowerCase();
  if (n.includes('breakthrough')) return PATHWAY_RATES.breakthrough;
  if (n.includes('priority review')) return PATHWAY_RATES.priority;
  if (n.includes('accelerated approval')) return PATHWAY_RATES.accelerated;
  if (n.includes('resubmission') || n.includes('crl')) return PATHWAY_RATES.resubmission;
  if (n.includes('snda') || n.includes('supplemental') || n.includes('label expansion')) return PATHWAY_RATES.snda;
  return PATHWAY_RATES.standard;
}

// ── Modifier detection ────────────────────────────────────────────────────
var MODIFIERS = [
  ['breakthrough therapy', 1.10],
  ['breakthrough', 1.08],
  ['priority review', 1.05],
  ['orphan', 1.04],
  ['rare disease', 1.04],
  ['unmet medical need', 1.03],
  ['no approved therap', 1.04],
  ['pediatric', 1.02],
  ['unanimous', 1.18],
  ['3-month extension', 0.87],
  ['major amendment', 0.88],
  ['resubmission', 0.90],
  ['safety concern', 0.80],
  ['crl', 0.70],
  ['complete response letter', 0.70],
  ['manufacturing', 0.88],
  ['gmp', 0.85],
  ['surrogate endpoint', 0.92],
];

function computePoA(indication, notes, drug) {
  var text = ((notes || '') + ' ' + (drug || '')).toLowerCase();
  var base = INDICATION_RATES[indication] || INDICATION_RATES.Unknown;
  var pathway = getPathwayRate(notes);
  var blended = (base * 0.5) + (pathway * 0.5);

  var mult = 1.0;
  var capMult = 1.35;
  MODIFIERS.forEach(function(m) {
    if (text.includes(m[0])) mult *= m[1];
  });
  mult = Math.min(mult, capMult); // cap stacking (REPL fix)

  var poa = Math.min(0.97, Math.max(0.30, blended * mult));
  return Math.round(poa * 1000) / 10; // e.g. 82.5
}

// ── Drug name → indication lookup ───────────────────────────────────────
// For drugs where the notes don't contain clinical text, look up by drug name
var DRUG_OVERRIDES = {
  // Kidney / Nephrology
  'filspari': 'Rare', 'sparsentan': 'Rare', 'igan': 'Rare', 'fsgs': 'Rare',
  'iptacopan': 'Rare', 'fabhalta': 'Rare',
  // Neuromuscular
  'vamorolone': 'DMD', 'casimersen': 'DMD', 'golodirsen': 'DMD', 'viltolarsen': 'DMD',
  'eteplirsen': 'DMD', 'delandistrogene': 'DMD',
  // Oncology
  'pembrolizumab': 'Oncology', 'keytruda': 'Oncology', 'nivolumab': 'Oncology',
  'opdivo': 'Oncology', 'atezolizumab': 'Oncology', 'durvalumab': 'Oncology',
  'gedatolisib': 'Oncology', 'adagrasib': 'Oncology', 'sotorasib': 'Oncology',
  'cabozantinib': 'Oncology', 'cobimetinib': 'Oncology',
  // Rare / hematology
  'anito-cel': 'Hematology', 'anitocabtagene': 'Hematology',
  'olezarsen': 'Metabolic', 'abelacimab': 'Hematology',
  // Immunology
  'efgartigimod': 'Immunology', 'rozanolixizumab': 'Immunology',
  'imvotex': 'Immunology', 'batoclimab': 'Immunology',
  // Neurology
  'prasinezumab': 'Neurology', 'lecanemab': 'Neurology', 'donanemab': 'Neurology',
};

function drugLookup(drug) {
  var d = (drug || '').toLowerCase();
  for (var key in DRUG_OVERRIDES) {
    if (d.includes(key)) return DRUG_OVERRIDES[key];
  }
  return null;
}

// ── Patch a single event object ───────────────────────────────────────────
function patchEvent(d) {
  if (!d) return d;

  var rawInd = d.indication || '';

  // Build full text for classification
  var fullText = [d.drug || '', d.indication || '', d.notes || '', d.company_name || ''].join(' ');

  // Try drug name lookup first (most reliable)
  var fromDrug = drugLookup(d.drug || d.approved_drug || '');

  // Classify from full text
  var fromText = classifyIndication(fullText);

  // Determine if current stored value is wrong
  var isValidKey = !!INDICATION_RATES[rawInd];
  var isInfectiousDefault = rawInd === 'Infectious' && !isGenuinelyInfectious(d);
  var isGenericUnknown = rawInd === 'Unknown' || rawInd === 'Infectious';

  var shouldPatch = !isValidKey || isInfectiousDefault;

  if (shouldPatch) {
    // Pick best classification: drug lookup > text classification
    var best = fromDrug || (fromText !== 'Unknown' ? fromText : null) || 'Unknown';
    d.indication = best;
    var correctedPoA = computePoA(best, fullText, d.drug);
    d.poa = correctedPoA;
    d._indicationCorrected = true;
  }

  return d;
}

function isGenuinelyInfectious(d) {
  var text = ((d.drug||'') + ' ' + (d.indication||'') + ' ' + (d.notes||'')).toLowerCase();
  return text.includes(' hiv') || text.includes('hepatitis') || text.includes('antibiot') ||
         text.includes('antiviral') || text.includes('infection') || text.includes('bacterial') ||
         text.includes('fungal') || text.includes(' rsv') || text.includes('influenza') ||
         text.includes('covid') || text.includes('tuberculosis');
}

// ── Patch all data arrays ─────────────────────────────────────────────────
function patchAll() {
  if (window.SCANNER_DATA && Array.isArray(window.SCANNER_DATA)) {
    window.SCANNER_DATA = window.SCANNER_DATA.map(patchEvent);
    var fixed = window.SCANNER_DATA.filter(function(d) { return d._indicationCorrected; });
    if (fixed.length > 0) {
      console.log('[SC Fix] Corrected ' + fixed.length + ' indication(s):', fixed.map(function(d) { return d.ticker; }).join(', '));
    }
  }
  if (window.BUYOUT_DATA && Array.isArray(window.BUYOUT_DATA)) {
    window.BUYOUT_DATA = window.BUYOUT_DATA.map(patchEvent);
  }
}

// ── Hook into data load — run before render ───────────────────────────────
// Intercepts the global SCANNER_DATA assignment and re-renders after patch
var _origRenderScanner = null;
var _origRenderBuyout  = null;

function installHooks() {
  _origRenderScanner = window.renderScanner;
  _origRenderBuyout  = window.renderBuyoutGrid;

  if (typeof _origRenderScanner === 'function') {
    window.renderScanner = function() {
      patchAll();
      _origRenderScanner.apply(this, arguments);
    };
  }
  if (typeof _origRenderBuyout === 'function') {
    window.renderBuyoutGrid = function() {
      patchAll();
      _origRenderBuyout.apply(this, arguments);
    };
  }
}

// ── Run on load ───────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(installHooks, 50);
  });
} else {
  setTimeout(installHooks, 50);
}

// Also expose for manual use
window.SC_patchAll = patchAll;
window.SC_classifyIndication = classifyIndication;

})();
