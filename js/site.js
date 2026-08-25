/* Ashrel — site behaviour.
   Vanilla ES2015+, no dependencies. Four independent modules, each a no-op
   when its markup is absent from the page. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ---------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------- */

  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });

    nav.addEventListener('click', function (event) {
      if (event.target.tagName !== 'A') return;
      nav.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------------------------------------------------------------
     Hero particle field

     Replaces the three.js <structure-flow> component from the design
     canvas: same visual (a slowly rotating shell of points, masked into
     the hero) at ~2KB instead of a 600KB CDN dependency.
     --------------------------------------------------------------- */

  function initHeroField(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var count = parseInt(canvas.getAttribute('data-count') || '900', 10);
    var speed = parseFloat(canvas.getAttribute('data-speed') || '1');
    var colour = canvas.getAttribute('data-color') || '#B7D8EA';

    var points = [];
    var i;
    for (i = 0; i < count; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(Math.random() * 0.8 + 0.2);
      points.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi) - 0.7,
        z: Math.sin(phi) * Math.sin(theta)
      });
    }

    var width = 0;
    var height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var angle = 0;
    var frame = 0;
    var visible = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colour;

      var cx = width * 0.5;
      var cy = height * 0.42;
      var scale = Math.max(width, height) * 0.62;
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);

      for (var n = 0; n < points.length; n++) {
        var p = points[n];
        var rx = p.x * cos - p.z * sin;
        var rz = p.x * sin + p.z * cos;
        var depth = 1 / (2.4 + rz);
        var sx = cx + rx * scale * depth * 2.2;
        var sy = cy + p.y * scale * depth * 2.2;
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
        ctx.globalAlpha = Math.max(0, Math.min(0.5, depth * 1.4));
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    }

    function tick() {
      angle += 0.0009 * speed;
      draw();
      frame = visible && !document.hidden ? window.requestAnimationFrame(tick) : 0;
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0] ? entries[0].isIntersecting : true;
        if (visible && !frame && !reduceMotion) frame = window.requestAnimationFrame(tick);
        if (!visible && frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      }).observe(canvas);
    }

    resize();
    if (!reduceMotion) frame = window.requestAnimationFrame(tick);
  }

  function initHeroFields() {
    var fields = document.querySelectorAll('.hero-field');
    for (var i = 0; i < fields.length; i++) initHeroField(fields[i]);
  }

  /* ---------------------------------------------------------------
     Insights topic filter
     --------------------------------------------------------------- */

  function initTopics() {
    var bar = document.querySelector('.topics');
    var grid = document.getElementById('post-grid');
    if (!bar || !grid) return;

    var empty = document.getElementById('posts-empty');
    var buttons = bar.querySelectorAll('.topic');
    var cards = grid.querySelectorAll('[data-tag]');

    bar.addEventListener('click', function (event) {
      var button = event.target.closest('.topic');
      if (!button) return;

      var topic = button.getAttribute('data-topic');
      var shown = 0;
      var i;

      for (i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', String(buttons[i] === button));
      }

      for (i = 0; i < cards.length; i++) {
        var match = topic === 'all' || cards[i].getAttribute('data-tag') === topic;
        cards[i].hidden = !match;
        if (match) shown++;
      }

      if (empty) empty.hidden = shown !== 0;
    });
  }

  /* ---------------------------------------------------------------
     Brief form

     Posts to the endpoint in data-endpoint. Until that endpoint is
     configured the form falls back to composing an email in the
     visitor's mail client, so an enquiry is never silently swallowed.
     --------------------------------------------------------------- */

  function mailtoFallback(form, data) {
    var address = form.getAttribute('data-fallback-email');
    if (!address) return false;

    var lines = [];
    data.forEach(function (value, key) {
      if (key.charAt(0) === '_') return;
      lines.push(key + ': ' + value);
    });

    window.location.href =
      'mailto:' + address +
      '?subject=' + encodeURIComponent('Search brief from the Ashrel website') +
      '&body=' + encodeURIComponent(lines.join('\n'));
    return true;
  }

  function initBriefForm() {
    var form = document.getElementById('brief-form');
    if (!form) return;

    var thanks = document.getElementById('brief-thanks');
    var status = document.getElementById('brief-status');
    var submit = form.querySelector('button[type="submit"]');
    var reset = document.getElementById('brief-reset');

    function fail(message) {
      if (!status) return;
      status.textContent = message;
      status.setAttribute('data-state', 'error');
      status.hidden = false;
    }

    function succeed() {
      form.hidden = true;
      if (thanks) thanks.hidden = false;
    }

    if (reset) {
      reset.addEventListener('click', function () {
        form.reset();
        form.hidden = false;
        if (thanks) thanks.hidden = true;
        if (status) status.hidden = true;
        form.scrollIntoView({ block: 'center' });
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (status) status.hidden = true;

      var endpoint = form.getAttribute('data-endpoint') || '';
      var data = new FormData(form);

      if (!endpoint || endpoint.indexOf('REPLACE') !== -1) {
        if (mailtoFallback(form, data)) return;
        fail('The form is not connected yet. Please email hello@ashrel.com directly.');
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending…';
      }

      window
        .fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed: ' + response.status);
          succeed();
        })
        .catch(function () {
          fail('Something went wrong sending your brief. Please email hello@ashrel.com directly.');
        })
        .then(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = 'Request the call';
          }
        });
    });
  }

  /* ---------------------------------------------------------------
     Salary-brief signup (insights page)
     --------------------------------------------------------------- */

  function initSignup() {
    var form = document.getElementById('signup-form');
    if (!form) return;

    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (event) {
      var endpoint = form.getAttribute('data-endpoint') || '';
      if (endpoint && endpoint.indexOf('REPLACE') === -1) return; // let it post normally

      event.preventDefault();
      var email = form.querySelector('input[type="email"]');
      window.location.href =
        'mailto:' + form.getAttribute('data-fallback-email') +
        '?subject=' + encodeURIComponent('Subscribe: Ashrel AI Salary Brief') +
        '&body=' + encodeURIComponent('Please add ' + (email ? email.value : '') + ' to the salary brief.');
      if (button) button.textContent = 'Subscribed';
    });
  }

  /* ---------------------------------------------------------------
     Scroll motion

     Two effects, both fire once on entry:
       - headings split into words, each rising from behind its own mask
       - grouped items fading up in sequence

     Gated on the .motion class, which an inline <head> script sets before
     first paint. If JS is off the class never lands and nothing is hidden.
     --------------------------------------------------------------- */

  function splitIntoWords(el) {
    // Only plain-text headings; anything with markup inside is left alone.
    if (el.children.length) return false;

    var words = el.textContent.trim().split(/\s+/);
    if (!words.length) return false;

    var frag = document.createDocumentFragment();
    words.forEach(function (word, i) {
      var mask = document.createElement('span');
      mask.className = 'rv';
      var inner = document.createElement('span');
      inner.textContent = word;
      inner.style.transitionDelay = (i * 55) + 'ms';
      mask.appendChild(inner);
      frag.appendChild(mask);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });

    el.textContent = '';
    el.appendChild(frag);
    return true;
  }

  function initScrollMotion() {
    if (!document.documentElement.classList.contains('motion')) return;
    if (reduceMotion || !window.IntersectionObserver) return;

    var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
    reveals.forEach(splitIntoWords);

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    reveals.forEach(function (el) { revealObserver.observe(el); });

    // Staggered fade-ups. The container is observed rather than each child:
    // inside a horizontal scroller the later cards sit outside the viewport
    // horizontally, and observing them individually would leave them blank
    // until swiped to.
    var groups = [].slice.call(document.querySelectorAll('[data-stagger]'));
    groups.forEach(function (group) {
      [].slice.call(group.children).forEach(function (child, i) {
        child.classList.add('fade-up');
        child.style.transitionDelay = (i * 70) + 'ms';
      });
    });

    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        [].slice.call(entry.target.children).forEach(function (child) {
          child.classList.add('is-in');
        });
        fadeObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    groups.forEach(function (el) { fadeObserver.observe(el); });
  }

  /* ---------------------------------------------------------------
     Horizontal scrollers

     A scrollable region needs to be reachable by keyboard, but only while
     it is actually scrollable, so the attributes are applied and removed
     as the breakpoint changes.
     --------------------------------------------------------------- */

  // Nearest heading preceding the scroller, so the region gets a meaningful
  // name even when it isn't wrapped in its own <section>.
  function headingFor(el) {
    var scope = el.closest('section') || el.closest('main') || document.body;
    var headings = [].slice.call(scope.querySelectorAll('h1, h2, h3'));
    var best = null;
    headings.forEach(function (h) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = h;
    });
    return best ? best.textContent.trim() : 'Items';
  }

  function initScrollers() {
    var scrollers = [].slice.call(document.querySelectorAll('.h-scroll'));
    if (!scrollers.length) return;

    function sync() {
      scrollers.forEach(function (el) {
        if (el.scrollWidth > el.clientWidth + 1) {
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'region');
          if (!el.getAttribute('aria-label')) {
            el.setAttribute('aria-label', headingFor(el) + ', scroll for more');
          }
        } else {
          el.removeAttribute('tabindex');
          el.removeAttribute('role');
          el.removeAttribute('aria-label');
        }
      });
    }

    sync();
    window.addEventListener('resize', sync);
  }

  /* --------------------------------------------------------------- */

  function boot() {
    initNav();
    initHeroFields();
    initTopics();
    initBriefForm();
    initSignup();
    initScrollMotion();
    initScrollers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
