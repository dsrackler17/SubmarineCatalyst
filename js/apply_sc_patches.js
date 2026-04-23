#!/usr/bin/env node
/* eslint-disable no-console */
// ============================================================================
// apply_sc_patches.js — Phase 3 display overhaul for Submarine Catalyst
// ----------------------------------------------------------------------------
// Usage:
//   cd /path/to/SubmarineCatalyst
//   node apply_sc_patches.js
//
// Applies 15 surgical str_replace edits across:
//   dashboard.html, catalyst-detail.html, calendar.html
//
// Each edit:
//   · Reads the file
//   · Verifies the old_str appears exactly once
//   · Substitutes new_str
//   · Writes back
//   · Reports PASS / FAIL with file name + patch label
//
// If a patch fails, the file is NOT written. Re-run after fixing upstream.
// ============================================================================

const fs = require('fs');
const path = require('path');

const REPO = process.cwd();
const FILES = {
  dashboard: path.join(REPO, 'dashboard.html'),
  detail:    path.join(REPO, 'catalyst-detail.html'),
  calendar:  path.join(REPO, 'calendar.html'),
};

// Verify all target files exist before starting
for (const [k, p] of Object.entries(FILES)) {
  if (!fs.existsSync(p)) {
    console.error(`\n✗ Missing ${k} at ${p}`);
    console.error(`  Run this script from your SubmarineCatalyst repo root.\n`);
    process.exit(1);
  }
}

const patches = [];

// ============================================================================
// DASHBOARD PATCHES
// ============================================================================

// D1 — Extend SCANNER_DATA mapping with CMC v2 + STN v3 fields
patches.push({
  label: 'D1 · dashboard · extend SCANNER_DATA mapping',
  file: FILES.dashboard,
  old_str: `          ticker_role: e.ticker_role || 'primary',
          primary_ticker: e.primary_ticker || '',
          is_primary_ticker: e.is_primary_ticker !== false,
        };`,
  new_str: `          ticker_role: e.ticker_role || 'primary',
          primary_ticker: e.primary_ticker || '',
          is_primary_ticker: e.is_primary_ticker !== false,
          // ─── CMC v2 (v4.4) ─────────────────────────────────────────────
          formulation_class: e.formulation_class || 'UNKNOWN',
          cmc_score: Number(e.cmc_score) || 0,
          clinical_poa: Number(e.clinical_poa) || 0,
          operational_poa: Number(e.operational_poa) || 0,
          cmc_haircut_pct: Number(e.cmc_haircut_pct) || 0,
          runway_trustworthy: e.runway_trustworthy !== false,
          // ─── STN v3 market signals (v4.5) ──────────────────────────────
          rsi_14d: e.rsi_14d != null ? Number(e.rsi_14d) : null,
          price_change_90d: e.price_change_90d != null ? Number(e.price_change_90d) : null,
          volume_climax_flag: e.volume_climax_flag === true,
          analyst_target_avg: e.analyst_target_avg != null ? Number(e.analyst_target_avg) : null,
          analyst_target_proximity_pct: e.analyst_target_proximity_pct != null ? Number(e.analyst_target_proximity_pct) : null,
          analyst_recommendation_mean: e.analyst_recommendation_mean != null ? Number(e.analyst_recommendation_mean) : null,
          // ─── STN v3 pathway / calendar flags ───────────────────────────
          pdufa_is_friday_pm: e.pdufa_is_friday_pm === true,
          is_nce: e.is_nce === true,
          is_505b2: e.is_505b2 === true,
          first_time_approver: e.first_time_approver === true,
        };`,
});

// D2 — Add CMC-Haircut sort option
patches.push({
  label: 'D2 · dashboard · add sort option for CMC haircut',
  file: FILES.dashboard,
  old_str: `          <option value="trend30d">Sort: 30D Trend ↓</option>`,
  new_str: `          <option value="trend30d">Sort: 30D Trend ↓</option>
          <option value="trend90d">Sort: 90D Trend ↓</option>
          <option value="cmc_haircut">Sort: CMC Haircut ↓</option>
          <option value="rsi">Sort: RSI ↓</option>`,
});

// D3 — Wire the three new sort options into the switch
patches.push({
  label: 'D3 · dashboard · add switch cases for new sorts',
  file: FILES.dashboard,
  old_str: `      case 'trend30d':  return ((PRICE_DATA[b.ticker]||{}).change30d||0) - ((PRICE_DATA[a.ticker]||{}).change30d||0);
      default:          return (b.net_edge_adj || 0) - (a.net_edge_adj || 0);`,
  new_str: `      case 'trend30d':  return ((PRICE_DATA[b.ticker]||{}).change30d||0) - ((PRICE_DATA[a.ticker]||{}).change30d||0);
      case 'trend90d':  return (Number(b.price_change_90d)||-999) - (Number(a.price_change_90d)||-999);
      case 'cmc_haircut': return (Number(b.cmc_haircut_pct)||0) - (Number(a.cmc_haircut_pct)||0);
      case 'rsi':       return (Number(b.rsi_14d)||0) - (Number(a.rsi_14d)||0);
      default:          return (b.net_edge_adj || 0) - (a.net_edge_adj || 0);`,
});

