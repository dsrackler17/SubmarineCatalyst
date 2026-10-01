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
    '#sc-fab-root { position:fixed; bottom:1.25rem; right:1.25rem; z-index:2147483600; font-family:"Geist", system-ui, sans-serif; }',
    '#sc-fab-btn { display:flex; align-items:center; gap:0.45rem; background:rgba(12,22,37,0.92); color:#f3f6fa; border:1px solid rgba(148,163,184,0.18); border-radius:999px; padding:0.6rem 1rem 0.6rem 0.85rem; font-family:inherit; font-size:0.85rem; font-weight:600; cursor:pointer; -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); box-shadow:0 12px 32px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(34,211,238,0.08); transition:transform 0.15s, border-color 0.15s, box-shadow 0.15s; }',
    '#sc-fab-btn:hover { transform:translateY(-1px); border-color:rgba(34,211,238,0.5); box-shadow:0 14px 36px -12px rgba(34,211,238,0.45); }',
    '#sc-fab-btn .sc-fab-dot { width:8px; height:8px; border-radius:50%; background:#34e0a1; box-shadow:0 0 0 3px rgba(52,224,161,0.18); }',
    '#sc-fab-btn.active { border-color:#22d3ee; color:#22d3ee; }',
    '#sc-fab-panel { display:none; position:absolute; bottom:3.6rem; right:0; width:330px; background:rgba(12,22,37,0.97); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border:1px solid rgba(148,163,184,0.14); border-radius:16px; padding:1.25rem; box-shadow:0 30px 60px -20px rgba(0,0,0,0.75); overflow:hidden; animation:scFabIn 0.2s ease; }',
    '#sc-fab-panel.open { display:block; }',
    '#sc-fab-panel::before { content:""; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#22d3ee,#34e0a1); }',
    '@keyframes scFabIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }',
    '#sc-fab-panel h4 { font-size:1.05rem; font-weight:600; letter-spacing:-0.02em; color:#f3f6fa; margin:0 0 0.25rem; }',
    '#sc-fab-panel .sc-fab-sub { font-size:0.82rem; color:#7a8ca3; margin-bottom:1rem; line-height:1.5; }',
    '#sc-fab-panel .sc-fab-row { display:block; padding:0.7rem 0.85rem; margin-bottom:0.45rem; background:rgba(8,16,29,0.8); border:1px solid rgba(148,163,184,0.12); border-radius:10px; color:#c3cedc; text-decoration:none; font-size:0.85rem; transition:border-color 0.15s, color 0.15s; }',
    '#sc-fab-panel .sc-fab-row:hover { border-color:#22d3ee; color:#f3f6fa; }',
    '#sc-fab-panel .sc-fab-row small { display:block; color:#7a8ca3; font-size:0.74rem; margin-top:0.2rem; }',
    '#sc-fab-panel .sc-fab-footer { font-size:0.76rem; color:#7a8ca3; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid rgba(148,163,184,0.12); line-height:1.6; }',
    '#sc-fab-panel .sc-fab-footer a { color:#22d3ee; text-decoration:none; }',
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
        '<strong style="color:#c3cedc;">Paid but still locked out?</strong> Email the Stripe receipt address and I\'ll flip your account manually.' +
      '</div>' +
    '</div>' +
    '<button id="sc-fab-btn" type="button" aria-label="Open support" aria-expanded="false"><span class="sc-fab-dot"></span>Help</button>';

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
        btn.setAttribute('aria-expanded', String(open));
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
