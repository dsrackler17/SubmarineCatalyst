// ═══════════════════════════════════════════════════════════════════════════
// PATCH FOR catalyst-detail.html
// ═══════════════════════════════════════════════════════════════════════════
// Two surgical str_replace edits. Neither touches the file outside the
// renderInnovation() function. Both changes verify visually by reloading
// /catalyst-detail.html?ticker=SNY after the scorer has run.
//
// BEFORE YOU APPLY:
//   1. Back up catalyst-detail.html
//   2. Apply patches 1 and 2 in order
//   3. Hard refresh browser (Ctrl+Shift+R) to bypass Cloudflare cache
// ═══════════════════════════════════════════════════════════════════════════

// ─── PATCH 1 ────────────────────────────────────────────────────────────────
// REPLACE the entire renderInnovation() function in catalyst-detail.html
// with the version below. Adds the 20-factor breakdown as a sortable table
// sourced from d.innovation_breakdown.factors, and distinguishes "no data
// yet" from "real low score" in the summary line.

// OLD (search for this exact block, starting at "// ─── INNOVATION FACTOR RENDERING"):
/*
function renderInnovation(d) {
  var innScore = Number(d.innovation_score) || 0;
  var innFactor = Number(d.innovation_factor) || 1.0;
  var apprSignals = d.appreciation_signals || [];
  var innFlags = d.innovation_flags || [];

  var bars = [];

  var pct = Math.min(100, Math.max(0, innScore));
  var barColor = innScore >= 75 ? 'gold' : innScore >= 55 ? 'green' : innScore >= 35 ? 'amber' : 'red';
  bars.push({
    label: 'Innovation Score',
    pct: pct,
    color: barColor,
    val: Math.round(innScore) + '/100'
  });

  var factorPct = Math.min(100, Math.max(0, ((innFactor - 0.75) / 0.50) * 100));
  var factorColor = innFactor >= 1.15 ? 'gold' : innFactor >= 1.05 ? 'green' : innFactor >= 1.00 ? '' : 'amber';
  bars.push({
    label: 'Net Edge Multiplier',
    pct: Math.max(15, factorPct),
    color: factorColor,
    val: innFactor.toFixed(3) + 'x'
  });

  var barsHTML = bars.map(function(b) {
    return '<div class="bar-row">' +
      '<span class="bar-label">' + b.label + '</span>' +
      '<div class="bar-track"><div class="bar-fill ' + (b.color || '') + '" style="width:' + b.pct + '%"></div></div>' +
      '<span class="bar-val ' + (b.color || '') + '">' + b.val + '</span>' +
    '</div>';
  }).join('');

  var signalsHTML = '';
  if (apprSignals.length > 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">Detected Signals</div>' +
      apprSignals.map(function(s) {
        return '<div class="innovation-signal">' + escapeHtml(s) + '</div>';
      }).join('');
  } else if (innFlags.length > 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">Innovation Flags</div>' +
      innFlags.map(function(s) {
        return '<div class="innovation-signal">' + escapeHtml(s) + '</div>';
      }).join('');
  } else if (innScore === 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div class="innovation-empty">No innovation signals detected yet. Score populates after drug name and indication are verified and score-events v4+ has run.</div>';
  }

  var summaryColor = innScore >= 75 ? '#ffd700' : innScore >= 55 ? 'var(--accent2)' : innScore >= 35 ? 'var(--accent)' : 'var(--muted)';
  var summaryText = innScore >= 75 ? 'High differentiation — significant appreciation potential'
                  : innScore >= 55 ? 'Notable differentiation features'
                  : innScore >= 35 ? 'Modest differentiation'
                  : 'Limited differentiation signal';

  var summary = '<div style="font-family:var(--mono);font-size:0.72rem;color:' + summaryColor + ';margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);letter-spacing:0.05em;">' +
    '⭐ ' + summaryText + '</div>';

  return barsHTML + signalsHTML + summary;
}
*/

// NEW — full replacement. Paste this in place of the block above.