// D4 — Inject CMC + pathway row into scanner card, just above expected_move
patches.push({
  label: 'D4 · dashboard · card CMC/pathway row',
  file: FILES.dashboard,
  old_str: `        \${d.expected_move ? '<div style="font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-top:0.5rem;line-height:1.5;padding:0.5rem;background:rgba(0,212,255,0.03);border-left:2px solid ' + (d.sell_news_risk === 'HIGH' ? 'var(--red)' : d.sell_news_risk === 'ELEVATED' ? 'var(--amber)' : 'var(--accent2)') + ';">' + d.expected_move + '</div>' : ''}`,
  new_str: `        \${(() => {
          // CMC v2 split-PoA row — only shown when haircut is material
          var haircut = Number(d.cmc_haircut_pct) || 0;
          var clinical = Number(d.clinical_poa) || 0;
          var operational = Number(d.operational_poa) || 0;
          var formulation = d.formulation_class || 'UNKNOWN';
          if (haircut < 8 && formulation === 'SMALL_MOLECULE') return '';
          if (haircut < 8 && formulation === 'UNKNOWN') return '';
          var hairColor = haircut >= 25 ? 'var(--red)' : haircut >= 12 ? 'var(--amber)' : 'var(--accent)';
          var formLabels = {
            'NANOPARTICLE':'🧪 Nanoparticle',
            'CELL_THERAPY':'🧫 Cell therapy',
            'GENE_THERAPY':'🧬 Gene therapy',
            'BIOLOGIC':'🔬 Biologic',
            'INJECTABLE_STERILE':'💉 Sterile injectable',
            'SMALL_MOLECULE':'💊 Small molecule',
          };
          var formLbl = formLabels[formulation] || '❓ Unknown formulation';
          var parts = [
            '<span style="color:var(--muted);">' + formLbl + '</span>'
          ];
          if (clinical > 0 && operational > 0 && haircut > 0) {
            parts.push('Clinical <strong style="color:var(--accent);">' + clinical.toFixed(1) + '%</strong> → Op <strong style="color:' + hairColor + ';">' + operational.toFixed(1) + '%</strong> <span style="color:' + hairColor + ';">(−' + haircut.toFixed(1) + '%)</span>');
          }
          if (d.runway_trustworthy === false) parts.push('<span style="color:var(--red);">🚨 runway anomaly</span>');
          return '<div style="font-family:var(--mono);font-size:0.58rem;padding:0.4rem 0.55rem;background:rgba(255,255,255,0.02);border:1px solid var(--border);margin-bottom:0.4rem;line-height:1.7;">' + parts.join(' · ') + '</div>';
        })()}
        \${(() => {
          // STN v3 pathway / calendar pills — only shown when at least one flag fires
          var chips = [];
          if (d.first_time_approver === true) chips.push('<span style="color:var(--amber);">🆕 first-time approver</span>');
          if (d.pdufa_is_friday_pm === true) chips.push('<span style="color:var(--amber);">📅 Friday PDUFA</span>');
          if (d.is_505b2 === true) chips.push('<span style="color:var(--muted);">🧾 505(b)(2)</span>');
          else if (d.is_nce === true) chips.push('<span style="color:var(--accent);">✨ NCE</span>');
          if (d.volume_climax_flag === true) chips.push('<span style="color:var(--red);">📊 volume climax</span>');
          var rsi = Number(d.rsi_14d) || 0;
          if (rsi >= 75) chips.push('<span style="color:var(--red);">RSI ' + rsi.toFixed(0) + '</span>');
          else if (rsi > 0 && rsi <= 35) chips.push('<span style="color:var(--accent2);">RSI ' + rsi.toFixed(0) + '</span>');
          var prox = Number(d.analyst_target_proximity_pct) || 0;
          if (prox >= 90) chips.push('<span style="color:var(--amber);">at target ' + prox.toFixed(0) + '%</span>');
          else if (prox > 0 && prox <= 60) chips.push('<span style="color:var(--accent2);">' + prox.toFixed(0) + '% of target</span>');
          if (chips.length === 0) return '';
          return '<div style="font-family:var(--mono);font-size:0.58rem;padding:0.35rem 0.55rem;margin-bottom:0.4rem;line-height:1.7;">' + chips.join(' · ') + '</div>';
        })()}
        \${d.expected_move ? '<div style="font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-top:0.5rem;line-height:1.5;padding:0.5rem;background:rgba(0,212,255,0.03);border-left:2px solid ' + (d.sell_news_risk === 'HIGH' ? 'var(--red)' : d.sell_news_risk === 'ELEVATED' ? 'var(--amber)' : 'var(--accent2)') + ';">' + d.expected_move + '</div>' : ''}`,
});

// ============================================================================
// CATALYST-DETAIL PATCHES
// ============================================================================

