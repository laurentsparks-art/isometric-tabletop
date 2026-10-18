# Catalogue submission

Public repository: https://github.com/laurentsparks-art/isometric-tabletop

Release source: `f84cb14ff27cee0e95a42dcb3a18822daf21d249`, folder `addon`, category `maps`, version `0.1.0`, API `1`, minimum ODM `0.28.1`, Windows-only scope, no permissions.

The record was generated from the real public source using official ODM tooling, not hand-written. Its derived content SHA-256 is `965f4ca0c82d11a526e369fad059863b75f06cad18bb53c70211ccb46ddf7deb`, 31 files / 49,554,623 bytes. This folder content hash is distinct from the release ZIP checksum.

Guidelines read from official main `df3fec70d030e6cbff2810652ff28284a9819e43`. Check, verify and Windows checker/runtime validation pass. See [publication.md](publication.md) for exact commands and [release-readiness.md](release-readiness.md) for actual gameplay evidence and limitations.

[Catalogue PR #405](https://github.com/Lebbitheplow/open-dungeon-master/pull/405) changes only addons/catalog.json and remains open/unmerged. Catalogue inclusion is not claimed until the maintainer approves and merges it. The catalogue CI source/hash checks passed, but its runtime step failed before probing the addon because native SQLite was unbuilt after npm ci --ignore-scripts. Selecting the supported built-in driver (ODM_SQLITE_DRIVER=node) passes the Windows checker. The Ubuntu-only job also needs platform-appropriate runtime coverage for the intentionally Windows-only manifest. These generic audit-workflow issues need maintainer attention. Keep the honest platform declaration; do not change the approved ZIP to make unsupported-platform CI appear green.
