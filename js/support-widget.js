// ═══════════════════════════════════════════════════════════════════════════
// Submarine Catalyst — Support Widget
// Floating "Need help?" button that injects itself into any page.
// Usage: <script src="/js/support-widget.js"></script>  anywhere in <body>.
// ═══════════════════════════════════════════════════════════════════════════
(function() {
  'use strict';
  if (window.__SC_SUPPORT_WIDGET_LOADED__) return;
  window.__SC_SUPPORT_WIDGET_LOADED__ = true;

  var SUPPORT_EMAIL = 'dsrackler@gmail.com';
  var SUPPORT_LINKEDIN = 'https://www.linkedin.com/in/davis-rackler-008619199';

  // ─── STYLES ─────────────────────────────────────────────────────────────
  var css = [
    '#sc-fab-root { position:fixed; bottom:1.25rem; right:1.25rem; z-index:2147483600; font-family:"Space Mono", monospace; }',
    '#sc-fab-btn { display:flex; align-items:center; gap:0.5rem; background:#00d4ff; color:#040d1a; border:none; padding:0.65rem 1.1rem; font-family:inherit; font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; box-shadow:0 4px 16px rgba(0,212,255,0.3); transition:transform 0.15s, box-shadow 0.15s; clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px)); }',
    '#sc-fab-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,212,255,0.45); }',
    '#sc-fab-btn.active { background:#0b1f3a; color:#00d4ff; border:1px solid #00d4ff; }',
    '#sc-fab-panel { display:none; position:absolute; bottom:3.5rem; right:0; width:320px; background:#0b1f3a; border:1px solid #1a3a5c; padding:1.25rem; box-shadow:0 12px 40px rgba(0,0,0,0.4); animation:scFabIn 0.2s ease; }',
    '#sc-fab-panel.open { display:block; }',
    '#sc-fab-panel::before { content:""; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#00d4ff,#00ff9d); }',
    '@keyframes scFabIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }',
    '#sc-fab-panel h4 { font-family:"DM Serif Display", serif; font-size:1.1rem; color:#eaf4ff; margin:0 0 0.25rem; }',
    '#sc-fab-panel .sc-fab-sub { font-family:"DM Sans", sans-serif; font-size:0.72rem; color:#5a7a99; margin-bottom:1rem; line-height:1.5; }',
    '#sc-fab-panel .sc-fab-row { display:block; padding:0.65rem 0.85rem; margin-bottom:0.4rem; background:#07152b; border:1px solid #1a3a5c; color:#c8dff0; text-decoration:none; font-size:0.72rem; letter-spacing:0.04em; transition:border-color 0.15s, color 0.15s; }',
    '#sc-fab-panel .sc-fab-row:hover { border-color:#00d4ff; color:#00d4ff; }',
    '#sc-fab-panel .sc-fab-row small { display:block; color:#5a7a99; font-size:0.6rem; margin-top:0.2rem; letter-spacing:0.02em; }',
    '#sc-fab-panel .sc-fab-footer { font-size:0.6rem; color:#5a7a99; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid #1a3a5c; letter-spacing:0.04em; line-height:1.6; }',
    '#sc-fab-panel .sc-fab-footer a { color:#00d4ff; text-decoration:none; }',
    '@media (max-width:480px) { #sc-fab-panel { width:calc(100vw - 2.5rem); right:0; } }',
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ─── MARKUP ─────────────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'sc-fab-root';
  root.innerHTML =
    '<div id="sc-fab-panel" role="dialog" aria-label="Support options">' +
      '<h4>Need help?</h4>' +
      '<div class="sc-fab-sub">Submarine Catalyst is a solo operation. Pick a channel:</div>' +
      '<a class="sc-fab-row" href="mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Submarine Catalyst Support') + '">' +
        '📧 ' + SUPPORT_EMAIL +
        '<small>Response within 24h on weekdays — preferred</small>' +
      '</a>' +
      '<a class="sc-fab-row" href="' + SUPPORT_LINKEDIN + '" target="_blank" rel="noopener">' +
        '💼 LinkedIn — Davis Rackler' +
        '<small>Connect or verify I\'m a real person</small>' +
      '</a>' +
      '<a class="sc-fab-row" href="/contact.html">' +
        '📝 Full contact form →' +
        '<small>Topic dropdown + longer message</small>' +
      '</a>' +
      '<div class="sc-fab-footer">' +
        '<strong style="color:#c8dff0;">Paid but still locked out?</strong> Email the Stripe receipt address and I\'ll flip your account manually.' +
      '</div>' +
    '</div>' +
    '<button id="sc-fab-btn" type="button" aria-label="Open support">💬 Help</button>';

  // ─── BEHAVIOR ───────────────────────────────────────────────────────────
  function insert() {
    if (document.body) {
      document.body.appendChild(root);
      var btn = document.getElementById('sc-fab-btn');
      var panel = document.getElementById('sc-fab-panel');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var open = panel.classList.toggle('open');
        btn.classList.toggle('active', open);
      });
      document.addEventListener('click', function(e) {
        if (!root.contains(e.target) && panel.classList.contains('open')) {
          panel.classList.remove('open');
          btn.classList.remove('active');
        }
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.classList.contains('open')) {
          panel.classList.remove('open');
          btn.classList.remove('active');
        }
      });
    } else {
      document.addEventListener('DOMContentLoaded', insert);
    }
  }
  insert();
})();