// C1 — Extend eventData hydration in Step 1 (pdufa_events direct query)
patches.push({
  label: 'C1 · detail · extend pdufa_events direct-query hydration',
  file: FILES.detail,
  old_str: `        innovation_score: Number(chosen.innovation_score) || 0,
        innovation_factor: Number(chosen.innovation_factor) || 1.0,
        innovation_flags: chosen.innovation_flags || [],
        appreciation_signals: chosen.appreciation_signals || [],
      };`,
  new_str: `        innovation_score: Number(chosen.innovation_score) || 0,
        innovation_factor: Number(chosen.innovation_factor) || 1.0,
        innovation_flags: chosen.innovation_flags || [],
        appreciation_signals: chosen.appreciation_signals || [],
        // ─── CMC v2 (v4.4) ─────────────────────────────────────────────
        formulation_class: chosen.formulation_class || 'UNKNOWN',
        cmc_score: Number(chosen.cmc_score) || 0,
        clinical_poa: Number(chosen.clinical_poa) || 0,
        operational_poa: Number(chosen.operational_poa) || 0,
        cmc_haircut_pct: Number(chosen.cmc_haircut_pct) || 0,
        runway_trustworthy: chosen.runway_trustworthy !== false,
        // ─── STN v3 market signals (v4.5) ──────────────────────────────
        rsi_14d: chosen.rsi_14d != null ? Number(chosen.rsi_14d) : null,
        price_change_90d: chosen.price_change_90d != null ? Number(chosen.price_change_90d) : null,
        volume_climax_flag: chosen.volume_climax_flag === true,
        analyst_target_avg: chosen.analyst_target_avg != null ? Number(chosen.analyst_target_avg) : null,
        analyst_target_proximity_pct: chosen.analyst_target_proximity_pct != null ? Number(chosen.analyst_target_proximity_pct) : null,
        analyst_recommendation_mean: chosen.analyst_recommendation_mean != null ? Number(chosen.analyst_recommendation_mean) : null,
        pdufa_is_friday_pm: chosen.pdufa_is_friday_pm === true,
        is_nce: chosen.is_nce === true,
        is_505b2: chosen.is_505b2 === true,
        first_time_approver: chosen.first_time_approver === true,
      };`,
});

// C2 — Extend eventData hydration in Step 2 (get-scanner-data fallback)
patches.push({
  label: 'C2 · detail · extend get-scanner-data fallback hydration',
  file: FILES.detail,
  old_str: `          innovation_score: Number(e.innovation_score) || 0,
          innovation_factor: Number(e.innovation_factor) || 1.0,
          innovation_flags: e.innovation_flags || [],
          appreciation_signals: e.appreciation_signals || [],
        };
        if (result.isPaid === false) isPaid = false;`,
  new_str: `          innovation_score: Number(e.innovation_score) || 0,
          innovation_factor: Number(e.innovation_factor) || 1.0,
          innovation_flags: e.innovation_flags || [],
          appreciation_signals: e.appreciation_signals || [],
          formulation_class: e.formulation_class || 'UNKNOWN',
          cmc_score: Number(e.cmc_score) || 0,
          clinical_poa: Number(e.clinical_poa) || 0,
          operational_poa: Number(e.operational_poa) || 0,
          cmc_haircut_pct: Number(e.cmc_haircut_pct) || 0,
          runway_trustworthy: e.runway_trustworthy !== false,
          rsi_14d: e.rsi_14d != null ? Number(e.rsi_14d) : null,
          price_change_90d: e.price_change_90d != null ? Number(e.price_change_90d) : null,
          volume_climax_flag: e.volume_climax_flag === true,
          analyst_target_avg: e.analyst_target_avg != null ? Number(e.analyst_target_avg) : null,
          analyst_target_proximity_pct: e.analyst_target_proximity_pct != null ? Number(e.analyst_target_proximity_pct) : null,
          analyst_recommendation_mean: e.analyst_recommendation_mean != null ? Number(e.analyst_recommendation_mean) : null,
          pdufa_is_friday_pm: e.pdufa_is_friday_pm === true,
          is_nce: e.is_nce === true,
          is_505b2: e.is_505b2 === true,
          first_time_approver: e.first_time_approver === true,
        };
        if (result.isPaid === false) isPaid = false;`,
});

