# Catalogue submission � prepared, not submitted

Rules verified against official main `df3fec70d030e6cbff2810652ff28284a9819e43` and the installed v0.28.1 catalogue tool: docs/addons/guidelines.md. Category **maps**. ID `isometric-tabletop`, version0.1.0, API1, permissions[], Node runtime, one Isometric board view with needsViewData:false. Windows is the currently executed/declared platform. Source MIT, original artwork CC0 where rights held; bundled Godot and OFL notices included.

## Gates before remote actions

- Owner approves publication and chooses/creates a real public GitHub repository.
- Required generic host support shipped in ODM 0.28.1 (PR #399); minServerVersion is 0.28.1.
- Public repository contains editable Godot source, source artwork/provenance, pinned build tools and the tested prebuilt `addon/` folder. No QA world, credentials, caches or private reports.
- Re-run runtime hashes, installer/browser checks and release audit at the exact intended commit. The installable folder must remain build-free on the ODM host.

Proposed owner/name: `laurentsparks-art/isometric-tabletop` (not an existing verified repository). No real repository URL, remote tag, audited public commit or catalogue content hash is available yet. None is fabricated here. Local source commits are recovery checkpoints, not published catalogue pins.

## Commands AFTER explicit approval

From the addon repository, use the actual repository URL supplied by the owner; creating a remote/push is not part of this task:

```powershell
$repoUrl = Read-Host 'Actual public GitHub repository URL'
git remote add origin $repoUrl
git push -u origin codex/isometric-addon
$commit = git rev-parse HEAD
```

From a clean official ODM 0.28.1-or-newer checkout:

```powershell
node scripts/check-addon.mjs D:\path\to\isometric-tabletop\addon --run
# Use the real public URL and commit above; install only the addon folder.
node scripts/addon-catalog.mjs add "$repoUrl/tree/$commit/addon" --category maps
node scripts/addon-catalog.mjs check
node scripts/addon-catalog.mjs verify --changed upstream/main
```

The official tool fetches the real public commit, verifies each Git blob and derives contentSha256 and metadata. Review its generated diff; do not hand-edit hashes. A later authorized PR changes only addons/catalog.json and describes the addon, test steps and rights. Catalogue CI derives/checks/starts it again. Every later audited commit needs a version bump.

GitHub file limits: largest file is about39.5MB Wasm, below100MB; no Git LFS pointers. The small addon folder is fetched file-by-file, with no dependency installation or startup downloads. Source elsewhere in the repository costs no addon installation bandwidth.

Submission text: Isometric Tabletop draws existing authorized ODM tactical maps using a rotatable Godot pixel-art board. It requests no permissions, runs a dependency-free Node MCP lifecycle, bundles its single-thread Web export and delegates every game action to ODM. Board remains available for measuring/advanced tools. See release notes and actual runtime showcase.
