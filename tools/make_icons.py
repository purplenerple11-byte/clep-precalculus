#!/usr/bin/env python3
"""Generate the PWA icons. Standard library only — no Pillow, no ImageMagick.

Run from the repo root:

    python3 tools/make_icons.py

Rewrites icons/icon-180.png, icons/icon-192.png and icons/icon-512.png. Output is
deterministic: same source, same bytes.

Design
------
A solid terracotta field, full bleed, with a centred cream theta.

The field is deliberately edge-to-edge and opaque. Android's maskable crop can
cut an icon to a circle, squircle, or rounded square depending on the launcher,
and it clips whatever it likes off the edges — but a solid field has nothing at
the edges to lose. That is why one image can safely serve both "any" and
"maskable" at every size, instead of maintaining separate padded variants.

The theta is drawn mathematically (an elliptical ring unioned with a crossbar)
rather than set in a font, because rendering a glyph needs a font library and
that would mean a binary dependency. It is kept inside the maskable safe zone:
a centred circle of diameter 80% of the icon, i.e. radius 0.4 x size.
"""

import struct
import sys
import zlib
from pathlib import Path

# --- Design constants ---------------------------------------------------------

FIELD = (0x8a, 0x3b, 0x2e)   # #8a3b2e terracotta accent
MARK = (0xfd, 0xfc, 0xf9)    # #fdfcf9 cream page background

# Theta geometry, as fractions of the icon's edge length.
RX = 0.150      # outer ellipse semi-axis, x
RY = 0.235      # outer ellipse semi-axis, y (theta is taller than it is wide)
STROKE = 0.050  # ring thickness and crossbar thickness

SAFE_RADIUS = 0.40  # maskable safe zone: radius as a fraction of edge length

SIZES = (180, 192, 512)
SUPERSAMPLE = 4  # 4x4 = 16 coverage samples per pixel, for antialiasing


def _inside_theta(x: float, y: float) -> bool:
    """True if (x, y) — in units of edge length, origin at centre — is in the mark."""
    # Outer ellipse. Everything in the glyph is clipped to this.
    outer = (x / RX) ** 2 + (y / RY) ** 2
    if outer > 1.0:
        return False
    # Ring: inside the outer ellipse but outside the inner one.
    rx_in, ry_in = RX - STROKE, RY - STROKE
    if (x / rx_in) ** 2 + (y / ry_in) ** 2 >= 1.0:
        return True
    # Crossbar: the horizontal stroke through the middle, already clipped above.
    return abs(y) <= STROKE / 2.0


def _coverage(px: int, py: int, size: int) -> float:
    """Fraction of pixel (px, py) covered by the mark, via supersampling."""
    hits = 0
    for sy in range(SUPERSAMPLE):
        for sx in range(SUPERSAMPLE):
            # Sample at sub-pixel centres, then normalise to origin-at-centre units.
            x = (px + (sx + 0.5) / SUPERSAMPLE) / size - 0.5
            y = (py + (sy + 0.5) / SUPERSAMPLE) / size - 0.5
            if _inside_theta(x, y):
                hits += 1
    return hits / (SUPERSAMPLE * SUPERSAMPLE)


def _render(size: int) -> list:
    """Render the icon as a list of RGB scanlines."""
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            a = _coverage(px, py, size)
            if a <= 0.0:
                row += bytes(FIELD)
            elif a >= 1.0:
                row += bytes(MARK)
            else:
                # Composite the mark over the field at this coverage.
                row += bytes(
                    round(FIELD[i] + (MARK[i] - FIELD[i]) * a) for i in range(3)
                )
        rows.append(row)
    return rows


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _png(rows: list, size: int) -> bytes:
    """Encode RGB scanlines as a PNG (colour type 2, 8-bit, filter 0)."""
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw, 9))
        + _chunk(b"IEND", b"")
    )


def _check_safe_zone() -> None:
    """Fail loudly if the mark could be clipped by a maskable crop."""
    corner = (RX**2 + RY**2) ** 0.5
    if corner > SAFE_RADIUS:
        sys.exit(
            f"theta extends to r={corner:.3f} but the maskable safe zone is "
            f"r={SAFE_RADIUS:.3f}; it would be clipped on some launchers"
        )


def main() -> None:
    _check_safe_zone()
    out = Path(__file__).resolve().parent.parent / "icons"
    out.mkdir(exist_ok=True)
    for size in SIZES:
        path = out / f"icon-{size}.png"
        path.write_bytes(_png(_render(size), size))
        print(f"wrote {path.relative_to(path.parent.parent)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