// C3 — Upgrade renderCMC to surface split PoA + formulation badge + v3 pathway
patches.push({
  label: 'C3 · detail · upgrade renderCMC (split PoA + formulation)',
  file: FILES.detail,
  old_str: `function renderCMC(d) {
  var risk = (d.cmc_risk || '—').toUpperCase();
  var riskColor = {
    'LOW': 'var(--accent2)', 'MINIMAL': 'var(--accent2)',
    'MODERATE': 'var(--amber)',
    'HIGH': 'var(--red)', 'EXTREME': 'var(--red)',
    'UNKNOWN': 'var(--muted)', '—': 'var(--muted)', '': 'var(--muted)'
  }[risk] || 'var(--muted)';
  var riskEmoji = {
    'LOW': '✅', 'MINIMAL': '✅',
    'MODERATE': '🟡',
    'HIGH': '🚨', 'EXTREME': '🚨',
    'UNKNOWN': '❓', '—': '❓', '': '❓'
  }[risk] || '❓';

  var contextLine = '';
  if (risk === 'LOW' || risk === 'MINIMAL') {
    contextLine = 'CMC-only CRL recovery setups historically resubmit at 88% success vs 58% for clinical CRLs. Low CMC risk = cleanest recovery profile.';
  } else if (risk === 'MODERATE') {
    contextLine = 'Some CMC exposure flagged. Still higher base rate than clinical CRLs, but not the cleanest recovery setup. Watch the resubmission class (Class 1 = 2 months, Class 2 = 6 months).';
  } else if (risk === 'HIGH' || risk === 'EXTREME') {
    contextLine = 'Significant CMC concerns flagged. Resubmission cycle may require plant inspection, BLA/NDA amendment, or supplemental data. Timeline extends materially beyond the standard Class 2 resubmission window.';
  } else {
    contextLine = 'CMC risk not yet classified. If this is a resubmission or post-CRL setup, check the flags below for manufacturing language.';
  }

  var riskBar =
    '<div class="bar-row">' +
      '<span class="bar-label">CMC Risk Level</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' +
        (risk === 'LOW' || risk === 'MINIMAL' ? 25 : risk === 'MODERATE' ? 55 : risk === 'HIGH' || risk === 'EXTREME' ? 90 : 10) +
        '%;background:' + riskColor + ';"></div></div>' +
      '<span class="bar-val" style="color:' + riskColor + ';">' + riskEmoji + ' ' + risk + '</span>' +
    '</div>';

  var flags = Array.isArray(d.cmc_flags) ? d.cmc_flags : [];
  var flagsHTML = '';
  if (flags.length > 0) {
    flagsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">CMC Signal Flags</div>' +
      flags.map(function(f) {
        return '<div class="flag-item" style="border-color:rgba(0,212,255,0.08);">' + escapeHtml(String(f)) + '</div>';
      }).join('');
  }

  var contextBox =
    '<div style="font-family:var(--mono);font-size:0.72rem;color:var(--text);padding:0.75rem 0.85rem;background:rgba(0,212,255,0.03);border-left:2px solid ' + riskColor + ';margin-top:1rem;line-height:1.7;letter-spacing:0.02em;">' +
      escapeHtml(contextLine) +
    '</div>';

  return riskBar + flagsHTML + contextBox;
}`,
  new_str: `function renderCMC(d) {
  var risk = (d.cmc_risk || '—').toUpperCase();
  var riskColor = {
    'LOW': 'var(--accent2)', 'MINIMAL': 'var(--accent2)',
    'MODERATE': 'var(--amber)',
    'ELEVATED': 'var(--amber)',
    'HIGH': 'var(--red)', 'EXTREME': 'var(--red)',
    'UNKNOWN': 'var(--muted)', '—': 'var(--muted)', '': 'var(--muted)'
  }[risk] || 'var(--muted)';
  var riskEmoji = {
    'LOW': '✅', 'MINIMAL': '✅',
    'MODERATE': '🟡', 'ELEVATED': '🟡',
    'HIGH': '🚨', 'EXTREME': '🚨',
    'UNKNOWN': '❓', '—': '❓', '': '❓'
  }[risk] || '❓';

  // ─── Formulation badge (v4.4) ─────────────────────────────────────
  var formulation = (d.formulation_class || 'UNKNOWN').toUpperCase();
  var formLabels = {
    'NANOPARTICLE':       { emoji: '🧪', label: 'Nanoparticle formulation', color: 'var(--amber)', context: 'Nanoparticles require tight control of particle size, PDI, and zeta potential. The GRCE CRL was a nanoparticle CMC failure — this formulation class carries a +25% CMC baseline in the scoring model.' },
    'CELL_THERAPY':       { emoji: '🧫', label: 'Cell therapy', color: 'var(--red)', context: 'Autologous/allogeneic cell therapies carry extreme CMC complexity. Release testing, vector integrity, and chain-of-custody tracking are historically failure-prone. +30 CMC baseline.' },
    'GENE_THERAPY':       { emoji: '🧬', label: 'Gene therapy (AAV/lentiviral)', color: 'var(--red)', context: 'AAV/lentiviral gene therapy CMC failures are well-documented. Vector productivity, capsid content, and potency assays drive most FDA pushback. +30 CMC baseline.' },
    'BIOLOGIC':           { emoji: '🔬', label: 'Biologic / monoclonal antibody', color: 'var(--amber)', context: 'Biologics require rigorous upstream/downstream control, host cell residuals, and comparability between clinical and commercial lots. +20 CMC baseline.' },
    'INJECTABLE_STERILE': { emoji: '💉', label: 'Sterile injectable', color: 'var(--accent)', context: 'Sterile injectables add sterility assurance, container closure integrity, and particulate controls on top of small-molecule CMC. +10 CMC baseline.' },
    'SMALL_MOLECULE':     { emoji: '💊', label: 'Small molecule', color: 'var(--accent2)', context: 'Small molecules have the cleanest CMC baseline. No formulation-driven haircut applied.' },
    'UNKNOWN':            { emoji: '❓', label: 'Formulation unclassified', color: 'var(--muted)', context: 'Insufficient text to classify formulation. CMC scoring falls back to flag/CRL signals only.' },
  };
  var form = formLabels[formulation] || formLabels.UNKNOWN;
  var formBadge =
    '<div style="display:inline-flex;align-items:center;gap:0.5rem;font-family:var(--mono);font-size:0.68rem;padding:0.35rem 0.7rem;background:rgba(0,212,255,0.04);border:1px solid ' + form.color + ';color:' + form.color + ';margin-bottom:1rem;letter-spacing:0.04em;">' +
      form.emoji + ' ' + form.label.toUpperCase() +
    '</div>';

  // ─── Split PoA bars (v4.4) ────────────────────────────────────────
  var clinicalPoA = Number(d.clinical_poa) || 0;
  var operationalPoA = Number(d.operational_poa) || 0;
  var haircutPct = Number(d.cmc_haircut_pct) || 0;
  var splitBars = '';
  if (clinicalPoA > 0 && operationalPoA > 0) {
    var hairColor = haircutPct >= 25 ? 'var(--red)' : haircutPct >= 12 ? 'var(--amber)' : 'var(--accent)';
    splitBars =
      '<div class="bar-row">' +
        '<span class="bar-label">Clinical PoA (science)</span>' +
        '<div class="bar-track"><div class="bar-fill green" style="width:' + Math.min(100, clinicalPoA) + '%"></div></div>' +
        '<span class="bar-val green">' + clinicalPoA.toFixed(1) + '%</span>' +
      '</div>' +
      '<div class="bar-row">' +
        '<span class="bar-label" style="color:' + hairColor + ';">CMC Haircut</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, haircutPct * 2) + '%;background:' + hairColor + ';"></div></div>' +
        '<span class="bar-val" style="color:' + hairColor + ';">−' + haircutPct.toFixed(1) + '%</span>' +
      '</div>' +
      '<div class="bar-row">' +
        '<span class="bar-label" style="color:var(--white);font-weight:700;">Operational PoA</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, operationalPoA) + '%;background:var(--white);"></div></div>' +
        '<span class="bar-val" style="color:var(--white);font-weight:700;">' + operationalPoA.toFixed(1) + '%</span>' +
      '</div>' +
      '<div style="font-family:var(--mono);font-size:0.6rem;color:var(--muted);margin:0.5rem 0 1rem;letter-spacing:0.04em;line-height:1.5;">' +
        'Clinical PoA is what the science alone supports. Operational PoA is what the manufacturing profile actually supports. The delta is the CMC haircut.' +
      '</div>' +
      '<hr class="bar-divider">';
  }

  var contextLine = '';
  if (risk === 'LOW' || risk === 'MINIMAL') {
    contextLine = 'CMC-only CRL recovery setups historically resubmit at 88% success vs 58% for clinical CRLs. Low CMC risk = cleanest recovery profile.';
  } else if (risk === 'MODERATE' || risk === 'ELEVATED') {
    contextLine = 'Some CMC exposure flagged. Still higher base rate than clinical CRLs, but not the cleanest recovery setup. Watch the resubmission class (Class 1 = 2 months, Class 2 = 6 months).';
  } else if (risk === 'HIGH' || risk === 'EXTREME') {
    contextLine = 'Significant CMC concerns flagged. Resubmission cycle may require plant inspection, BLA/NDA amendment, or supplemental data. Timeline extends materially beyond the standard Class 2 resubmission window.';
  } else {
    contextLine = 'CMC risk not yet classified. If this is a resubmission or post-CRL setup, check the flags below for manufacturing language.';
  }

  var cmcScore = Number(d.cmc_score) || 0;
  var cmcScorePct = Math.min(100, cmcScore);
  var riskBar =
    '<div class="bar-row">' +
      '<span class="bar-label">CMC Risk (score ' + cmcScore + '/100)</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + cmcScorePct + '%;background:' + riskColor + ';"></div></div>' +
      '<span class="bar-val" style="color:' + riskColor + ';">' + riskEmoji + ' ' + risk + '</span>' +
    '</div>';

  var flags = Array.isArray(d.cmc_flags) ? d.cmc_flags : [];
  var flagsHTML = '';
  if (flags.length > 0) {
    flagsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">CMC Signal Flags</div>' +
      flags.map(function(f) {
        return '<div class="flag-item" style="border-color:rgba(0,212,255,0.08);">' + escapeHtml(String(f)) + '</div>';
      }).join('');
  }

  // Runway anomaly surface
  var runwayBlock = '';
  if (d.runway_trustworthy === false) {
    runwayBlock =
      '<div style="font-family:var(--mono);font-size:0.68rem;color:var(--red);padding:0.75rem 0.85rem;background:rgba(255,68,68,0.06);border-left:2px solid var(--red);margin-top:1rem;line-height:1.6;">' +
        '🚨 RUNWAY ANOMALY — reported runway is high but no commercial capex/inventory signal detected near PDUFA. Likely a zero-debt accounting artifact rather than genuine operational readiness. Do not treat the runway number as a positive.' +
      '</div>';
  }

  var formContextBox =
    '<div style="font-family:var(--mono);font-size:0.7rem;color:var(--text);padding:0.6rem 0.8rem;background:rgba(255,255,255,0.02);border-left:2px solid ' + form.color + ';margin:0.5rem 0 1rem;line-height:1.6;">' +
      escapeHtml(form.context) +
    '</div>';

  var contextBox =
    '<div style="font-family:var(--mono);font-size:0.72rem;color:var(--text);padding:0.75rem 0.85rem;background:rgba(0,212,255,0.03);border-left:2px solid ' + riskColor + ';margin-top:1rem;line-height:1.7;letter-spacing:0.02em;">' +
      escapeHtml(contextLine) +
    '</div>';

  return formBadge + formContextBox + splitBars + riskBar + flagsHTML + runwayBlock + contextBox;
}`,
});

