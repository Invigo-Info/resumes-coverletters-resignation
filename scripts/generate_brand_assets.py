"""Generate the app icons and the OpenGraph share image.

    python scripts/generate_brand_assets.py

Checked-in output, not a build step. These are brand assets that change roughly
never, and a runtime `ImageResponse` route would add an edge function plus a
cold start to every social crawl for no benefit.

Every value here is taken from what the app already uses - the --logo-from /
--logo-to gradient stops in globals.css, and the shape of the lucide
`message-square-text` glyph that LogoMark renders - so the icon a user bookmarks
is the mark they saw in the header. Re-run only when the brand changes.

Produces:
    src/app/icon.png            512  browser favicon / tab icon
    src/app/apple-icon.png      180  iOS home screen (iOS will not take an SVG)
    public/brand/icon-192.png   192  web app manifest
    public/brand/icon-512.png   512  web app manifest + install prompt
    src/app/opengraph-image.png 1200x630  link previews and Twitter cards
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

# --- brand values, mirrored from src/app/globals.css ------------------------
LOGO_FROM = (0x4C, 0xB0, 0xFF)  # --logo-from #4CB0FF
LOGO_TO = (0x1A, 0x91, 0xF0)  # --logo-to   #1A91F0
PRIMARY = (0x11, 0x70, 0xCD)  # --primary   #1170CD
INK = (0x0B, 0x12, 0x20)
MUTED = (0x47, 0x55, 0x69)
PAPER = (0xFF, 0xFF, 0xFF)

# Supersampling factor. Everything is drawn large and downscaled with LANCZOS,
# which is what keeps the rounded corners and thin strokes from looking ragged
# at 180px - PIL has no antialiased drawing primitives.
SS = 4


def _linear_gradient(size: tuple[int, int], a, b) -> Image.Image:
    """A 135-degree gradient, matching the CSS `linear-gradient(135deg, ...)`."""
    w, h = size
    grad = Image.new("RGB", size)
    px = grad.load()
    for y in range(h):
        for x in range(w):
            # Diagonal progress, 0 at top-left to 1 at bottom-right.
            t = (x / max(w - 1, 1) + y / max(h - 1, 1)) / 2
            px[x, y] = (
                round(a[0] + (b[0] - a[0]) * t),
                round(a[1] + (b[1] - a[1]) * t),
                round(a[2] + (b[2] - a[2]) * t),
            )
    return grad


def _speech_bubble(draw: ImageDraw.ImageDraw, box, stroke: int, colour) -> None:
    """The lucide `message-square-text` glyph: bubble, tail, three text lines.

    Drawn with primitives rather than by parsing the SVG path, but from the same
    proportions (a 24x24 viewBox, bubble from 2,3 to 22,19, tail to 3.2,22.2,
    lines at y=7/11/15 with widths 8/10/6).
    """
    x0, y0, x1, y1 = box
    unit = (x1 - x0) / 24.0

    def p(ux: float, uy: float) -> tuple[float, float]:
        return (x0 + ux * unit, y0 + uy * unit)

    radius = 2.4 * unit

    # Bubble body.
    draw.rounded_rectangle(
        [p(2, 3), p(22, 19)], radius=radius, outline=colour, width=stroke
    )

    # Tail: a wedge hanging off the lower-left, drawn filled in the background
    # colour first so the bubble's bottom edge is cut away behind it, then
    # outlined - the same silhouette the single SVG path produces.
    tail = [p(5.4, 17.2), p(9.2, 19.0), p(3.2, 22.4)]
    draw.polygon(tail, fill=colour)

    # Text lines inside the bubble.
    for uy, uw in ((7, 8), (11, 10), (15, 6)):
        draw.line([p(7, uy), p(7 + uw, uy)], fill=colour, width=stroke)


def make_icon(size: int) -> Image.Image:
    """The gradient tile with the glyph, at `size` px."""
    s = size * SS
    tile = _linear_gradient((s, s), LOGO_FROM, LOGO_TO).convert("RGBA")

    # Rounded-corner mask. `rounded_xl` in the app is ~22% of the tile.
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=255
    )
    tile.putalpha(mask)

    # Glyph inset to 60% of the tile, matching LogoMark's `size-[60%]`.
    inner = s * 0.60
    off = (s - inner) / 2
    draw = ImageDraw.Draw(tile)
    _speech_bubble(
        draw,
        (off, off, off + inner, off + inner),
        stroke=max(1, int(inner * 0.085)),
        colour=PAPER,
    )
    return tile.resize((size, size), Image.LANCZOS)


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """A real TrueType face, falling back through the usual suspects.

    The bitmap default font would render the share card at about 11px, which is
    illegible at 1200x630 - so this tries hard before giving up.
    """
    candidates = (
        ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"]
        if bold
        else ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf", "Arial.ttf"]
    )
    roots = [
        "C:/Windows/Fonts",
        "/usr/share/fonts/truetype/dejavu",
        "/Library/Fonts",
        "/System/Library/Fonts",
        "",
    ]
    for name in candidates:
        for root in roots:
            try:
                return ImageFont.truetype(os.path.join(root, name) if root else name, size)
            except OSError:
                continue
    raise SystemExit(
        "No TrueType font found. The share card needs one; install DejaVu or "
        "run this on a machine with system fonts."
    )


def make_og() -> Image.Image:
    """The 1200x630 share card.

    `twitter.card` was already set to `summary_large_image` with no image file
    anywhere in the repo, so every shared link rendered a blank card - the one
    surface a link is judged on before anyone reads a word of it.
    """
    w, h = 1200, 630
    card = Image.new("RGB", (w, h), PAPER)
    draw = ImageDraw.Draw(card)

    # Brand edge along the top.
    card.paste(_linear_gradient((w, 10), LOGO_FROM, LOGO_TO), (0, 0))

    # The mark.
    tile = 132
    card.paste(make_icon(tile), (96, 132), make_icon(tile))

    draw.text((96, 310), "resumewriter.ai", font=_font(76, bold=True), fill=INK)
    draw.text(
        (96, 408),
        "Build, tailor and export resumes with AI assistance",
        font=_font(34),
        fill=MUTED,
    )
    draw.text(
        (96, 486),
        "Resumes  -  Cover letters  -  Job matching  -  Interview prep",
        font=_font(27, bold=True),
        fill=PRIMARY,
    )
    return card


def main() -> None:
    targets = [
        ("src/app/icon.png", make_icon(512)),
        ("src/app/apple-icon.png", make_icon(180)),
        ("public/brand/icon-192.png", make_icon(192)),
        ("public/brand/icon-512.png", make_icon(512)),
        ("src/app/opengraph-image.png", make_og()),
    ]
    for path, image in targets:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        image.save(path, optimize=True)
        print("wrote %-34s %s" % (path, "x".join(str(n) for n in image.size)))


if __name__ == "__main__":
    main()
