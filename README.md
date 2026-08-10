# CLEP Precalculus — Trigonometry

Interactive trig lessons and printable reference sheets, built as an installable
PWA. Static site: no build step, no npm, no dependencies.

**Live:** https://purplenerple11-byte.github.io/clep-precalculus/

## Install on a phone

- **iOS (Safari):** Share → Add to Home Screen
- **Android (Chrome):** the install prompt appears automatically, or ⋮ → Install app

## Layout

```
index.html        home / start_url
manifest.json     PWA manifest (all paths relative)
icons/            generated — do not hand-edit
lessons/          the lessons
reference/        printable cheat sheets
assets/           shared stylesheet + reusable lesson components
tools/            icon generator
tests/            PWA correctness tests
```

## How the lessons work

Every lesson follows the same shape, and new lessons must keep it:

1. **A short teach.** Only enough to name the move — the method, not the commentary.
2. **Example 1, level one.** The basic case, walked through with predict-then-reveal
   so the learner commits to each line before seeing it.
3. **Example 2, harder.** The version the exam actually asks — same machinery plus
   the complications (inverse notation, a non-acute angle, a phase shift inside).
4. **Drills — fifteen minutes minimum.** The bulk of the lesson, not a coda.
   Three blocks of increasing difficulty, roughly thirty items.
5. **Footer nav** — previous, home, forward.

**Heuristics, traps, mnemonics and sanity checks belong in `reference/`, not in the
lesson.** The lesson is for doing; the reference is the page that gets re-read and
printed. When a lesson is rewritten into this shape, that prose is *moved* rather
than deleted.

Lessons `0004`–`0007` are the reference implementations.

### Components (`assets/`)

Reuse before writing anything new.

| File | Purpose |
|---|---|
| `style.css` | Shared stylesheet and every component's styles. Print rules force interactive answers visible. |
| `drill.js` | Long-form drill sets — the workhorse. Per-item rationales, an elapsed timer, and misses collected for re-drilling. |
| `step-reveal.js` | Predict-then-reveal worked examples. |
| `quiz.js` | Short retrieval quiz. Superseded by `drill.js` for new lessons. |
| `strategy-picker.js` | "Which move first?" — trains selection. Its rationales are heuristics, so prefer the reference sheet under the current format. |
| `triangle.js` | Interactive right triangle; toggles the reference angle so opposite/adjacent visibly swap. |
| `sinusoid.js` | Grapher for `y = A·sin(B(x − C)) + D`, with target matching that compares **curves, not formulas**. |

Drill answers are verified numerically before shipping — every stated answer
recomputed from an independent construction, and every distractor checked *not* to
be correct as well.

## Icons

Regenerate after changing colours or the mark:

```sh
python3 tools/make_icons.py
```

Standard library only — no Pillow, no ImageMagick. It hand-encodes PNGs with
`zlib` + `struct` and draws the theta mathematically, so the icons are
reproducible from source rather than opaque committed binaries.

The design is a solid terracotta field with a centred cream theta. The field is
full-bleed and opaque on purpose: Android's maskable crop clips icon edges to a
circle or squircle depending on the launcher, and a solid field has nothing at
the edges to lose. That is why one image safely serves both `any` and
`maskable` at every size.

## Tests

```sh
python3 -m unittest discover -s tests -v
```

They guard the install failures that are *silent* — where the desktop site looks
fine but the phone install is broken:

- **Absolute paths.** Pages serves from `/<repo>/`, not a domain root. A leading
  `/` in `start_url` makes the installed app launch into a 404.
- **Missing 192 or 512 icon.** Chrome needs both or the install prompt never
  fires, with no error.
- **Missing `apple-touch-icon`.** iOS ignores manifest icons entirely, so Android
  looks right while the iPhone tile is blank.

## No service worker

Deliberate. A service worker is not required to install a PWA, despite what older
tutorials say. Offline support is a separate and much larger job.