// C4 — Upgrade the Approval Probability Breakdown to surface split PoA when available
patches.push({
  label: 'C4 · detail · PoA breakdown uses clinical/operational when available',
  file: FILES.detail,
  old_str: `  document.getElementById('poa-bars').innerHTML = [
    {label: 'Indication (' + (d.indication || 'Unknown') + ')', pct: Math.min(100, d.poa * 1.05), color: 'green', val: (d.poa || 0).toFixed(1) + '%'},
    {label: 'Review pathway (' + (d.type || 'Standard') + ')', pct: 75, color: '', val: d.type || 'Standard'},
    {label: 'Final PoA composite', pct: d.poa || 50, color: d.poa >= 75 ? 'green' : d.poa >= 55 ? '' : 'amber', val: (d.poa || 0).toFixed(1) + '%'},
  ].map(function(b) {
    return '<div class="bar-row"><span class="bar-label">' + b.label + '</span><div class="bar-track"><div class="bar-fill ' + b.color + '" style="width:' + b.pct + '%"></div></div><span class="bar-val ' + b.color + '">' + b.val + '</span></div>';
  }).join('');`,
  new_str: `  (function() {
    var clinicalPoA = Number(d.clinical_poa) || 0;
    var operationalPoA = Number(d.operational_poa) || 0;
    var haircut = Number(d.cmc_haircut_pct) || 0;
    var hairColor = haircut >= 25 ? 'red' : haircut >= 12 ? 'amber' : haircut > 0 ? 'green' : 'green';
    var rows;
    if (clinicalPoA > 0 && operationalPoA > 0) {
      // v4.4 split PoA display — the CMC overhaul's headline visualization
      rows = [
        {label: 'Indication base (' + (d.indication || 'Unknown') + ')', pct: Math.min(100, (d.poa || 0) * 1.05), color: 'green', val: (d.poa || 0).toFixed(1) + '%'},
        {label: 'Review pathway (' + (d.type || 'Standard') + ')', pct: 75, color: '', val: d.type || 'Standard'},
        {label: 'Clinical PoA (science)', pct: clinicalPoA, color: 'green', val: clinicalPoA.toFixed(1) + '%'},
        {label: 'CMC Haircut', pct: Math.min(100, haircut * 2), color: hairColor, val: '−' + haircut.toFixed(1) + '%'},
        {label: 'Operational PoA (headline)', pct: operationalPoA, color: operationalPoA >= 75 ? 'green' : operationalPoA >= 55 ? '' : 'amber', val: operationalPoA.toFixed(1) + '%'},
      ];
    } else {
      rows = [
        {label: 'Indication (' + (d.indication || 'Unknown') + ')', pct: Math.min(100, d.poa * 1.05), color: 'green', val: (d.poa || 0).toFixed(1) + '%'},
        {label: 'Review pathway (' + (d.type || 'Standard') + ')', pct: 75, color: '', val: d.type || 'Standard'},
        {label: 'Final PoA composite', pct: d.poa || 50, color: d.poa >= 75 ? 'green' : d.poa >= 55 ? '' : 'amber', val: (d.poa || 0).toFixed(1) + '%'},
      ];
    }
    document.getElementById('poa-bars').innerHTML = rows.map(function(b) {
      return '<div class="bar-row"><span class="bar-label">' + b.label + '</span><div class="bar-track"><div class="bar-fill ' + b.color + '" style="width:' + b.pct + '%"></div></div><span class="bar-val ' + b.color + '">' + b.val + '</span></div>';
    }).join('');
  })();`,
});

