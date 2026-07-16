/* Strategy picker: trains *move selection*, not fact recall.
   Shows a problem, asks which move to make first, and explains why each
   option is right or wrong. This is the component for "which identity do I
   reach for?" — the gap between recognizing identities and applying them.

   Usage: <div class="strategy-picker" data-picker="picker-name"></div>
   plus <script type="application/json" id="picker-name">{...}</script>

   Shape: {
     problem: "2sin²θ − sin θ − 1 = 0",
     prompt: "What's your first move?",
     options: [
       { label: "Factor it like a quadratic", correct: true,
         why: "Right — it's quadratic in sin θ." },
       { label: "Apply a double-angle identity", correct: false,
         why: "No second angle appears, so there's nothing to collapse." }
     ]
   }
   Options are shuffled at render time. Every option needs a `why` — the
   rationale on a WRONG option is where most of the teaching happens. */
(function () {
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function renderPicker(container) {
    var dataEl = document.getElementById(container.getAttribute("data-picker"));
    if (!dataEl) return;
    var data = JSON.parse(dataEl.textContent);

    var box = document.createElement("div");
    box.className = "picker-box";

    var label = document.createElement("div");
    label.className = "picker-label";
    label.textContent = "Choose the move";
    box.appendChild(label);

    var problem = document.createElement("div");
    problem.className = "picker-problem math";
    problem.textContent = data.problem;
    box.appendChild(problem);

    var prompt = document.createElement("div");
    prompt.className = "picker-prompt";
    prompt.textContent = data.prompt || "What's your first move?";
    box.appendChild(prompt);

    var opts = document.createElement("div");
    opts.className = "picker-options";
    box.appendChild(opts);

    var result = document.createElement("div");
    result.className = "picker-result";
    box.appendChild(result);

    shuffle(data.options).forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "picker-opt";
      btn.textContent = opt.label;
      btn.onclick = function () {
        Array.prototype.forEach.call(opts.children, function (b) {
          b.disabled = true;
        });
        btn.classList.add(opt.correct ? "picker-opt-good" : "picker-opt-bad");
        result.className =
          "picker-result " + (opt.correct ? "picker-good" : "picker-bad");
        result.style.display = "block";
        result.textContent = opt.why;
        if (!opt.correct) {
          var right = data.options.filter(function (o) { return o.correct; })[0];
          if (right) {
            var hint = document.createElement("div");
            hint.className = "picker-hint";
            hint.textContent = "Better move: " + right.label + " — " + right.why;
            result.appendChild(hint);
          }
        }
      };
      opts.appendChild(btn);
    });

    container.appendChild(box);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".strategy-picker").forEach(renderPicker);
  });
})();
