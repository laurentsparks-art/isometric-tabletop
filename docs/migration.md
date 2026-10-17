# Extraction / migration matrix

| Reference implementation | Addon destination | Host responsibility |
|---|---|---|
| Godot scenes, TileSets, GDScript, approved sprites | `godot/` (same pixel bytes and geometry) | None |
| Terrain/skin/material bindings and packer | `config/skins.ts`, `scripts/`, metadata | Public map skin context only |
| Same-origin React/Godot protocol | Retired; `ui/adapter.mjs` + `ui/board.mjs` map official API v1 to in-frame JSON | `AddonBoardView`, version/source validation |
| Legacy IsometricMap React component | Retired; name labels/rotation controls live in addon HTML | Official View switch, HUD, action ring |
| Custom movement callbacks/API requests | Removed from iframe | Existing tile/token handlers and rules |
| Custom campaign/SSE plumbing | Not extracted | Existing player projections and campaign SSE |
| Audio preferences read from localStorage | Addon consumes optional public appearance audio | Host reads own global preferences |
| Local QA routes, auto-login demo launcher | Not copied | Normal login and independent synthetic QA world |
| Personal skill, Zen Garden project, caches | Excluded | None |
| Wasm/resource delivery | Prebuilt `ui/` + reproducible Godot export | Generic `.pck`/`.wav` MIME support |

The editable renderer/art/build tools are independently maintained. Future framework changes should touch only the small JavaScript adapter and optional host presentation fields, not the Godot terrain, game rules or approved artwork. There is no invented addon API and no direct database access in the installed runtime.
