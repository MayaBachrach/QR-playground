# PROJECT_STATE — qArt

## Current version
Minimal Hebrew 1955-style terminal UI. Palette locked to #000000 and #FF0088. Published to the main branch of MayaBachrach/QR-playground.

## Approved decisions
- Do not change the existing QR generation/decoding engine or region-search algorithm unless necessary for correctness.
- Preserve rectangular QR pixels and terminal-inspired typography/frames.
- Only two creative editing workflows: keyboard arrow/Space per-cell toggling, and search/select/erase large verified rectangles.
- Basic necessities: text/URL input, reset, PNG/SVG export, status feedback.
- No color, corner, shape, mask, or error-level selectors. No low-resolution canvas overlay.
- Hebrew visible controls. Mobile directional pad.

## Known limitations / checks
- Contrast of black-on-marker-pink QR varies by scanner; physical phone-camera validation is recommended.
- Region search is bounded and returns at most three candidates.
- Existing engine tests should be run after changes; visual/keyboard mobile checks are still useful.

## Repository
https://github.com/MayaBachrach/QR-playground