/*
// ─── INNOVATION FACTOR RENDERING ────────────────────────────────────────────

// Human-readable labels for the 20-factor breakdown. Keys match the scorer's
// innovation_breakdown.factors object exactly.
var INNOVATION_FACTOR_LABELS = {
  f01_unmet_need:        { short: 'Unmet Need',         icon: '🚨' },
  f02_efficacy:          { short: 'Primary Endpoint',   icon: '✅' },
  f03_moa_novelty:       { short: 'MoA Novelty',        icon: '🌟' },
  f04_safety:            { short: 'Safety Profile',     icon: '🩺' },
  f05_designations:      { short: 'FDA Designations',   icon: '🏅' },
  f06_trial_robustness:  { short: 'Trial Robustness',   icon: '📊' },
  f07_qol:               { short: 'Quality of Life',    icon: '💙' },
  f08_durability:        { short: 'Durability',         icon: '⏳' },
  f09_route_dosing:      { short: 'Route & Dosing',     icon: '💉' },
  f10_biomarker:         { short: 'Biomarker Precision',icon: '🎯' },
  f11_magnitude:         { short: 'Magnitude of Benefit',icon: '📈' },
  f12_rare_disease:      { short: 'Rare Disease',       icon: '🧬' },
  f13_pdufa_speed:       { short: 'PDUFA Speed',        icon: '⚡' },
  f14_ip:                { short: 'IP Exclusivity',     icon: '🛡️' },
  f15_soc_displacement:  { short: 'SoC Displacement',   icon: '🏆' },
  f16_manufacturing:     { short: 'Manufacturing Moat', icon: '🏭' },
  f17_pharmacoeconomics: { short: 'Pharmacoeconomics',  icon: '💰' },
  f18_pediatric_prv:     { short: 'Pediatric / PRV',    icon: '🎫' },
  f19_global_health:     { short: 'Global Health',      icon: '🌍' },
  f20_post_market:       { short: 'Post-Market',        icon: '🏆' },
};

function renderInnovation(d) {
  var innScore = Number(d.innovation_score) || 0;
  var innFactor = Number(d.innovation_factor) || 1.0;
  var apprSignals = d.appreciation_signals || [];
  var innFlags = d.innovation_flags || [];
  var breakdown = d.innovation_breakdown || null;

  // Two stacked summary bars at the top (unchanged from prior version)
  var bars = [];
  var pct = Math.min(100, Math.max(0, innScore));
  var barColor = innScore >= 75 ? 'gold' : innScore >= 55 ? 'green' : innScore >= 35 ? 'amber' : 'red';
  bars.push({
    label: 'Innovation Score',
    pct: pct,
    color: barColor,
    val: Math.round(innScore) + '/100'
  });
  var factorPct = Math.min(100, Math.max(0, ((innFactor - 0.75) / 0.50) * 100));
  var factorColor = innFactor >= 1.15 ? 'gold' : innFactor >= 1.05 ? 'green' : innFactor >= 1.00 ? '' : 'amber';
  bars.push({
    label: 'Net Edge Multiplier',
    pct: Math.max(15, factorPct),
    color: factorColor,
    val: innFactor.toFixed(3) + 'x'
  });
  var barsHTML = bars.map(function(b) {
    return '<div class="bar-row">' +
      '<span class="bar-label">' + b.label + '</span>' +
      '<div class="bar-track"><div class="bar-fill ' + (b.color || '') + '" style="width:' + b.pct + '%"></div></div>' +
      '<span class="bar-val ' + (b.color || '') + '">' + b.val + '</span>' +
    '</div>';
  }).join('');

  // ─── Per-factor breakdown table (NEW) ────────────────────────────────────
  // Reads innovation_breakdown.factors from the scorer. Renders all 20 in a
  // compact table, sorted by contribution. Populated factors show signal;
  // unpopulated factors get a muted placeholder.
  var factorBreakdownHTML = '';
  if (breakdown && breakdown.factors && typeof breakdown.factors === 'object') {
    var factorEntries = Object.keys(breakdown.factors).map(function(key) {
      var f = breakdown.factors[key] || {};
      var meta = INNOVATION_FACTOR_LABELS[key] || { short: key, icon: '•' };
      return {
        key: key,
        short: meta.short,
        icon: meta.icon,
        score: Number(f.score) || 0,
        max: Number(f.max) || 0,
        signal: String(f.signal || ''),
        populated: f.populated === true,
      };
    });

    // Sort: populated first, then by descending score (most contribution up top)
    factorEntries.sort(function(a, b) {
      if (a.populated !== b.populated) return a.populated ? -1 : 1;
      return (b.score || 0) - (a.score || 0);
    });

    var conf = (breakdown.data_confidence || 'UNKNOWN').toUpperCase();
    var populatedCount = breakdown.factors_populated || 0;
    var totalCount = breakdown.factors_total || factorEntries.length;
    var confColor = conf === 'HIGH' ? 'var(--accent2)' :
                    conf === 'MODERATE' ? 'var(--accent)' :
                    conf === 'LOW' ? 'var(--amber)' : 'var(--muted)';

    var rows = factorEntries.map(function(f) {
      var hasScore = f.max > 0;
      var pctOfMax = hasScore ? Math.max(0, Math.min(100, (f.score / f.max) * 100)) : 0;
      var rowColor = !f.populated       ? 'var(--muted)'
                   : f.score >= f.max * 0.75 ? 'var(--accent2)'
                   : f.score >= f.max * 0.4  ? 'var(--accent)'
                   : f.score < 0              ? 'var(--red)'
                   : 'var(--amber)';
      var scoreDisplay = hasScore ? (f.score + ' / ' + f.max) : '—';
      var signalDisplay = f.populated
        ? escapeHtml(f.signal || '—')
        : '<span style="color:var(--muted);font-style:italic;">No data yet</span>';

      return '<tr style="border-bottom:1px solid rgba(26,58,92,0.4);">' +
        '<td style="padding:0.55rem 0.4rem;font-family:var(--mono);font-size:0.68rem;color:var(--text);white-space:nowrap;">' +
          f.icon + ' ' + escapeHtml(f.short) +
        '</td>' +
        '<td style="padding:0.55rem 0.4rem;font-family:var(--mono);font-size:0.65rem;color:' + rowColor + ';white-space:nowrap;text-align:right;min-width:4rem;">' +
          scoreDisplay +
        '</td>' +
        '<td style="padding:0.55rem 0.4rem;width:100%;">' +
          (hasScore ? '<div class="bar-track" style="height:4px;"><div class="bar-fill" style="width:' + pctOfMax + '%;background:' + rowColor + ';"></div></div>' : '') +
          '<div style="font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-top:0.2rem;line-height:1.5;">' + signalDisplay + '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    factorBreakdownHTML =
      '<hr class="bar-divider">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">' +
        '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">20-Factor Breakdown</div>' +
        '<div style="font-family:var(--mono);font-size:0.58rem;letter-spacing:0.08em;color:' + confColor + ';">' +
          populatedCount + '/' + totalCount + ' factors · ' + conf + ' confidence' +
        '</div>' +
      '</div>' +
      '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-family:var(--sans);">' + rows + '</table>' +
      '</div>';
  }

  // ─── Detected Signals strip (existing, now using real scorer data) ───────
  var signalsHTML = '';
  if (apprSignals.length > 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">Top Appreciation Signals</div>' +
      apprSignals.map(function(s) {
        return '<div class="innovation-signal">' + escapeHtml(s) + '</div>';
      }).join('');
  } else if (innFlags.length > 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem;">Innovation Flags</div>' +
      innFlags.map(function(s) {
        return '<div class="innovation-signal">' + escapeHtml(s) + '</div>';
      }).join('');
  } else if (!breakdown && innScore === 0) {
    signalsHTML = '<hr class="bar-divider">' +
      '<div class="innovation-empty">No innovation data yet. Run score-innovation edge function after drug_assets is populated.</div>';
  }

  // ─── Summary line (now distinguishes "no data" from "real low score") ────
  var summaryColor, summaryText;
  var hasRealData = breakdown && (breakdown.factors_populated || 0) >= 3;
  if (!hasRealData) {
    summaryColor = 'var(--muted)';
    summaryText = 'Innovation data not yet resolved for this drug';
  } else if (innScore >= 75) {
    summaryColor = '#ffd700';
    summaryText = 'High differentiation — significant appreciation potential';
  } else if (innScore >= 55) {
    summaryColor = 'var(--accent2)';
    summaryText = 'Notable differentiation features';
  } else if (innScore >= 35) {
    summaryColor = 'var(--accent)';
    summaryText = 'Modest differentiation';
  } else {
    summaryColor = 'var(--muted)';
    summaryText = 'Limited differentiation signal';
  }
  var summary = '<div style="font-family:var(--mono);font-size:0.72rem;color:' + summaryColor + ';margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);letter-spacing:0.05em;">' +
    '⭐ ' + summaryText + '</div>';

  return barsHTML + signalsHTML + factorBreakdownHTML + summary;
}
*/