// C5 — Surface CMC score / formulation / pathway in the Key Metrics sidebar
patches.push({
  label: 'C5 · detail · key metrics includes new v4.4/v4.5 fields',
  file: FILES.detail,
  old_str: `  if (cmcRisk && cmcRisk !== 'UNKNOWN' && cmcRisk !== '—' && cmcRisk !== '') {
    metricRows.push(['CMC Risk', cmcRisk]);
  }`,
  new_str: `  if (cmcRisk && cmcRisk !== 'UNKNOWN' && cmcRisk !== '—' && cmcRisk !== '') {
    metricRows.push(['CMC Risk', cmcRisk]);
  }
  // ─── CMC v2 (v4.4) ──────────────────────────────────────────────────
  var cmcScoreVal = Number(d.cmc_score) || 0;
  if (cmcScoreVal > 0) metricRows.push(['CMC Score', cmcScoreVal + '/100']);
  var formulationClass = d.formulation_class;
  if (formulationClass && formulationClass !== 'UNKNOWN' && formulationClass !== 'SMALL_MOLECULE') {
    metricRows.push(['Formulation', formulationClass.replace(/_/g, ' ')]);
  }
  var clinPoA = Number(d.clinical_poa) || 0;
  var opPoA = Number(d.operational_poa) || 0;
  var hairPct = Number(d.cmc_haircut_pct) || 0;
  if (clinPoA > 0 && opPoA > 0) {
    metricRows.push(['Clinical PoA', clinPoA.toFixed(1) + '%']);
    metricRows.push(['Operational PoA', opPoA.toFixed(1) + '%']);
    if (hairPct > 0) metricRows.push(['CMC Haircut', '−' + hairPct.toFixed(1) + '%']);
  }
  if (d.runway_trustworthy === false) {
    metricRows.push(['Runway', '🚨 ANOMALY']);
  }
  // ─── STN v3 (v4.5) ─────────────────────────────────────────────────
  var rsiVal = Number(d.rsi_14d);
  if (rsiVal && rsiVal > 0) metricRows.push(['RSI (14D)', rsiVal.toFixed(1)]);
  var p90 = Number(d.price_change_90d);
  if (p90 !== 0 && !isNaN(p90) && p90 !== null) {
    metricRows.push(['90D Change', (p90 >= 0 ? '+' : '') + p90.toFixed(1) + '%']);
  }
  if (d.volume_climax_flag === true) metricRows.push(['Volume Climax', '🚨 YES']);
  var prox = Number(d.analyst_target_proximity_pct);
  if (prox && prox > 0) metricRows.push(['Analyst Target Prox', prox.toFixed(0) + '%']);
  var rec = Number(d.analyst_recommendation_mean);
  if (rec && rec > 0) metricRows.push(['Analyst Rec', rec.toFixed(2) + ' (1=strong buy, 5=strong sell)']);
  if (d.first_time_approver === true) metricRows.push(['First-Time Approver', '🆕 YES']);
  if (d.pdufa_is_friday_pm === true) metricRows.push(['Friday PDUFA', '📅 YES']);
  if (d.is_505b2 === true) metricRows.push(['Pathway', '505(b)(2)']);
  else if (d.is_nce === true) metricRows.push(['Pathway', 'NCE']);`,
});

