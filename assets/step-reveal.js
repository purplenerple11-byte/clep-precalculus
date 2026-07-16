/* Predict-then-reveal worked example.
   Instead of letting the eye slide down a finished solution, each step stays
   hidden until the learner commits to predicting it. That commitment is the
   desirable difficulty — it converts passive reading into retrieval.

   Usage: <div class="step-reveal" data-steps="steps-name"></div>
   plus <script type="application/json" id="steps-name">{...}</script>

   Shape: {
     problem: "sin(2θ) = sin θ  on [0, 2π)",
     steps: [
       { hint: "Two different angles appear. Collapse them.",
         result: "2 sin θ cos θ = sin θ",
         note: "Optional aside shown after reveal." }
     ]
   } */
(function () {
  function renderSteps(container) {
    var dataEl = document.getElementById(container.getAttribute("data-steps"));
    if (!dataEl) return;
    var data = JSON.parse(dataEl.textContent);

    var box = document.createElement("div");
    box.className = "steps-box";

    var label = document.createElement("div");
    label.className = "steps-label";
    label.textContent = "Work it through";
    box.appendChild(label);

    var problem = document.createElement("div");
    problem.className = "steps-problem math";
    problem.textContent = data.problem;
    box.appendChild(problem);

    var list = document.createElement("div");
    list.className = "steps-list";
    box.appendChild(list);

    var revealed = 0;

    function renderStep(i) {
      var step = data.steps[i];
      var row = document.createElement("div");
      row.className = "steps-row";

      var hint = document.createElement("div");
      hint.className = "steps-hint";
      hint.textContent = step.hint;
      row.appendChild(hint);

      var btn = document.createElement("button");
      btn.className = "quiz-btn steps-btn";
      btn.textContent = "I've predicted it — reveal";
      row.appendChild(btn);

      var out = document.createElement("div");
      out.className = "steps-result";
      row.appendChild(out);

      btn.onclick = function () {
        btn.remove();
        out.style.display = "block";
        var r = document.createElement("div");
        r.className = "math steps-math";
        r.textContent = step.result;
        out.appendChild(r);
        if (step.note) {
          var n = document.createElement("div");
          n.className = "steps-note";
          n.textContent = step.note;
          out.appendChild(n);
        }
        revealed++;
        if (revealed < data.steps.length) renderStep(revealed);
      };

      list.appendChild(row);
    }

    renderStep(0);
    container.appendChild(box);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".step-reveal").forEach(renderSteps);
  });
})();