// ─── PATCH 2 ────────────────────────────────────────────────────────────────
// In the same file, the eventData hydration in STEP 1 of the IIFE at the
// bottom of catalyst-detail.html drops innovation_breakdown when mapping
// from the pdufa_events row. Add one line so the breakdown JSONB survives
// the hydration and reaches renderInnovation().

// In the `eventData = { ... }` block inside STEP 1 (after the line reading
// `appreciation_signals: chosen.appreciation_signals || [],`), add:

//         innovation_breakdown: chosen.innovation_breakdown || null,

// Do the same in STEP 2 (edge function fallback) — after the
// `appreciation_signals: e.appreciation_signals || [],` line, add:

//         innovation_breakdown: e.innovation_breakdown || null,


// ═══════════════════════════════════════════════════════════════════════════
// HOW TO APPLY (pick one)
// ═══════════════════════════════════════════════════════════════════════════
//
// Option A — surgical (recommended):
//   1. Open catalyst-detail.html in your editor
//   2. Find the block starting with "// ─── INNOVATION FACTOR RENDERING ───"
//      and replace the entire renderInnovation() function with the NEW version
//      in Patch 1
//   3. Find the two spots in the IIFE that map chosen/e into eventData and
//      add the `innovation_breakdown` line as described in Patch 2
//   4. Save, commit, push to GitHub
//
// Option B — if you trust a full-file rewrite:
//   You can skip this patch entirely and have me regenerate the full
//   catalyst-detail.html file. But Davis's rules say surgical only, so
//   Option A is the right path.
//
// ═══════════════════════════════════════════════════════════════════════════
// VERIFYING THE PATCH LANDS
// ═══════════════════════════════════════════════════════════════════════════
//
// After applying, deploying the scorer, and running it:
//
//   curl -X POST "https://dipagzqrvivposqjkdkx.supabase.co/functions/v1/score-innovation" \
//     -H "Authorization: Bearer $SC_ANON_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"ticker":"SNY","limit":5}'
//
// Then load /catalyst-detail.html?ticker=SNY. You should see:
//
//   ⭐ Innovation & Appreciation Factor
//   Innovation Score     [======72/100]
//   Net Edge Multiplier  [==== 1.110x]
//
//   ─── 20-Factor Breakdown ──────────  14/20 factors · HIGH confidence
//
//   🌟 MoA Novelty            12/12  [========================]
//   🏅 FDA Designations        7/12  [==============]
//                                     FDA designations: Breakthrough, Priority Review
//   🚨 Unmet Need             10/10  [========================]
//                                     No approved therapies for this indication
//   📊 Trial Robustness        6/6   [========================]
//                                     Pivotal trial: N=1131, blinded, multicenter
//   📈 Magnitude of Benefit    4/7   [==============]
//                                     HR=0.69 (strong)
//   💉 Route & Dosing          4/8   [==========]
//                                     Oral upgrade vs SoC · QD dosing
//   ... (all 20 factors shown, populated ones on top)
//
// The "⭐ Modest differentiation" line should now read "Notable differentiation
// features" (or whatever matches the real score).
//
// If you see "Innovation data not yet resolved for this drug" after running
// the scorer, it means drug_assets lookup failed. Check the scorer response
// for `"asset_found": false` and either populate drug_assets manually or
// run the resolver first.
