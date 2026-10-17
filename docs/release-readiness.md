# Isometric Tabletop 0.1.0 — release-candidate checklist

**Verdict: local candidate prepared; public release BLOCKED on official host support and owner-authorized publication.** The human visual/gameplay baseline is accepted. No production artwork or renderer changes were made in this pass.

| Gate | Status | Evidence / remaining action |
|---|---|---|
| Approved graphics/runtime freeze | PASS | 662 original resource hashes and all approved UI/runtime bytes preserved; no production art repack/generation |
| Latest official host | PASS | Fresh main `1b4d97d3fe619f3b1024c096337f49cf54d29698`, ODM 0.28.0; separate clean worktree |
| Unmodified ODM compatibility | BLOCKED | Actual install/enable succeeds, Wasm 200 but PCK 404. Skin/audio metadata absent. Do not claim compatibility before host fixes ship |
| Required host patches | BLOCKED | Local `11c78086`, `fa5e5d87`, `7edcdc8a` tested, not published/accepted. Seven files, 73 insertions/5 deletions. Old lifecycle/schema fixes are already upstream |
| Supported package installation | PASS | Admin ZIP install/enable/ready/MCP, disable/uninstall/default Board, reinstalled. Official file-by-file fetch of committed addon/ with local Git reader verifies every blob and matches ZIP bytes |
| Public GitHub/catalogue install | BLOCKED | No public repository yet. Real URL, audited public commit/hash and catalogue PR must be generated after approval |
| Repository/security audit | PASS | No credentials/world/cache/logs in tracked package; no permissions, telemetry or runtime downloads; case-sensitive UI references checked |
| Dependencies/licences | PASS | Runtime dependency-free; addon npm audit zero vulnerabilities. MIT/CC0/Godot/OFL notices retained. Host lock has five inherited high advisories; no unrelated upgrades |
| Production build/private tracing | PASS | Fresh dependencies/build; 305 traces exclude private state. QA world outside host source. Populated-checkout tracing concern remains documented |
| Full host test suite | PASS | 636/636 test files in one clean-environment run, including 34 addon-core and 20 runtime checks. Scoped lint passed; TypeScript passed in production build |
| Godot/addon tests | PASS | 514 art, 4075 ground, 731 rotation, 97 tabletop assertions; 10 adapter/resource tests |
| Clean addon rebuild | PASS | Git archive, npm ci, cold import/Web export/tests; rebuilt ZIP installed and expanded gameplay passed. 156/158 pack payload hashes identical; remaining two are UID cache and generated scene IDs. Scene properties compare equal |
| Browser/visual sweep | PASS | Actual installed Chrome: 27 skins x four angles x normal/close zoom, opaque sandbox, Wasm/PCK 200, reload/2D switch; runtime PNGs inspected |
| Gameplay/shared state | PASS | DM/two-player logins, multi-character permissions, legal/rejected movement, strict SSE, anchors/action ring, audio/reduced motion, fog/secrets/hidden tokens, map replacement, shared drawing, encounter start/end, basic attack on actual initiative with combat FX |
| Full player spell/advanced parity | NOT TESTED | Magical-hazard save/damage presentation tested; complete player spell turns/advanced targeting not claimed. Use Board for advanced tools |
| Intermittent input timeout resolved | BLOCKED | One rebuilt run timed out at 270-to-0 rotation with a populated scene. Instrumented rerun and final foreground/fresh-event run passed; root cause not isolated. Retain failure evidence and investigate if reproducible |
| Linux/macOS execution | NOT TESTED | No Linux subsystem/macOS runner. Static path/case checks pass; initial manifest conservatively declares Windows only |
| Desktop/mobile | NOT TESTED | PR63 merged; client main `47c123642d23930dd9d0c6a542d58c7336af0dc1` inspected. No runnable matching client. No mobile support claimed |
| Public metadata/showcase | PASS | README, changelog, contributing, notices, release notes/catalogue instructions and four selected actual runtime PNGs prepared |
| Remote publication | BLOCKED | Await explicit owner approval. No addon remote, push, release, framework PR or catalogue PR |

## Package

Installable `addon/`: 31 files, 49,554,664 bytes unpacked; ZIP about 19.5 MB. Largest file: 39,514,754-byte Wasm, below GitHub 100 MB/framework 64 MiB caps. Editable Godot/art/tooling stay outside the installable folder. Four documentation images are intentional public assets; full raw captures, credentials and QA worlds remain ignored. No LFS, install builds or startup downloads.

Fresh Godot imports can generate different resource/node IDs and pack ordering. The clean build is functionally reproducible and its actual gameplay was tested; bit-for-bit identical PCK files are not claimed. The approved prebuilt export was retained. `runtime.json.version` is checksum schema version 1, not the addon release number.

## Measurement and remaining limits

Temporary ruler/template readouts are host-local and absent from API-v1 snapshots; logical coordinate picking is correct. Switch to **Board** to measure. Persistent lines drawn on Board arrive as stored marks and remain synchronized in Isometric. Advanced intent/aim/ruler previews, private pictures and detailed light glyphs also use Board. Godot's caught service-worker warning is nonfatal. Button orientation is iframe-local; the host persists the starting option per device.

## Remaining release actions

1. Share the generic framework proposal after approval, obtain an official release containing required support and set that actual minimum version.
2. Reproduce/resolve the retained intermittent input timeout or explicitly accept it as a preview limitation before wider distribution.
3. Review showcase/platform scope; execute Linux/macOS/desktop before expanding claims and complete player-spell smoke if required for release scope.
4. Owner chooses/approves a real public repository, authorizes push, and separately approves any release/tag.
5. Generate the maps entry with official addon-catalog tooling from the real URL/commit/addon folder; verify and submit only after approval. No fabricated URL/hash.

Launch the normal host with the isolated QA environment, DEV_DIRS empty, port 3014. Sign in normally, open the QA campaign, then Map > View > Isometric. Credentials stay outside this repository. Local detailed evidence is under ignored artifacts/release*, not installed with the addon.
