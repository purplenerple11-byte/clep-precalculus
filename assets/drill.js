/* Long-form drill set for CLEP Precalculus lessons.
   Usage: <div class="drill-set" data-drill="drill-name"></div>
   plus a matching <script type="application/json" id="drill-name">{...}</script>

   Spec shape:
     { "title": "Drill A — ...",
       "note": "optional one-line framing",
       "items": [ { "q": "...", "a": "exact answer", "choices": [...], "why": "..." } ] }

   Differs from quiz.js in three ways that matter for a 15-minute session:
     * every item carries a `why`, so a wrong answer teaches instead of just scoring;
     * an elapsed timer runs from the first answer, so the learner can see whether
       they actually put the time in rather than guessing at it;
     * misses are collected and can be re-drilled on their own. Re-drilling only
       the misses is the whole point — a second pass over items you already got
       right builds almost nothing.

   Choices are SHUFFLED at render time (see quiz.js — same rule, same reason:
   authoring order must never leak the answer). */
(function () {
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function fmtTime(ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderDrill(container) {
    var dataEl = document.getElementById(container.getAttribute("data-drill"));
    if (!dataEl) return;
    var spec = JSON.parse(dataEl.textContent);

    var queue = spec.items.slice();
    var idx = 0;
    var score = 0;
    var missed = [];
    var startedAt = null;
    var elapsed = 0;
    var ticker = null;

    var box = el("div", "drill-box");
    container.appendChild(box);

    var head = el("div", "drill-head");
    head.appendChild(el("div", "drill-title", spec.title || "Drill"));
    var meter = el("div", "drill-meter", "");
    head.appendChild(meter);
    box.appendChild(head);

    if (spec.note) box.appendChild(el("p", "drill-note", spec.note));

    var body = el("div", "drill-body");
    box.appendChild(body);

    function paintMeter() {
      var clock = startedAt ? "  ·  " + fmtTime(elapsed + (Date.now() - startedAt)) : "";
      var pos = Math.min(idx + 1, queue.length);
      meter.textContent = pos + " / " + queue.length + clock;
    }

    function startClock() {
      if (startedAt) return;
      startedAt = Date.now();
      ticker = setInterval(paintMeter, 1000);
    }

    function stopClock() {
      if (!startedAt) return;
      elapsed += Date.now() - startedAt;
      startedAt = null;
      clearInterval(ticker);
      ticker = null;
    }

    function restart(items) {
      queue = items;
      idx = 0;
      score = 0;
      missed = [];
      renderItem();
    }

    function renderDone() {
      stopClock();
      body.innerHTML = "";
      meter.textContent = queue.length + " / " + queue.length + "  ·  " + fmtTime(elapsed);

      body.appendChild(el("div", "drill-done",
        score + " of " + queue.length + " in " + fmtTime(elapsed)));

      if (missed.length) {
        var list = el("div", "drill-missed");
        list.appendChild(el("div", "drill-missed-label",
          "Missed — these are the ones worth telling your teacher about"));
        missed.forEach(function (m) {
          var row = el("div", "drill-missed-row");
          row.appendChild(el("span", "drill-missed-q", m.q));
          row.appendChild(el("span", "drill-missed-a", m.a));
          list.appendChild(row);
        });
        body.appendChild(list);
      } else {
        body.appendChild(el("p", "drill-clean", "Clean sweep. Move on."));
      }

      var row = el("div", "drill-btnrow");
      if (missed.length) {
        var again = el("button", "drill-btn drill-btn-primary",
          "Redo just the " + missed.length + " missed");
        again.onclick = function () { restart(missed.slice()); };
        row.appendChild(again);
      }
      var all = el("button", "drill-btn", "Restart all");
      all.onclick = function () { elapsed = 0; restart(spec.items.slice()); };
      row.appendChild(all);
      body.appendChild(row);
    }

    function renderItem() {
      if (idx >= queue.length) return renderDone();
      body.innerHTML = "";
      paintMeter();

      var item = queue[idx];
      body.appendChild(el("div", "drill-q", item.q));

      var choiceWrap = el("div", "drill-choices");
      if (!item._shuffled) item._shuffled = shuffle(item.choices);

      var why = el("div", "drill-why");

      item._shuffled.forEach(function (choice) {
        var btn = el("button", "drill-choice", choice);
        btn.onclick = function () {
          startClock();
          var right = choice === item.a;
          Array.prototype.forEach.call(choiceWrap.children, function (b) {
            b.disabled = true;
            if (b.textContent === item.a) b.className = "drill-choice drill-choice-good";
          });
          if (right) {
            score++;
          } else {
            btn.className = "drill-choice drill-choice-bad";
            missed.push(item);
          }
          why.className = "drill-why " + (right ? "drill-why-good" : "drill-why-bad");
          why.textContent = (right ? "Correct. " : "Answer: " + item.a + ". ") + (item.why || "");
          why.style.display = "block";

          var next = el("button", "drill-btn drill-next",
            idx + 1 < queue.length ? "Next" : "Finish");
          next.onclick = function () { idx++; renderItem(); };
          body.appendChild(next);
        };
        choiceWrap.appendChild(btn);
      });

      body.appendChild(choiceWrap);
      body.appendChild(why);
    }

    renderItem();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".drill-set").forEach(renderDrill);
  });
})();
