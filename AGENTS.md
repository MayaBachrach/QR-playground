# AGENTS.md — qArt project instructions

Read PROJECT_STATE.md before making changes. The source of truth is this GitHub repository.

Keep UI Hebrew, terminal-inspired, clearly readable, and strictly two-color: black #000000 and marker pink #FF0088. No gradients, drop shadows, extra colors, translucency, rounded modern cards or simulated blurry text.

Keep only individual QR square editing via arrow keys + Space (and mobile pad) and large verified region deletion. Do not add unrelated features or controls. Preserve the QR decoder validation, data input and PNG/SVG export. Never allow edits to reserved QR modules. Do not modify unrelated files or existing approved visual decisions.

After changes, check syntax, QR-engine tests, region-search tests, responsive layout, keyboard behavior, and report what was and was not verified.
