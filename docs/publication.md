# Publication record

Owner authorized repository creation, source push, v0.1.0 release and official catalogue PR submission on 2026-10-18. No catalogue merge is authorized.

- Public repository: https://github.com/laurentsparks-art/isometric-tabletop
- Released/audited source: `f84cb14ff27cee0e95a42dcb3a18822daf21d249`
- Release: https://github.com/laurentsparks-art/isometric-tabletop/releases/tag/v0.1.0
- Install folder: https://github.com/laurentsparks-art/isometric-tabletop/tree/f84cb14ff27cee0e95a42dcb3a18822daf21d249/addon
- ZIP: https://github.com/laurentsparks-art/isometric-tabletop/releases/download/v0.1.0/isometric-tabletop-0.1.0.zip

The public download was verified at 19,501,877 bytes and SHA-256 `3347e6043de3e4c7cbb3456f3d82b215c1294566332c23806f0b9bee966c0e81`. The approved ZIP and addon/ contents are frozen; subsequent publication-documentation commits do not alter them. The bundled package README retains its pre-publication wording; this repository README and release page provide current links.

A new synthetic world running unmodified official ODM 0.28.1 installed the real public GitHub folder, enabled it and passed MCP, rendering, Board fallback and eleven authenticated gameplay checks. All installed file hashes match the approved package. No personal campaigns or credentials were published.

## Catalogue submission

The official tool generates the entry at the pinned release commit:

```powershell
node scripts/addon-catalog.mjs add https://github.com/laurentsparks-art/isometric-tabletop/tree/f84cb14ff27cee0e95a42dcb3a18822daf21d249/addon --category maps
node scripts/addon-catalog.mjs check
node scripts/addon-catalog.mjs verify --changed upstream/main
```

Only addons/catalog.json belongs in the catalogue PR. The Windows checker passes; the current Ubuntu-only CI runtime probe cannot validate a Windows-scoped manifest. Request platform-appropriate review rather than claiming untested Linux support or changing the approved package. Catalogue acceptance remains the ODM maintainer's decision.