// C6 — shouldRenderCMC should also return true when formulation_class or cmc_score indicates relevance
patches.push({
  label: 'C6 · detail · shouldRenderCMC respects formulation_class/cmc_score',
  file: FILES.detail,
  old_str: `function shouldRenderCMC(d) {
  var risk = (d.cmc_risk || '').toUpperCase();
  var hasRisk = risk && risk !== 'UNKNOWN' && risk !== '—' && risk !== '';
  var hasFlags = Array.isArray(d.cmc_flags) && d.cmc_flags.length > 0;
  var flagsStr = ((d.flags || []).concat(d.cmc_flags || [])).join(' ').toLowerCase();
  var typeStr = (d.type || '').toLowerCase();
  var notesStr = (d.notes || '').toLowerCase();
  var cmcContext = flagsStr.indexOf('cmc') >= 0 || flagsStr.indexOf('manufacturing') >= 0 ||
                   typeStr.indexOf('resubmission') >= 0 || typeStr.indexOf('class 2') >= 0 ||
                   typeStr.indexOf('class 1') >= 0 || notesStr.indexOf('post-crl') >= 0;
  return hasRisk || hasFlags || cmcContext;
}`,
  new_str: `function shouldRenderCMC(d) {
  var risk = (d.cmc_risk || '').toUpperCase();
  var hasRisk = risk && risk !== 'UNKNOWN' && risk !== '—' && risk !== '';
  var hasFlags = Array.isArray(d.cmc_flags) && d.cmc_flags.length > 0;
  var flagsStr = ((d.flags || []).concat(d.cmc_flags || [])).join(' ').toLowerCase();
  var typeStr = (d.type || '').toLowerCase();
  var notesStr = (d.notes || '').toLowerCase();
  var cmcContext = flagsStr.indexOf('cmc') >= 0 || flagsStr.indexOf('manufacturing') >= 0 ||
                   typeStr.indexOf('resubmission') >= 0 || typeStr.indexOf('class 2') >= 0 ||
                   typeStr.indexOf('class 1') >= 0 || notesStr.indexOf('post-crl') >= 0;
  // v4.4: also render when formulation class or CMC score give us signal
  var formulation = (d.formulation_class || 'UNKNOWN').toUpperCase();
  var hasFormulationSignal = formulation && formulation !== 'UNKNOWN' && formulation !== 'SMALL_MOLECULE';
  var hasCmcScore = Number(d.cmc_score) >= 15;
  var hasHaircut = Number(d.cmc_haircut_pct) >= 5;
  var runwayFlagged = d.runway_trustworthy === false;
  return hasRisk || hasFlags || cmcContext || hasFormulationSignal || hasCmcScore || hasHaircut || runwayFlagged;
}`,
});

// ============================================================================
// CALENDAR PATCHES
// ============================================================================

// CA1 — Extend pdufa_events Supabase select so new columns reach the table
patches.push({
  label: 'CA1 · calendar · extend pdufa_events .select() to include v4.4/v4.5 fields',
  file: FILES.calendar,
  old_str: `    var { data: pdufaEvents } = await sb.from('pdufa_events')
      .select('ticker, drug, indication, type, date, grade, poa, score, flags, notes, sell_news_risk, dilution_risk, net_edge_score, atm_active, shelf_active, partnership_detected, company_name, market_cap_tier, event_type, estimated_market_cap, tam_ratio')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });`,
  new_str: `    var { data: pdufaEvents } = await sb.from('pdufa_events')
      .select('ticker, drug, indication, type, date, grade, poa, score, flags, notes, sell_news_risk, dilution_risk, net_edge_score, atm_active, shelf_active, partnership_detected, company_name, market_cap_tier, event_type, estimated_market_cap, tam_ratio, formulation_class, cmc_score, cmc_risk, clinical_poa, operational_poa, cmc_haircut_pct, runway_trustworthy, rsi_14d, price_change_90d, volume_climax_flag, analyst_target_proximity_pct, pdufa_is_friday_pm, is_nce, is_505b2, first_time_approver')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });`,
});

// CA2 — Expand classifyEvent to tag CMC-relevant rows via formulation_class / cmc_score
patches.push({
  label: 'CA2 · calendar · classifyEvent checks formulation + cmc_score',
  file: FILES.calendar,
  old_str: `  // CMC Recovery — scorer writes "Post-CRL resubmission" and "Prior CRL
  // detected" as flag strings, not in type/notes. Check flags first.
  if (flags.indexOf('cmc') >= 0 || flags.indexOf('manufactur') >= 0
      || flags.indexOf('post-crl') >= 0 || flags.indexOf('post crl') >= 0
      || flags.indexOf('crl detected') >= 0 || flags.indexOf('crl resubmission') >= 0
      || flags.indexOf('resubmission') >= 0
      || t.indexOf('resubmission') >= 0 || t.indexOf('post-crl') >= 0
      || t.indexOf('class 2 resubmission') >= 0 || t.indexOf('class 1 resubmission') >= 0) {
    tags.push('cmc');
  }`,
  new_str: `  // CMC Recovery — scorer writes "Post-CRL resubmission" and "Prior CRL
  // detected" as flag strings, not in type/notes. v4.4 also exposes
  // formulation_class + cmc_score + cmc_haircut_pct, so complex formulations
  // and high CMC scores pull into the CMC tab automatically.
  var formulation = String(e.formulation_class || '').toUpperCase();
  var formulationFlagged = formulation === 'NANOPARTICLE' || formulation === 'CELL_THERAPY' ||
                           formulation === 'GENE_THERAPY' || formulation === 'BIOLOGIC';
  var cmcScoreHigh = Number(e.cmc_score) >= 15;
  var haircutMaterial = Number(e.cmc_haircut_pct) >= 5;
  if (flags.indexOf('cmc') >= 0 || flags.indexOf('manufactur') >= 0
      || flags.indexOf('post-crl') >= 0 || flags.indexOf('post crl') >= 0
      || flags.indexOf('crl detected') >= 0 || flags.indexOf('crl resubmission') >= 0
      || flags.indexOf('resubmission') >= 0
      || t.indexOf('resubmission') >= 0 || t.indexOf('post-crl') >= 0
      || t.indexOf('class 2 resubmission') >= 0 || t.indexOf('class 1 resubmission') >= 0
      || formulationFlagged || cmcScoreHigh || haircutMaterial) {
    tags.push('cmc');
  }`,
});

