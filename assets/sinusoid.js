/* Interactive sinusoid grapher for y = A·sin(B(x − C)) + D  (or cos).

   The whole point of this topic is that four numbers each move the curve in one
   independent way, and the CLEP traps live in the couplings people invent
   between them — reading B as the period instead of 2π/B, or reading the "− C"
   inside sin(2x − π) as a phase shift of π instead of π/2. So the component
   lets the learner move A, B, C, D one at a time and watch exactly one property
   of the curve respond, with the derived quantities (amplitude, period, phase
   shift, midline) recomputed live beside it.

   Optional "target" mode draws a faint goal curve; when the sliders round to the
   target parameters, it reports a match. That turns free play into a feedback
   loop with a pass/fail signal.

   Usage: <div class="sinusoid-lab" data-sino="name"></div>
   plus <script type="application/json" id="name">{...}</script>

   Shape (all optional):
   { "fn": "sin"|"cos", "A":2, "B":1, "C":0, "D":0,
     "target": { "fn":"sin", "A":2, "B":2, "C":0.7853981634, "D":-1 },
     "caption": "..." }
   Angles (C) are in radians. */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var PI = Math.PI;

  // Plot window. Fixed so the axes never move under the curve. The y-range is
  // sized to the sliders' worst case: max reach is |A|max + |D|max = 3 + 2 = 5,
  // plus headroom, so a peak or trough can never silently clip off-window.
  // Gridlines are labelled at fixed even values (below), independent of this.
  var XMIN = -PI, XMAX = 3 * PI, YMIN = -5.5, YMAX = 5.5;
  var Y_GRID = [-4, -2, 0, 2, 4];
  var VBW = 460, VBH = 300;
  var PADL = 34, PADR = 12, PADT = 12, PADB = 26;
  var W = VBW - PADL - PADR, H = VBH - PADT - PADB;

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function sx(x) { return PADL + (x - XMIN) / (XMAX - XMIN) * W; }
  function sy(y) { return PADT + (YMAX - y) / (YMAX - YMIN) * H; }

  // Format a radian quantity as a tidy multiple of π (the form CLEP answers use).
  function piFmt(v) {
    if (Math.abs(v) < 1e-9) return "0";
    var r = v / PI;
    var frac = nearestFraction(r);
    if (!frac) return v.toFixed(2);
    var n = frac[0], d = frac[1];
    var sign = n < 0 ? "−" : "";
    n = Math.abs(n);
    var num = (n === 1 ? "" : n) + "π";
    return sign + (d === 1 ? num : num + "/" + d);
  }
  function nearestFraction(r) {
    var dens = [1, 2, 3, 4, 6];
    for (var i = 0; i < dens.length; i++) {
      var d = dens[i], n = Math.round(r * d);
      if (Math.abs(n / d - r) < 1e-6) return [n, d];
    }
    return null;
  }

  function build(container) {
    var cfg = {};
    var dataEl = document.getElementById(container.getAttribute("data-sino"));
    if (dataEl) cfg = JSON.parse(dataEl.textContent);

    var state = {
      fn: cfg.fn || "sin",
      A: cfg.A != null ? cfg.A : 1,
      B: cfg.B != null ? cfg.B : 1,
      C: cfg.C != null ? cfg.C : 0,
      D: cfg.D != null ? cfg.D : 0
    };
    var target = cfg.target || null;

    var box = document.createElement("div");
    box.className = "sino-box";

    var label = document.createElement("div");
    label.className = "sino-label";
    label.textContent = target ? "Match the target curve" : "Sinusoid grapher";
    box.appendChild(label);

    // ---- SVG plot ----------------------------------------------------------
    var svg = el("svg", { viewBox: "0 0 " + VBW + " " + VBH, class: "sino-svg",
                          role: "img", "aria-label": "Graph of a sinusoid" });

    var clip = el("clipPath", { id: container.getAttribute("data-sino") + "-clip" });
    clip.appendChild(el("rect", { x: PADL, y: PADT, width: W, height: H }));
    svg.appendChild(clip);

    // Vertical gridlines + x labels at integer multiples of π.
    for (var k = -1; k <= 3; k++) {
      var xv = k * PI;
      svg.appendChild(el("line", { x1: sx(xv), y1: PADT, x2: sx(xv), y2: PADT + H,
                                   class: "sino-grid" }));
      var lbl = el("text", { x: sx(xv), y: PADT + H + 16, class: "sino-axislabel",
                             "text-anchor": "middle" });
      lbl.textContent = k === 0 ? "0" : (k === 1 ? "π" : (k === -1 ? "−π" : k + "π"));
      svg.appendChild(lbl);
    }
    // Horizontal gridlines + y labels, at fixed even values inside the window.
    Y_GRID.forEach(function (yv) {
      svg.appendChild(el("line", { x1: PADL, y1: sy(yv), x2: PADL + W, y2: sy(yv),
                                   class: yv === 0 ? "sino-axis" : "sino-grid" }));
      var yl = el("text", { x: PADL - 6, y: sy(yv) + 4, class: "sino-axislabel",
                            "text-anchor": "end" });
      yl.textContent = String(yv);
      svg.appendChild(yl);
    });

    var midline = el("line", { class: "sino-midline", "clip-path": "url(#" + clip.id + ")" });
    svg.appendChild(midline);

    var targetPath = null;
    if (target) {
      targetPath = el("path", { class: "sino-target", "clip-path": "url(#" + clip.id + ")" });
      svg.appendChild(targetPath);
    }
    var curve = el("path", { class: "sino-curve", "clip-path": "url(#" + clip.id + ")" });
    svg.appendChild(curve);

    box.appendChild(svg);

    // ---- Controls ----------------------------------------------------------
    var controls = document.createElement("div");
    controls.className = "sino-controls";
    box.appendChild(controls);

    function evalAt(p, x) {
      var inner = p.B * (x - p.C);
      return p.A * (p.fn === "cos" ? Math.cos(inner) : Math.sin(inner)) + p.D;
    }
    function pathFor(p) {
      var d = "", N = 300;
      for (var i = 0; i <= N; i++) {
        var x = XMIN + (XMAX - XMIN) * i / N;
        d += (i ? " L" : "M") + sx(x).toFixed(2) + " " + sy(evalAt(p, x)).toFixed(2);
      }
      return d;
    }

    var readout = document.createElement("div");
    readout.className = "sino-readout";
    box.appendChild(readout);

    var matchTag = null;
    if (target) {
      matchTag = document.createElement("div");
      matchTag.className = "sino-match";
      box.appendChild(matchTag);
      targetPath.setAttribute("d", pathFor(target));
    }

    function redraw() {
      curve.setAttribute("d", pathFor(state));
      var my = sy(state.D);
      midline.setAttribute("x1", PADL); midline.setAttribute("x2", PADL + W);
      midline.setAttribute("y1", my); midline.setAttribute("y2", my);

      var period = 2 * PI / state.B;
      readout.innerHTML = "";
      [["equation", eqStr(state)],
       ["amplitude", "|A| = " + fmtNum(Math.abs(state.A))],
       ["period", "2π/B = " + piFmt(period)],
       ["phase shift", (state.C === 0 ? "0" : piFmt(state.C) +
          (state.C > 0 ? " right" : " left"))],
       ["midline", "y = " + fmtNum(state.D)]
      ].forEach(function (r) {
        var row = document.createElement("div");
        row.className = "sino-rrow";
        row.innerHTML = '<span class="sino-rkey">' + r[0] + '</span>' +
                        '<span class="sino-rval math">' + r[1] + '</span>';
        readout.appendChild(row);
      });

      if (target) {
        var ok = curvesMatch(state, target);
        matchTag.textContent = ok ? "✓ matched the target" : "not yet — keep adjusting";
        matchTag.className = "sino-match " + (ok ? "sino-match-ok" : "");
      }
    }
    function approx(a, b) { return Math.abs(a - b) < 1e-6; }
    // Compare CURVES, not parameters. One sinusoid has many equivalent
    // equations (−2sin x ≡ 2sin(x − π); a cosine is a shifted sine), and any
    // correct form deserves the match. Tolerance sits far above float noise
    // from the identity rewrites (~1e-15) and far below one slider step.
    function curvesMatch(p, q) {
      if (!q) return false;
      for (var i = 0; i <= 96; i++) {
        var x = XMIN + (XMAX - XMIN) * i / 96;
        if (Math.abs(evalAt(p, x) - evalAt(q, x)) > 1e-6) return false;
      }
      return true;
    }
    function fmtNum(v) {
      var s = Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
      return s.replace("-", "−");  // U+2212 minus, to match piFmt/eqStr
    }
    function eqStr(p) {
      var a = fmtNum(p.A);
      var inner = (approx(p.B, 1) ? "" : fmtNum(p.B)) + "(x" +
        (approx(p.C, 0) ? "" : (p.C > 0 ? " − " : " + ") + piFmt(Math.abs(p.C))) + ")";
      if (approx(p.C, 0)) inner = (approx(p.B, 1) ? "" : fmtNum(p.B)) + "x";
      var d = approx(p.D, 0) ? "" : (p.D > 0 ? " + " : " − ") + fmtNum(Math.abs(p.D));
      return "y = " + (a === "1" ? "" : a === "−1" ? "−" : a) + p.fn + "(" + inner + ")" + d;
    }

    // Sliders. Each maps an integer range onto a stepped real value so the
    // learner lands on the tidy values CLEP uses (halves, quarter-π phases).
    function slider(name, min, max, toVal, fromVal) {
      var wrap = document.createElement("label");
      wrap.className = "sino-slider";
      var cap = document.createElement("span");
      cap.className = "sino-scap";
      var input = el2("input");
      input.type = "range"; input.min = min; input.max = max; input.step = 1;
      input.value = fromVal(state[name]);
      function sync() {
        state[name] = toVal(+input.value);
        cap.textContent = name + " = " + (name === "C" ? piFmt(state[name]) : fmtNum(state[name]));
        redraw();
      }
      input.addEventListener("input", sync);
      wrap.appendChild(cap); wrap.appendChild(input);
      controls.appendChild(wrap);
      sync();
    }
    function el2(t) { return document.createElement(t); }

    // fn toggle
    var fnWrap = document.createElement("div");
    fnWrap.className = "sino-fntoggle";
    ["sin", "cos"].forEach(function (f) {
      var b = document.createElement("button");
      b.className = "sino-fnbtn"; b.textContent = f;
      b.onclick = function () {
        state.fn = f;
        Array.prototype.forEach.call(fnWrap.children, function (c) {
          c.classList.toggle("sino-fnbtn-on", c.textContent === f);
        });
        redraw();
      };
      if (f === state.fn) b.classList.add("sino-fnbtn-on");
      fnWrap.appendChild(b);
    });
    controls.appendChild(fnWrap);

    slider("A", -6, 6, function (i) { return i * 0.5; }, function (v) { return Math.round(v / 0.5); });
    slider("B", 1, 6, function (i) { return i * 0.5; }, function (v) { return Math.round(v / 0.5); });
    slider("C", -4, 4, function (i) { return i * PI / 4; }, function (v) { return Math.round(v / (PI / 4)); });
    slider("D", -4, 4, function (i) { return i * 0.5; }, function (v) { return Math.round(v / 0.5); });

    if (cfg.caption) {
      var cap = document.createElement("div");
      cap.className = "sino-caption";
      cap.textContent = cfg.caption;
      box.appendChild(cap);
    }

    redraw();
    container.appendChild(box);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".sinusoid-lab").forEach(build);
  });
})();
