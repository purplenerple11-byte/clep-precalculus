#!/usr/bin/env python3
"""PWA install-correctness tests. Standard library only.

    python3 -m unittest discover -s tests -v

These guard the failure modes that are silent — where the site looks fine in a
desktop browser but the installed app is broken on a phone, and you don't find
out until it's on someone's home screen:

  * An absolute "/" path. GitHub Pages serves this repo from
    /<repo>/, not a domain root, so a leading slash escapes the project
    subpath and the installed app launches into a 404.
  * A missing 192 or 512 icon. Chrome requires both; without them the install
    prompt simply never fires, with no error.
  * A missing apple-touch-icon. iOS ignores manifest icons entirely, so Android
    looks correct while the iPhone home screen shows a blank or screenshotted
    tile.
"""

import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "manifest.json"

# Pages that must be installable/branded. Value is the depth below the root,
# which determines how many "../" a correct relative path needs.
PAGES = {
    "index.html": 0,
    "lessons/0001-identity-application.html": 1,
    "lessons/0002-right-triangles.html": 1,
    "lessons/0003-graphing-sinusoids.html": 1,
    "lessons/0004-inverse-trig.html": 1,
    "lessons/0005-triangle-from-ratio.html": 1,
    "reference/trig-identities.html": 1,
    "reference/right-triangles.html": 1,
    "reference/sinusoids.html": 1,
    "reference/inverse-trig.html": 1,
}


def png_size(path: Path):
    """Read a PNG's real pixel dimensions from its IHDR, without any decoder."""
    b = path.read_bytes()
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    return struct.unpack(">II", b[16:24])


class TestManifestParses(unittest.TestCase):
    def test_manifest_exists(self):
        self.assertTrue(MANIFEST.is_file(), "manifest.json missing from repo root")

    def test_manifest_is_valid_json(self):
        json.loads(MANIFEST.read_text())  # raises on malformed JSON

    def test_required_fields_present(self):
        m = json.loads(MANIFEST.read_text())
        for field in ("name", "short_name", "start_url", "scope", "display",
                      "background_color", "theme_color", "icons"):
            self.assertIn(field, m, f"manifest missing required field: {field}")

    def test_display_is_standalone(self):
        m = json.loads(MANIFEST.read_text())
        self.assertEqual(m["display"], "standalone")


class TestPathsAreRelative(unittest.TestCase):
    """Pages serves from /<repo>/ — any absolute path breaks the installed app."""

    def test_manifest_urls_are_relative(self):
        m = json.loads(MANIFEST.read_text())
        for field in ("start_url", "scope"):
            v = m[field]
            self.assertFalse(
                v.startswith("/"),
                f"manifest {field}={v!r} is absolute; on Pages it resolves off the "
                f"/<repo>/ subpath and the installed app launches to a 404",
            )
            self.assertFalse(v.startswith(("http://", "https://")),
                             f"manifest {field}={v!r} is an absolute URL")

    def test_icon_srcs_are_relative(self):
        m = json.loads(MANIFEST.read_text())
        for icon in m["icons"]:
            self.assertFalse(
                icon["src"].startswith(("/", "http://", "https://")),
                f"icon src {icon['src']!r} is not relative",
            )

    def test_no_absolute_local_paths_in_html(self):
        """Catch href="/..." and src="/..." — but allow external https:// links."""
        import re
        pattern = re.compile(r'(?:href|src)="(/[^/][^"]*)"')
        for page in PAGES:
            text = (ROOT / page).read_text()
            hits = pattern.findall(text)
            self.assertEqual(hits, [], f"{page} has root-absolute path(s): {hits}")


class TestIconsResolve(unittest.TestCase):
    def test_declared_icons_exist(self):
        m = json.loads(MANIFEST.read_text())
        for icon in m["icons"]:
            p = ROOT / icon["src"]
            self.assertTrue(p.is_file(), f"manifest declares {icon['src']} but it does not exist")

    def test_declared_sizes_match_actual_pixels(self):
        """A manifest can lie about sizes; the browser believes the file."""
        m = json.loads(MANIFEST.read_text())
        for icon in m["icons"]:
            declared = icon["sizes"]
            w, h = png_size(ROOT / icon["src"])
            self.assertEqual(f"{w}x{h}", declared,
                             f"{icon['src']} is really {w}x{h} but declares {declared}")

    def test_chrome_requires_192_and_512(self):
        m = json.loads(MANIFEST.read_text())
        sizes = {i["sizes"] for i in m["icons"]}
        for need in ("192x192", "512x512"):
            self.assertIn(need, sizes,
                          f"missing {need}; Chrome's install prompt silently never fires")

    def test_icons_are_maskable(self):
        m = json.loads(MANIFEST.read_text())
        for icon in m["icons"]:
            self.assertIn("maskable", icon.get("purpose", ""),
                          f"{icon['src']} is not declared maskable")


class TestHeadTags(unittest.TestCase):
    def test_every_page_links_manifest(self):
        for page, depth in PAGES.items():
            text = (ROOT / page).read_text()
            self.assertIn('rel="manifest"', text, f"{page} has no manifest link")
            expected = "../" * depth + "manifest.json"
            self.assertIn(f'href="{expected}"', text,
                          f"{page} should link manifest at {expected}")

    def test_every_page_has_apple_touch_icon(self):
        """iOS ignores the manifest icons entirely and reads only this link."""
        for page, depth in PAGES.items():
            text = (ROOT / page).read_text()
            self.assertIn('rel="apple-touch-icon"', text,
                          f"{page} has no apple-touch-icon; iOS will show a blank tile")
            expected = "../" * depth + "icons/icon-180.png"
            self.assertIn(f'href="{expected}"', text,
                          f"{page} should point apple-touch-icon at {expected}")

    def test_apple_touch_icon_file_is_180(self):
        p = ROOT / "icons" / "icon-180.png"
        self.assertTrue(p.is_file(), "icons/icon-180.png missing")
        self.assertEqual(png_size(p), (180, 180))

    def test_every_page_has_theme_color(self):
        m = json.loads(MANIFEST.read_text())
        for page in PAGES:
            text = (ROOT / page).read_text()
            self.assertIn('name="theme-color"', text, f"{page} has no theme-color")
            self.assertIn(f'content="{m["theme_color"]}"', text,
                          f"{page} theme-color should match the manifest")


class TestReferencedFilesExist(unittest.TestCase):
    """Every local href/src in every page must resolve on disk."""

    def test_local_links_resolve(self):
        import re
        pattern = re.compile(r'(?:href|src)="([^"#:]+)"')
        missing = []
        for page in PAGES:
            base = (ROOT / page).parent
            for link in pattern.findall((ROOT / page).read_text()):
                if link.startswith(("http", "//", "mailto:", "data:")):
                    continue
                target = (base / link.split("#")[0]).resolve()
                if not target.exists():
                    missing.append(f"{page} -> {link}")
        self.assertEqual(missing, [], f"dead local links: {missing}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
