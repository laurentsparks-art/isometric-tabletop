# Framework compatibility — shipped in ODM 0.28.1

PR [#399](https://github.com/Lebbitheplow/open-dungeon-master/pull/399) merged; official tag `v0.28.1` at `bc96434fe1f550fd0c6b374f2376968dc8bddcc9` includes PCK/WAV serving, optional player-safe skin/genre/global-audio metadata, and Windows checker SQLite cleanup. API and bridge version remain 1. Existing sandbox, path validation, size limits and permission boundaries are unchanged. **No custom host patches are required for this release.**

The final release test uses an isolated unmodified checkout of that exact tag. See [release-readiness.md](release-readiness.md) for current results.

<details><summary>Historical 0.28.0 investigation (superseded)</summary>

# Required host support � official ODM 0.28.0

Tested upstream main: `1b4d97d3fe619f3b1024c096337f49cf54d29698`. PR371 and desktop PR63 are merged. Old reference host04ab5911 remains recoverable; it is not the release base.

## Proposed merge order

1. **Essential runtime support � 11c78086:** add `.pck: application/octet-stream` and `.wav: audio/wav` to the safe static-file allowlist. Actual unmodified-host browser test: Wasm200, PCK404, Godot cannot start. Resource packs and UI audio are generic needs of future Godot/board addons. Keep existing path guards, 64MiB/512MiB limits, CORS, CSP and opaque sandbox. Tests assert typed responses, stream completion, limits, forbidden paths/extensions and unchanged isolation. Files: static-files.ts, test-addons-core.mjs, extension-points.md.
2. **Required approved presentation � fa5e5d87:** optional public skin/material bindings, campaign genre and global audio mute/volume in API-v1 snapshots. Without them exact skin selection/custom overrides and preference-aware sound are unavailable; no privileged fetch workaround is acceptable. Additive fields, older addons ignore them; no version bump or new permissions. Test player-safe binding/genre/audio forwarding and existing example compatibility. Files: board-bridge.ts, AddonBoardView.tsx, BattleMapPanel.tsx, test-addons-core.mjs, extension-points.md.
3. **Developer/catalogue gate on Windows � 7edcdc8a:** close the checker's own scratch SQLite connection before deletion. Actual unmodified checker fails EPERM after a successful MCP probe; patched checker exits0. No production lifecycle change. Files: scripts/check-addon.mjs.

Windows process-exit waiting and CRLF schema comparison have already shipped upstream; they are NOT duplicated. No old broad host modifications, Godot art, QA data or generated runtime are in these host commits. Packaging trace configuration from the old preview is not required to load the addon and is not ported as an ineffective fix.

Security: no allow-same-origin, new network permission, API access from the frame, CSP relaxation or gameplay authority changes. The small MIME allowlist extension is the security-relevant surface for review; packs remain inert bytes and the existing sandbox/file limits apply.

Remaining host build concern: populated development checkouts can leak QA paths into Next startup instrumentation traces. Use a clean distribution context and audit traces; keep QA worlds outside source. This is separate from the clean runtime addon package.

These changes are local proposals, not published or merged. The addon is NOT compatible with unmodified official0.28.0. Once upstream assigns a release containing the required support, update minServerVersion and installation wording to that real release, not an invented future version.

</details>
