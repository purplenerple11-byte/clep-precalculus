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
