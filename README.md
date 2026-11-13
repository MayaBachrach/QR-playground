# qArt — מסוף לעריכת QR

A keyboard-first QR editor designed as a fictional 1955 computer terminal.

## Appearance
- Only **black `#000000`** and **marker pink `#FF0088`**, throughout the interface and exported QR.
- Hebrew, right-to-left interface; large readable text and square terminal controls.
- No gradients, shadows, simulated low-resolution text, extra color/shape settings, or other styling options.

## Editing
1. Enter a URL or text; a QR code is generated with high error correction.
2. Move the selection with the arrow keys, and press **Space** to toggle a square. On mobile, use the arrow pad and the center edit button.
3. Use **חפש אזורים למחיקה** to search for large rectangles that can be erased. Select a proposed region to preview it, then press **מחק אזור נבחר**.
4. **איפוס שינויים** recreates the code from the text.
5. Export PNG or SVG without the cursor/region preview.

Protected QR squares cannot be changed. Edits and erased rectangles are checked with the built-in decoder, and rejected when validation fails. The bounded region search returns up to 3 verified candidates, not an exhaustive guarantee of the largest possible region.

**Note:** Black-on-pink QR codes may scan less reliably on some phone cameras than conventional black-on-white QR codes. Test exported codes with the intended device.

## Running
Static site: serve this directory with `python -m http.server 8765`, or use GitHub Pages. The QR engine is bundled locally; no remote script dependencies are needed.

The retired `lowres.js` file is intentionally not loaded. It previously impaired text readability.

Run `npm test` and `node test-regions.cjs` for the existing engine and region-search tests.
