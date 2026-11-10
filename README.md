# qArt

An experimental, low-resolution QR matrix editor inspired by early computing instruments.

The interface and generated QR use only **black (`#000000`) and marker green (`#39ff14`)**. The QR has fixed square modules and standard square finders. There are no color, dot-shape, or corner selectors, and no logo uploads.

## Editing without a mouse

On a computer, use the **arrow keys** to move the matrix cursor and **Enter**
or **Space** to flip the selected QR square. Locked QR structure squares cannot
be changed. Use **Tab** and **Enter** to reach other controls.

On phones, the large **direction pad** and **EDIT** button work the same way.
Use the DRAW / SETTINGS tabs to switch panels. QR squares are not individually
clickable, so editing is possible even on a small screen.

The screen uses a deliberately small two-color framebuffer. Text is enlarged,
not smoothed. The QR exported as PNG or SVG is clean and contains no cursor.

## Features

- Generate standard QR symbols for a URL or text and switch among eight mask patterns without changing the content.
- Choose an error-correction level. Changing the mask or correction level resets manual pixel edits.
- Edit individual non-reserved modules. Each change is decoded before it is accepted; unsuccessful edits are rolled back.
- Search for separately validated regions that can be erased and preview before committing the deletion.
- Sample individually editable modules for visual guides (test again after every change).
- Decode the actual black/green SVG locally, export standard PNG or SVG, and use a full-screen low-resolution interface with nearest-neighbor enlargement.
- Desktop fits the main work and control panels on one page. Mobile uses **MATRIX** and **CONTROLS** screens rather than shrinking all buttons. No document scrolling.

## Run

Serve as static files, for example `python -m http.server 8765`.
GitHub Pages serves the committed site directly.

The QR engine (`qr-engine.js`) is bundled locally and no external CDN is needed. To rebuild it: `npm ci && npm run build`.

Run `npm test` for square-module QR decoding tests across different contents, error-correction levels, and masks. Run `node test-regions.cjs` for region-search invariants.

## Readability and scanning

The visible interface is captured into a reduced canvas and enlarged with nearest-neighbor scaling, without changing exported SVG/PNG data. Browser fallback shows the normal interactive DOM if low-resolution screen capture is unavailable.

Bright green on black can look different from black on green in a scanner, so the QR itself uses **black squares on the green background** with a four-module quiet zone. A passing browser decoder does not guarantee that all phone cameras or print conditions will scan the QR. Test with a real camera at the intended size.