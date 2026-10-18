# Publication steps (owner approval required)

Proposed owner/name: laurentsparks-art/isometric-tabletop. This is a proposal, not an existing verified repository. No remote has been created or modified by this release-preparation task.

1. Review this local commit, public file audit, ZIP checksum, screenshots and known limitations. Authorize repository creation/push explicitly.
2. Create the public repository under the verified owner. Set its default branch deliberately; publish the reviewed source and addon/ together. Do not publish QA artifacts, credentials or worlds. Add the real remote URL only after creation.
3. Confirm the remote contains the exact reviewed commit and source/asset notices. Re-run the official checker against the downloaded addon/ folder and compare its content with the verified local ZIP.
4. After separate release approval, tag the reviewed commit v0.1.0 and upload artifacts/isometric-tabletop-0.1.0.zip plus its SHA256SUMS file. Use docs/release-notes.md and the existing actual runtime showcase; do not claim catalogue acceptance before review.
5. In a current official ODM checkout, use the verified public URL and exact commit:

```powershell
$repoUrl = Read-Host 'Verified public repository URL'
$commit = Read-Host 'Exact reviewed public commit'
node scripts/addon-catalog.mjs add "$repoUrl/tree/$commit/addon" --category maps
node scripts/addon-catalog.mjs check
node scripts/addon-catalog.mjs verify --changed upstream/main
```

6. Review only the generated addons/catalog.json change. With explicit submission approval, open the catalogue PR using docs/catalogue-pr-draft.md, replacing its placeholders with real evidence. Never fabricate a public pin or content hash.

No publication, remote tag, GitHub release or catalogue submission has been performed.
