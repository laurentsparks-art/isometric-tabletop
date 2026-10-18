# Isometric Tabletop 0.1.0 — official-release validation

**Published v0.1.0 with owner authorization on 2026-10-18.** [Catalogue PR #405](https://github.com/Lebbitheplow/open-dungeon-master/pull/405) is open; no catalogue merge or listing is claimed. The release tag and installable package remain pinned to reviewed commit `f84cb14ff27cee0e95a42dcb3a18822daf21d249`.

Target: unmodified official ODM v0.28.1, commit `bc96434fe1f550fd0c6b374f2376968dc8bddcc9`. PR #399 is merged and included. No local host patches were applied; the release checkout remains clean. Addon ID/version/API: `isometric-tabletop` / `0.1.0` / `1`; minimum server `0.28.1`, Windows-only manifest, permissions `[]`.

| Release gate | Status | Evidence |
|---|---|---|
| Official framework support | PASS | PCK/WAV MIME allowlist, optional skin/material/genre/audio fields and checker-owned SQLite close are shipped in the tag; API v1 unchanged |
| Approved source/runtime freeze | PASS | 662 mandatory resource hashes and all approved UI/runtime bytes preserved; no artwork generation/repacking or renderer changes |
| ZIP installation/lifecycle | PASS | Real admin-authenticated ZIP upload, enable, ready, MCP probe, disable, absent contribution/default Board, uninstall preserves campaign/map, reinstall |
| Cold authenticated browser | PASS | Fresh Chrome profiles, normal DM/player logins; 27 skins x four rotations x normal/close zoom, reload/reconnect, Board switching; 222 actual runtime screenshots, no uncaught JS/failed addon requests in completed serial run |
| Gameplay/permissions | PASS | Two independent player sessions plus DM, multi-character switch/ownership rejection, four-angle picking, legal/rejected movement, strict SSE positions, action-ring anchors, hidden token/secret-door projection |
| Audio/accessibility | PASS | Real swish follows global mute; second-player reduced-motion rotation and independent orientation |
| Shared drawing/combat | PASS | Persisted stroke via normal draw endpoint reaches both snapshots and both views; real encounter start/end, map replacement, actual pc_attack on initiative with FX, magical-hazard save/damage feedback |
| Rotation reproduction | PASS | 32 clockwise/counterclockwise turns, 231–279 ms click-to-settle, no browser errors or authoritative map changes; historical intermittent timeout did not reproduce and is NOT claimed fixed |
| Addon/Godot suites | PASS | 11 Node tests; 514 art, 4075 ground, 731 rotation, 97 tabletop engine assertions |
| Clean source rebuild | PASS | Separate Git archive, fresh npm ci, cold Godot 4.7.2 import/non-threaded Web export, ten original source-preservation tests; approved shipped export retained |
| Official host build | PASS | Fresh npm ci, production build including TypeScript; scoped framework ESLint; 311 production traces exclude private QA/env/artifacts |
| Full official repository suite | PASS | 668/668 test files, 5 Vitest tests, exit 0; `npm test -- --fileParallelism --maxWorkers=2`, 675.73 seconds, no browser capture workload; includes 34 addon-core and 20 addon-runtime checks |
| Package/privacy/licensing | PASS | Installable 31 files, no host install/build/download step; MIT/CC0/Godot/OFL notices retained, zero addon npm advisories; five inherited high advisories in the official host lock were recorded without unrelated upgrades; tracked-content/case/path audit and reachable text-history secret-pattern scan pass |
| Desktop/Linux/macOS/mobile | NOT TESTED | No support claim; Windows-only initial scope retained |
| Public GitHub installation | PASS | Actual pinned public folder installed in a fresh synthetic world on official 0.28.1; all 31 file hashes match; Wasm/PCK/WAV 200 and typed; all eleven gameplay checks pass |
| Repository/release publication | PASS | Public repository and v0.1.0 release created after explicit owner authorization; downloaded release ZIP size/hash match the frozen approved package |

## Package and public content

`addon/` holds 31 files, 49,554,623 bytes. Largest file: Wasm 39,514,754 bytes; PCK 9,511,872 bytes, within GitHub and framework limits. ZIP: 19,501,877 bytes.

SHA-256: `3347e6043de3e4c7cbb3456f3d82b215c1294566332c23806f0b9bee966c0e81`.

The ZIP and SHA256SUMS are ignored under artifacts/. Editable Godot/art/source/build tools remain outside addon/. Four intentionally published documentation PNGs are existing real runtime captures, with provenance recorded in docs/images/README.md. Full captures, credentials and the synthetic world remain outside the source repository. No new dependencies, native addon executables, permissions, analytics, telemetry or remote services.

## Failures retained, not hidden

The first full-suite attempt exited with a V8 allocation/out-of-memory failure while browser capture was concurrent; Windows had about 0.8 GB free physical memory. The first capture completed 24 skins then timed out taking a screenshot. Both reports were retained. The subsequent browser-only run completed all 27 skins and all checks. This is evidence to serialize expensive release tasks on this machine, not proof of a repaired renderer defect. The complete bounded-worker rerun passed all 668 files; the original interrupted run is not counted as a pass.

## Known limitations

Measure on **Board**: the host's temporary ruler/template overlay is not in API-v1 snapshots. Persistent shared lines remain supported. Advanced aiming/intent arrows, private picture/portrait replies and detailed light glyphs also use Board. Complete player spell-turn and advanced combat-animation parity are NOT TESTED; the magical-hazard case is not a complete player spell turn.

A historical intermittent rotation/initialization timeout remains unisolated. The focused new run passed; if a view stalls, switch to Board or reload. No renderer refactor or speculative fix was made. Godot's caught service-worker warning in the opaque frame remains nonfatal. Cold exports can differ in generated resource IDs/pack ordering; byte-for-byte reproducible PCKs are not claimed.

## Next actions

Public repository and release: https://github.com/laurentsparks-art/isometric-tabletop and https://github.com/laurentsparks-art/isometric-tabletop/releases/tag/v0.1.0. Catalogue review remains separate. Windows-only scope is retained. Catalogue CI source/hash checks passed, then its checker crashed before the addon probe due to unbuilt native SQLite after ignore-scripts installation. The built-in-driver checker passes on Windows; platform-appropriate CI is also needed. PR405 documents both audit-environment issues; unrelated workflow/driver changes were not mixed into the catalogue entry. No catalogue merge is authorized.
