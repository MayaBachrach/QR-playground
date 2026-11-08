# QR Playground

An interactive QR drawing playground. Start with a destination URL, choose one of eight valid QR mask patterns for the same content, then click modules to draw black/white sequences.

## Features
- Eight valid encodings of the exact same input, without adding tracking parameters or changing the destination.
- Direct module editing, using QR error correction. Every proposed flip is decoded against the original input; failed changes are reverted.
- Finder, separator, timing, alignment, format and version modules are locked.
- Optional highlights sample up to 48 editable modules across the current code and test each single flip. Highlights are cleared after any edit; combinations are always checked again.
- Star decorations in the three finder centers. The outer square rings and a four-module quiet zone are preserved.
- Existing dot styles, colors, correction levels, PNG and SVG exports. Exports contain the drawing without editing highlights.
- Local scan checking works without BarcodeDetector. URLs and drawings stay in the browser. There are no image/logo uploads.

## Run and build
Serve this directory with any static web server, for example `python -m http.server 8765`. GitHub Pages serves the committed files directly.

The QR engine is bundled locally; no CDN or network request is needed to generate or decode a QR after loading the site.

To rebuild: `npm ci && npm run build`. To verify rendered QR decoding: `npm test`.

## Scanning limits
The large-area search checks erasing whole rectangles, preserves protected modules, and expands successful candidates. It highlights up to three alternatives sorted by area. This bounded search does not guarantee the mathematical global maximum. Choose an alternative, then use the erase button; erasure is checked again. Any edit invalidates the results. Run `node test-regions.cjs` for search invariants.

Error correction works on codewords, not a fixed percentage of editable squares. A successful local decode does not guarantee reliable phone scanning or print performance. Test the finished design on several devices at its intended size. Styling can reduce the available correction margin. Changing the input, correction level, or mask resets the drawing.

## Dependencies
`qrcode` (MIT) and `jsqr` (Apache-2.0) are included in `qr-engine.js`; see `THIRD_PARTY_LICENSES.txt`. esbuild builds the bundle. The renderer tests use resvg and pngjs.
