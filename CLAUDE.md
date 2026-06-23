# CLAUDE.md

## Design System

Always read `DESIGN.md` before making visual or UI decisions.

All font choices, colors, spacing, component hierarchy, motion, and fit-ready try-on rules are defined there. Do not deviate without explicit user approval.

For fit-ready or try-on UI:

- Keep 3D/passport details secondary and collapsed until needed.
- Hide facial landmarks by default.
- Use customer language, not implementation language.
- Check `/tryon` at 320px and 390px before merging visual changes.

In QA mode, flag any code that does not match `DESIGN.md`.
