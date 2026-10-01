// ============================================================
// SUBMARINE CATALYST — SHARED UI BEHAVIOUR
// Loaded on every page (defer). Pure progressive enhancement:
//   · mobile nav menu built from the page's own nav links
//   · aria-current on the link for the current page
//   · nav shadow once the page scrolls
//   · FAQ accordions that never clip long answers
// ============================================================

(function () {
  'use strict';

  function normPath(p) {
    return (p || '/').replace(/\/index\.html$/, '/');
  }

  function initNav() {
    var nav = document.querySelector('body > nav');
    if (!nav || nav.getAttribute('data-sc-ui')) return;
    nav.setAttribute('data-sc-ui', '1');

    // Current-page link state
    var here = normPath(location.pathname);
    nav.querySelectorAll('a[href]').forEach(function (a) {
      if (a.classList.contains('nav-logo') || a.classList.contains('nav-cta')) return;
      var u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
      if (u.origin === location.origin && !u.hash && normPath(u.pathname) === here) {
        a.setAttribute('aria-current', 'page');
      }
    });

    // Elevated nav once content scrolls beneath it
    var onScroll = function () { nav.classList.toggle('sc-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu — mirrors links that get hidden on narrow screens
    var sources = nav.querySelectorAll('.nav-links a, .nav-center a, .nav-right a.nav-link, .nav-actions a.nav-login');
    if (!sources.length) return;

    var panel = document.createElement('div');
    panel.className = 'sc-menu';
    panel.id = 'sc-menu';
    panel.hidden = true;

    var user = nav.querySelector('.nav-user');
    var userRow = null;
    if (user) {
      userRow = document.createElement('div');
      userRow.className = 'sc-menu-user';
      userRow.hidden = true;
      panel.appendChild(userRow);
    }

    var seen = {};
    sources.forEach(function (a) {
      var href = a.getAttribute('href');
      var label = (a.textContent || '').trim();
      if (!href || !label || seen[href]) return;
      seen[href] = true;
      var link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      if (a.getAttribute('aria-current')) link.setAttribute('aria-current', 'page');
      if (a.target) { link.target = a.target; link.rel = 'noopener'; }
      panel.appendChild(link);
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sc-menu-btn';
    btn.setAttribute('aria-controls', 'sc-menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<span></span><span></span>';

    nav.appendChild(btn);
    nav.appendChild(panel);
    nav.classList.add('sc-has-menu');

    function setOpen(open) {
      nav.classList.toggle('sc-open', open);
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open && userRow) {
        var email = (user.textContent || '').trim();
        userRow.textContent = email;
        userRow.hidden = !email || email === '—';
      }
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('sc-open'));
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('sc-open') && !nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('sc-open')) { setOpen(false); btn.focus(); }
    });
    var wide = window.matchMedia('(min-width: 901px)');
    var onWide = function (m) { if (m.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  // FAQ: pages toggle `.faq-item.open` inline; size the answer to its content
  // so long answers are never cut off by a fixed max-height.
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a || q.getAttribute('data-sc-faq')) return;
      q.setAttribute('data-sc-faq', '1');
      q.setAttribute('aria-expanded', String(item.classList.contains('open')));
      if (item.classList.contains('open')) a.style.maxHeight = 'none';

      // Runs after the inline onclick, so the class already reflects the new state
      q.addEventListener('click', function () {
        var open = item.classList.contains('open');
        q.setAttribute('aria-expanded', String(open));
        a.style.maxHeight = a.scrollHeight + 'px';
        if (!open) {
          void a.offsetHeight;
          a.style.maxHeight = '0px';
        }
      });
      a.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'max-height' && item.classList.contains('open')) a.style.maxHeight = 'none';
      });
    });
  }

  function init() {
    initNav();
    initFaq();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
