# PROJECT_STATE — qArt

## Current version
Hebrew VHS/VCR OSD editor, black #000000 and marker pink #FF0088.
Based on main dbc6226c666e8f23436af7110ae1c3d1a420c119; updated 2026-11-16.

## Authoritative design and interaction decisions
- Latest user direction is a restrained VHS/VCR menu, superseding older "1955 terminal" wording.
- Hebrew pixel headings, large readable local instructions, inverted active row and selection arrow.
- Static 0.25px text softening only; QR modules and exports remain crisp. No flicker, popups, gradients or new colors.
- Tab: URL → QR → remembered command → normal browser navigation. Shift+Tab reverses it.
- URL: standard paste and Enter; Esc restores committed text and returns to the QR.
- QR: arrows move; Space toggles; Tab/M opens the menu; Esc returns to URL.
- Menu: arrows navigate, Enter/Space activate; Esc/M returns to the same QR cursor.
- F searches, 1–3 previews/selects and focuses the QR, Del erases only a selected region; R resets, P/S export.
- Coarse pointers also get a directional pad; URL generation has a click/touch submit control.
- Disabled actions remain discoverable with aria-disabled and explanatory feedback.
- No global single-letter shortcuts interfere with input or browser modifier shortcuts.

## Implementation
- Existing QR engine, decoder and region algorithm are unchanged.
- Cursor movement changes only two marker attributes and the readout, preserving SVG/module nodes.
- Worker runs the existing bounded region search and decoder with the same 8px/module black/pink raster.
- Worker failures/timeout retain the existing QR, regions and selection. UI stays navigable.
- Individual edits and deletion still validate rendered SVG through the original decoder before acceptance.
- Failed edits/deletions restore cell data; unavailable deletion is guarded in the operation itself.
- Exports are produced from marker-free SVG; PNG and SVG contain no display filter.

## Validation
Three implementation/review rounds: focus/rendering, asynchronous search/recovery, narrow/short layout and preview orientation.
- Syntax checks, test.cjs (including actual PNG/SVG downloads), test-regions.cjs passed.
- test-browser.cjs passed in isolated headless Chromium: real Clipboard API/Ctrl+V, input/Enter, Tab/Shift+Tab, arrows/Space, reserved protection, decoder rollback, search/select/delete/reset, exports, worker-load failure/retry, empty/oversized input recovery.
- Automated layout and screenshots: 1280×900, 390×700, 320×568, 1024×500, 640×450 (200%-equivalent CSS viewport). No horizontal overflow; selected QR brought into view.
- Screenshots visually inspected; this is not a human usability study.
- Original reference images were not retrievable; styling follows the user's detailed VHS description and existing live design.
- Physical phone-camera scanning, non-Chromium browsers and native browser zoom remain unverified.

## Run checks
npm test
node test-regions.cjs
node --check app.js
node --check search-worker.js
For browser regressions, install Playwright as a test tool, serve this directory locally, then:
QART_URL=http://127.0.0.1:8766 node test-browser.cjs
Browser output goes to test-output (ignored); test.cjs can also receive exported PNG/SVG paths.

## Repository
https://github.com/MayaBachrach/QR-playground
