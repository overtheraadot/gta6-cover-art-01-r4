/* Vice Sunset Split — GTA-style multi-panel cover maker.
   Plain JS, no imports, no network. All photos stay on the machine. */
(function () {
  'use strict';

  var SIZES = {
    wide: { w: 1920, h: 1080, label: '1920 x 1080' },
    square: { w: 1080, h: 1080, label: '1080 x 1080' },
    portrait: { w: 1080, h: 1350, label: '1080 x 1350' }
  };

  var GRADES = {
    vice:   { top: '#ff5e3a', mid: '#ff2e88', bot: '#2b1055', filter: 'saturate(1.35) contrast(1.08)' },
    neon:   { top: '#ff2e88', mid: '#b537f2', bot: '#04122e', filter: 'saturate(1.55) contrast(1.12)' },
    golden: { top: '#ffb347', mid: '#ff7b00', bot: '#5c1a00', filter: 'saturate(1.30) sepia(0.18) contrast(1.05)' },
    teal:   { top: '#00e5a0', mid: '#0e7c7b', bot: '#02141c', filter: 'saturate(1.25) contrast(1.06) hue-rotate(-12deg)' },
    noir:   { top: '#f2f2f2', mid: '#8a8a8a', bot: '#000000', filter: 'grayscale(1) contrast(1.18) brightness(1.04)' }
  };

  var state = {
    layout: 'hero',
    grade: 'vice',
    gradeStrength: 0.7,
    title: 'VICE SUNSET',
    subtitle: 'WELCOME TO LEONIDA',
    badge: 'EST. 2026',
    gap: 8,
    zoom: 1,
    samePhoto: true,
    size: 'wide',
    grain: true,
    vignette: true,
    panels: [] // each: { img: Image|null, zoom, ox, oy }
  };

  var sampleIndex = 0;
  var SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];
  var selectedPanel = 0;
  var grainTile = null;

  function $(id) { return document.getElementById(id); }

  function panelCount(layout) {
    if (layout === 'quad') return 4;
    if (layout === 'bleed') return 1;
    return 3;
  }

  function ensurePanels() {
    var n = panelCount(state.layout);
    while (state.panels.length < n) state.panels.push({ img: null, zoom: 1, ox: 0, oy: 0 });
    state.panels.length = n;
    if (selectedPanel >= n) selectedPanel = 0;
  }

  /* Panel rectangles for a cover of W x H, in the chosen layout. */
  function panelRects(layout, W, H, gap) {
    var g = gap, r = [];
    if (layout === 'hero') {
      var leftW = Math.round(W * 0.62);
      r.push({ x: 0, y: 0, w: leftW, h: H });
      var rightX = leftW + g, rightW = W - rightX;
      var halfH = Math.round((H - g) / 2);
      r.push({ x: rightX, y: 0, w: rightW, h: halfH });
      r.push({ x: rightX, y: halfH + g, w: rightW, h: H - halfH - g });
    } else if (layout === 'strip') {
      var w3 = Math.round((W - 2 * g) / 3);
      r.push({ x: 0, y: 0, w: w3, h: H });
      r.push({ x: w3 + g, y: 0, w: w3, h: H });
      r.push({ x: 2 * (w3 + g), y: 0, w: W - 2 * (w3 + g), h: H });
    } else if (layout === 'quad') {
      var w2 = Math.round((W - g) / 2), h2 = Math.round((H - g) / 2);
      r.push({ x: 0, y: 0, w: w2, h: h2 });
      r.push({ x: w2 + g, y: 0, w: W - w2 - g, h: h2 });
      r.push({ x: 0, y: h2 + g, w: w2, h: H - h2 - g });
      r.push({ x: w2 + g, y: h2 + g, w: W - w2 - g, h: H - h2 - g });
    } else {
      r.push({ x: 0, y: 0, w: W, h: H });
    }
    return r;
  }

  function drawPhotoCover(ctx, img, rect, panel) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom * state.zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
    var dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawPlaceholder(ctx, rect, label) {
    var g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3b1d63');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 ' + Math.max(14, Math.round(rect.w / 14)) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  function applyGrade(ctx, rect, grade, strength) {
    if (strength <= 0) return;
    var g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, grade.top);
    g.addColorStop(0.55, grade.mid);
    g.addColorStop(1, grade.bot);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.globalAlpha = 0.38 * strength;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 0.22 * strength;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  function makeGrainTile() {
    var t = document.createElement('canvas');
    t.width = 128; t.height = 128;
    var c = t.getContext('2d');
    var img = c.createImageData(128, 128);
    var seed = 123456789;
    for (var i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var v = seed % 256;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return t;
  }

  function drawGrain(ctx, W, H) {
    if (!grainTile) grainTile = makeGrainTile();
    ctx.save();
    ctx.globalAlpha = 0.07;
    var pat = ctx.createPattern(grainTile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawVignette(ctx, W, H) {
    var r = Math.max(W, H) * 0.75;
    var g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawTitleBlock(ctx, W, H) {
    var bandH = Math.round(H * 0.24);
    var y0 = H - bandH;
    var scrim = ctx.createLinearGradient(0, y0 - bandH * 0.5, 0, H);
    scrim.addColorStop(0, 'rgba(10,2,24,0)');
    scrim.addColorStop(0.45, 'rgba(10,2,24,0.72)');
    scrim.addColorStop(1, 'rgba(10,2,24,0.92)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, y0 - bandH * 0.5, W, H - (y0 - bandH * 0.5));

    var pad = Math.round(W * 0.045);
    var titleSize = Math.min(Math.round(W * 0.105), Math.round(bandH * 0.62));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Shrink the title until it fits the cover width, whatever font is present.
    var maxTitleW = W - pad * 2;
    while (titleSize > 20) {
      ctx.font = '900 ' + titleSize + 'px "Arial Black", Impact, sans-serif';
      if (ctx.measureText(state.title).width <= maxTitleW) break;
      titleSize -= 4;
    }
    ctx.font = '900 ' + titleSize + 'px "Arial Black", Impact, sans-serif';
    var grad = ctx.createLinearGradient(0, y0 + bandH * 0.18, 0, y0 + bandH * 0.92);
    grad.addColorStop(0, '#fff7d6');
    grad.addColorStop(0.45, '#ffd166');
    grad.addColorStop(0.75, '#ff5e3a');
    grad.addColorStop(1, '#ff2e88');
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, Math.round(titleSize / 16));
    ctx.strokeStyle = 'rgba(20,2,40,0.95)';
    ctx.strokeText(state.title, pad, y0 + bandH * 0.62);
    ctx.fillStyle = grad;
    ctx.fillText(state.title, pad, y0 + bandH * 0.62);

    var subSize = Math.max(13, Math.round(W * 0.016));
    ctx.font = '700 ' + subSize + 'px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.subtitle, pad, y0 + bandH * 0.88);

    if (state.badge) {
      var bSize = Math.max(12, Math.round(W * 0.014));
      ctx.font = '900 ' + bSize + 'px Arial, sans-serif';
      var bw = ctx.measureText(state.badge).width + bSize * 1.6;
      var bx = W - pad - bw, by = y0 + bandH * 0.14;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bSize * 2.1, 4);
      ctx.fill();
      ctx.fillStyle = '#1a0533';
      ctx.textAlign = 'center';
      ctx.fillText(state.badge, bx + bw / 2, by + bSize * 1.45);
      ctx.textAlign = 'left';
    }
  }

  /* The whole cover: panels + grade + lettering + grain + vignette. */
  function drawCover(ctx, W, H) {
    ensurePanels();
    var gap = Math.round(state.gap * (W / 1920));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    var rects = panelRects(state.layout, W, H, gap);
    var grade = GRADES[state.grade];
    for (var i = 0; i < rects.length; i++) {
      var p = state.panels[i];
      if (p.img && p.img.complete && p.img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = grade.filter;
        drawPhotoCover(ctx, p.img, rects[i], p);
        ctx.restore();
      } else {
        drawPlaceholder(ctx, rects[i], 'PANEL ' + (i + 1));
      }
      applyGrade(ctx, rects[i], grade, state.gradeStrength);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, Math.round(W / 960));
      ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
    }
    drawTitleBlock(ctx, W, H);
    if (state.vignette) drawVignette(ctx, W, H);
    if (state.grain) drawGrain(ctx, W, H);
  }

  function renderPreview() {
    var canvas = $('preview');
    if (!canvas) return;
    var size = SIZES[state.size];
    var maxW = 960;
    var scale = Math.min(maxW / size.w, 640 / size.h);
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    var ctx = canvas.getContext('2d');
    drawCover(ctx, canvas.width, canvas.height);
    $('sizeLabel').textContent = size.label;
  }

  function exportSize(key) {
    var size = SIZES[key];
    var c = document.createElement('canvas');
    c.width = size.w; c.height = size.h;
    drawCover(c.getContext('2d'), size.w, size.h);
    var a = document.createElement('a');
    a.download = 'vice-sunset-split-' + key + '.png';
    a.href = c.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function loadImage(src, done) {
    var img = new Image();
    img.onload = function () { done(img); };
    img.onerror = function () { done(null); };
    img.src = src;
  }

  function setPhoto(img) {
    ensurePanels();
    if (state.samePhoto) {
      for (var i = 0; i < state.panels.length; i++) {
        state.panels[i].img = img;
        state.panels[i].zoom = 1; state.panels[i].ox = 0; state.panels[i].oy = 0;
      }
    } else {
      var p = state.panels[selectedPanel];
      p.img = img; p.zoom = 1; p.ox = 0; p.oy = 0;
    }
    renderPreview();
  }

  function loadSample() {
    var src = SAMPLES[sampleIndex % SAMPLES.length];
    sampleIndex++;
    loadImage(src, function (img) { if (img) setPhoto(img); });
  }

  function bindControls() {
    $('fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        loadImage(reader.result, function (img) { if (img) setPhoto(img); });
      };
      reader.readAsDataURL(f);
    });
    $('sampleBtn').addEventListener('click', loadSample);
    $('samePhoto').addEventListener('change', function (e) {
      state.samePhoto = e.target.checked;
      if (state.samePhoto) {
        var first = null;
        for (var i = 0; i < state.panels.length; i++) if (state.panels[i].img) { first = state.panels[i].img; break; }
        if (first) setPhoto(first);
      }
    });
    $('zoom').addEventListener('input', function (e) {
      state.zoom = parseFloat(e.target.value);
      $('zoomVal').textContent = state.zoom.toFixed(2) + 'x';
      renderPreview();
    });
    $('gap').addEventListener('input', function (e) {
      state.gap = parseInt(e.target.value, 10);
      renderPreview();
    });
    $('gradeStrength').addEventListener('input', function (e) {
      state.gradeStrength = parseInt(e.target.value, 10) / 100;
      renderPreview();
    });
    $('layoutGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-layout]');
      if (!b) return;
      state.layout = b.getAttribute('data-layout');
      var btns = document.querySelectorAll('#layoutGrid .layout-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i] === b);
      renderPreview();
    });
    $('gradeGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-grade]');
      if (!b) return;
      state.grade = b.getAttribute('data-grade');
      var btns = document.querySelectorAll('#gradeGrid .grade-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i] === b);
      renderPreview();
    });
    $('titleInput').addEventListener('input', function (e) { state.title = e.target.value || 'VICE SUNSET'; renderPreview(); });
    $('subtitleInput').addEventListener('input', function (e) { state.subtitle = e.target.value; renderPreview(); });
    $('badgeInput').addEventListener('input', function (e) { state.badge = e.target.value; renderPreview(); });
    $('grainToggle').addEventListener('change', function (e) { state.grain = e.target.checked; renderPreview(); });
    $('vignetteToggle').addEventListener('change', function (e) { state.vignette = e.target.checked; renderPreview(); });
    var exps = document.querySelectorAll('[data-export]');
    for (var j = 0; j < exps.length; j++) {
      exps[j].addEventListener('click', function (e) {
        var key = e.currentTarget.getAttribute('data-export');
        state.size = key;
        renderPreview();
        exportSize(key);
      });
    }
    $('exportAll').addEventListener('click', function () {
      var keys = ['square', 'portrait', 'wide'];
      var k = 0;
      (function next() {
        if (k >= keys.length) return;
        exportSize(keys[k]);
        k++;
        setTimeout(next, 350);
      })();
    });

    var dragging = null;
    var canvas = $('preview');
    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (canvas.width / rect.width);
      var y = (e.clientY - rect.top) * (canvas.height / rect.height);
      var rects = panelRects(state.layout, canvas.width, canvas.height, Math.round(state.gap * (canvas.width / 1920)));
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          selectedPanel = i;
          dragging = { panel: state.panels[i], rect: r, lastX: x, lastY: y };
          break;
        }
      }
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (canvas.width / rect.width);
      var y = (e.clientY - rect.top) * (canvas.height / rect.height);
      dragging.panel.ox += (x - dragging.lastX) / dragging.rect.w;
      dragging.panel.oy += (y - dragging.lastY) / dragging.rect.h;
      dragging.panel.ox = Math.max(-0.6, Math.min(0.6, dragging.panel.ox));
      dragging.panel.oy = Math.max(-0.6, Math.min(0.6, dragging.panel.oy));
      dragging.lastX = x; dragging.lastY = y;
      renderPreview();
    });
    canvas.addEventListener('pointerup', function () { dragging = null; });
    canvas.addEventListener('pointercancel', function () { dragging = null; });
  }

  /* Deterministic screenshot modes: ?shot=editor | ?shot=cover&size=wide|square|portrait */
  function shotMode() {
    var params = new URLSearchParams(window.location.search);
    var shot = params.get('shot');
    if (!shot) return null;
    if (shot === 'editor') {
      loadImage(SAMPLES[0], function (img) { if (img) setPhoto(img); });
      return 'editor';
    }
    if (shot === 'cover') {
      var size = SIZES[params.get('size')] ? params.get('size') : 'wide';
      document.body.classList.add('shot-cover');
      document.body.innerHTML = '<canvas id="shotCanvas"></canvas>';
      var c = document.getElementById('shotCanvas');
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      loadImage(SAMPLES[0], function (img) {
        if (img) setPhoto(img);
        var ctx = c.getContext('2d');
        drawCover(ctx, c.width, c.height);
        window.__coverReady = true;
      });
      return 'cover';
    }
    return null;
  }

  bindControls();
  ensurePanels();
  var mode = shotMode();
  if (mode !== 'cover') renderPreview();
})();
