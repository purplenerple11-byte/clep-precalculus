/* Interactive right-triangle labeler.

   Targets the actual misconception in right-triangle trig: the hypotenuse is
   fixed, but OPPOSITE and ADJACENT swap depending on which acute angle you
   reference. Learners who know the unit circle cold still lose points here,
   because on the unit circle there's only ever one reference angle — so the
   relativity of opposite/adjacent never came up.

   Toggling the reference angle re-labels the sides live and rewrites the three
   ratios, so the swap is something you watch happen rather than something you
   memorize.

   Usage: <div class="triangle-lab" data-triangle="tri-name"></div>
   plus <script type="application/json" id="tri-name">{...}</script>

   Shape (all fields optional):
   { "legA": "8", "legB": "6", "hyp": "10", "caption": "..." }
   legA = horizontal leg (A→C), legB = vertical leg (C→B), hyp = A→B. */
(function () {
  var NS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function renderTriangle(container) {
    var dataEl = document.getElementById(container.getAttribute("data-triangle"));
    var data = dataEl ? JSON.parse(dataEl.textContent) : {};
    var legA = data.legA || "b";   // horizontal, A→C
    var legB = data.legB || "a";   // vertical,   C→B
    var hyp = data.hyp || "c";     // A→B

    // Vertices: right angle at C (bottom-right). Drawn at 32px per unit so a
    // 6-8-10 renders roughly to scale — a triangle whose picture contradicts
    // its labels teaches the wrong intuition.
    var A = { x: 48, y: 225 };
    var C = { x: 304, y: 225 };
    var B = { x: 304, y: 33 };
    // Right margin must clear the longest role word ("adjacent") set beside C.
    var VB_W = 420, VB_H = 280;

    var box = document.createElement("div");
    box.className = "tri-box";

    var label = document.createElement("div");
    label.className = "tri-label";
    label.textContent = "Reference angle";
    box.appendChild(label);

    var toggle = document.createElement("div");
    toggle.className = "tri-toggle";
    box.appendChild(toggle);

    var svg = el("svg", {
      viewBox: "0 0 " + VB_W + " " + VB_H,
      class: "tri-svg",
      role: "img",
      "aria-label": "Right triangle with vertices A, B and right angle at C"
    });

    svg.appendChild(el("polygon", {
      points: A.x + "," + A.y + " " + C.x + "," + C.y + " " + B.x + "," + B.y,
      class: "tri-shape"
    }));

    // Right-angle square at C.
    svg.appendChild(el("polyline", {
      points: (C.x - 22) + "," + C.y + " " + (C.x - 22) + "," + (C.y - 22) +
              " " + C.x + "," + (C.y - 22),
      class: "tri-right-angle"
    }));

    // Arc marking the active reference angle.
    var arcA = el("path", {
      d: "M " + (A.x + 42) + " " + A.y + " A 42 42 0 0 0 " +
         (A.x + 36) + " " + (A.y - 21),
      class: "tri-arc"
    });
    var arcB = el("path", {
      d: "M " + B.x + " " + (B.y + 42) + " A 42 42 0 0 0 " +
         (B.x - 21) + " " + (B.y + 36),
      class: "tri-arc"
    });
    svg.appendChild(arcA);
    svg.appendChild(arcB);

    function txt(x, y, cls, str, anchor) {
      var t = el("text", { x: x, y: y, class: cls, "text-anchor": anchor || "middle" });
      t.textContent = str;
      return t;
    }

    // Vertex names.
    svg.appendChild(txt(A.x - 16, A.y + 6, "tri-vertex", "A"));
    svg.appendChild(txt(B.x + 16, B.y + 4, "tri-vertex", "B"));
    svg.appendChild(txt(C.x + 16, C.y + 6, "tri-vertex", "C"));

    // Hypotenuse labels ride along the hypotenuse, offset perpendicular and
    // away from the interior. Set horizontally they'd cross the line itself,
    // since the line slopes underneath them.
    var hypMid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    var dx = B.x - A.x, dy = B.y - A.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    var nx = -dy / len, ny = dx / len;        // one unit normal
    var cx = (A.x + B.x + C.x) / 3, cy = (A.y + B.y + C.y) / 3;
    if ((cx - hypMid.x) * nx + (cy - hypMid.y) * ny > 0) { nx = -nx; ny = -ny; }

    function onHyp(offset, cls, str) {
      var px = hypMid.x + nx * offset, py = hypMid.y + ny * offset;
      var t = txt(px, py, cls, str);
      t.setAttribute("transform", "rotate(" + angle.toFixed(2) + " " + px.toFixed(1) + " " + py.toFixed(1) + ")");
      return t;
    }

    // Side labels: value + role. Role text is what swaps.
    var botVal = txt((A.x + C.x) / 2, A.y + 26, "tri-side-val", legA);
    var botRole = txt((A.x + C.x) / 2, A.y + 45, "tri-side-role", "");
    var rightVal = txt(C.x + 14, (C.y + B.y) / 2, "tri-side-val", legB, "start");
    var rightRole = txt(C.x + 14, (C.y + B.y) / 2 + 19, "tri-side-role", "", "start");
    // Offsets stack the two labels along the normal; keep them far enough apart
    // that font-metric differences across machines can't close the gap.
    var hypVal = onHyp(15, "tri-side-val", hyp);
    var hypRole = onHyp(37, "tri-side-role", "hypotenuse");
    [botVal, botRole, rightVal, rightRole, hypVal, hypRole].forEach(function (t) {
      svg.appendChild(t);
    });

    box.appendChild(svg);

    var ratios = document.createElement("div");
    ratios.className = "tri-ratios";
    box.appendChild(ratios);

    if (data.caption) {
      var cap = document.createElement("div");
      cap.className = "tri-caption";
      cap.textContent = data.caption;
      box.appendChild(cap);
    }

    function setAngle(which) {
      var atA = which === "A";
      // The swap: from A the vertical leg is opposite; from B it's adjacent.
      botRole.textContent = atA ? "adjacent" : "opposite";
      rightRole.textContent = atA ? "opposite" : "adjacent";
      arcA.style.opacity = atA ? "1" : "0";
      arcB.style.opacity = atA ? "0" : "1";

      var opp = atA ? legB : legA;
      var adj = atA ? legA : legB;

      ratios.innerHTML = "";
      [["sin", opp, hyp, "SOH"], ["cos", adj, hyp, "CAH"], ["tan", opp, adj, "TOA"]]
        .forEach(function (r) {
          var row = document.createElement("div");
          row.className = "tri-ratio";
          var fn = document.createElement("span");
          fn.className = "tri-ratio-fn math";
          fn.textContent = r[0] + " " + which + " =";
          var frac = document.createElement("span");
          frac.className = "tri-ratio-frac math";
          frac.textContent = r[1] + " / " + r[2];
          var mnem = document.createElement("span");
          mnem.className = "tri-ratio-mnem";
          mnem.textContent = r[3];
          row.appendChild(fn);
          row.appendChild(frac);
          row.appendChild(mnem);
          ratios.appendChild(row);
        });

      Array.prototype.forEach.call(toggle.children, function (b) {
        b.classList.toggle("tri-btn-on", b.dataset.angle === which);
      });
    }

    ["A", "B"].forEach(function (which) {
      var b = document.createElement("button");
      b.className = "tri-btn";
      b.dataset.angle = which;
      b.textContent = "angle " + which;
      b.onclick = function () { setAngle(which); };
      toggle.appendChild(b);
    });

    container.appendChild(box);
    setAngle("A");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".triangle-lab").forEach(renderTriangle);
  });
})();