// CA3 — Surface formulation + CMC haircut in the calendar catalyst column
patches.push({
  label: 'CA3 · calendar · catalyst column shows formulation/haircut',
  file: FILES.calendar,
  old_str: `      catalyst = rawDrug.substring(0, 40);
      var tr = Number(e.tam_ratio) || 0;
      if (tr >= 10) catalyst += ' <span style="font-size:0.52rem;color:var(--accent2);font-weight:700;">TAM ' + tr + 'x 🚀</span>';
      else if (tr >= 3) catalyst += ' <span style="font-size:0.52rem;color:var(--accent);font-weight:700;">TAM ' + tr + 'x</span>';
      else if (tr > 0 && tr < 1) catalyst += ' <span style="font-size:0.52rem;color:var(--red);">TAM ' + tr + 'x</span>';`,
  new_str: `      catalyst = rawDrug.substring(0, 40);
      var tr = Number(e.tam_ratio) || 0;
      if (tr >= 10) catalyst += ' <span style="font-size:0.52rem;color:var(--accent2);font-weight:700;">TAM ' + tr + 'x 🚀</span>';
      else if (tr >= 3) catalyst += ' <span style="font-size:0.52rem;color:var(--accent);font-weight:700;">TAM ' + tr + 'x</span>';
      else if (tr > 0 && tr < 1) catalyst += ' <span style="font-size:0.52rem;color:var(--red);">TAM ' + tr + 'x</span>';
      // v4.4: formulation badge for complex formulations
      var formClass = String(e.formulation_class || '').toUpperCase();
      var formBadges = { 'NANOPARTICLE': '🧪', 'CELL_THERAPY': '🧫', 'GENE_THERAPY': '🧬', 'BIOLOGIC': '🔬' };
      if (formBadges[formClass]) {
        catalyst += ' <span style="font-size:0.52rem;color:var(--amber);" title="' + formClass.replace('_', ' ') + ' — elevated CMC baseline">' + formBadges[formClass] + '</span>';
      }
      // v4.4: CMC haircut inline if material
      var hair = Number(e.cmc_haircut_pct) || 0;
      if (hair >= 12) catalyst += ' <span style="font-size:0.52rem;color:var(--red);font-weight:700;" title="CMC haircut on Operational PoA">−' + hair.toFixed(0) + '% CMC</span>';
      else if (hair >= 5) catalyst += ' <span style="font-size:0.52rem;color:var(--amber);" title="CMC haircut on Operational PoA">−' + hair.toFixed(0) + '% CMC</span>';
      if (e.runway_trustworthy === false) catalyst += ' <span style="font-size:0.52rem;color:var(--red);" title="Runway looks anomalously high with no commercial capex signal">🚨 runway</span>';
      if (e.first_time_approver === true) catalyst += ' <span style="font-size:0.52rem;color:var(--muted);" title="First-time approver — commercial execution risk">🆕</span>';`,
});

// ============================================================================
// APPLY PATCHES
// ============================================================================

let applied = 0;
let failed = 0;
const failures = [];

for (const patch of patches) {
  const content = fs.readFileSync(patch.file, 'utf8');
  const occurrences = content.split(patch.old_str).length - 1;
  if (occurrences === 0) {
    failed++;
    failures.push(`  ✗ ${patch.label} — anchor NOT FOUND`);
    continue;
  }
  if (occurrences > 1) {
    failed++;
    failures.push(`  ✗ ${patch.label} — anchor matches ${occurrences}× (must be unique)`);
    continue;
  }
  // Idempotency check: already applied?
  if (content.includes(patch.new_str)) {
    failures.push(`  ⏭  ${patch.label} — already applied (skipping)`);
    continue;
  }
  const next = content.replace(patch.old_str, patch.new_str);
  fs.writeFileSync(patch.file, next, 'utf8');
  applied++;
  console.log(`  ✓ ${patch.label}`);
}

console.log('\n───────────────────────────────────────────────');
console.log(`  ${applied}/${patches.length} patches applied successfully`);
if (failures.length > 0) {
  console.log('');
  failures.forEach(f => console.log(f));
  console.log('\n  Any FAIL lines mean the file has diverged from the baseline');
  console.log('  I used. Paste the failing block and I\'ll fix the anchor.');
}
console.log('───────────────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
