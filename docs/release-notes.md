# Isometric Tabletop v0.1.0

An optional Godot-powered board view for Open Dungeon Master. ODM remains authoritative for authentication, D&D rules, movement, permissions and multiplayer state.

- 27 approved pixel-art environments, miniature-style standees and upright names.
- Four-way animated rotation, north arrow, pan/zoom, reduced motion and global-audio-aware swish.
- Player-safe fog, token selection, movement interaction and multiplayer synchronization.
- Shared persistent drawings and map markings.
- Switch between Isometric and ODM's original Board without changing campaign state.

## Install

Requires **official ODM v0.28.1 or newer**. The verified first-release scope is a **Windows host with Chrome/WebGL 2**.

In **Admin → Addons**, enable file/link installation and install the pinned addon folder:

https://github.com/laurentsparks-art/isometric-tabletop/tree/f84cb14ff27cee0e95a42dcb3a18822daf21d249/addon

Alternatively, upload the attached `isometric-tabletop-0.1.0.zip`. Enable **Isometric Tabletop**, open a campaign map, then choose **View → Isometric**. No Godot installation, npm setup, separate service, permission grant or startup download is required. The [official catalogue submission, ODM #405](https://github.com/Lebbitheplow/open-dungeon-master/pull/405), is pending review; catalogue inclusion is not claimed.

## Known limitations

- Use **Board** for measuring, advanced targeting and private map pictures. Complete advanced spell/combat-animation parity is not claimed.
- Desktop client, Linux, macOS and mobile have not been validated; the manifest deliberately declares Windows only.
- A historical intermittent rotation/initialization timeout has not been conclusively resolved. A new 32-turn stress run passed; switch to Board or reload if a view stalls.

## Verification and rights

Tested against unmodified official ODM v0.28.1: 668/668 host test files, production build/TypeScript, 11 addon tests, 5,417 Godot assertions, actual ZIP installation, authenticated DM/two-player gameplay, fog/permissions/SSE, shared drawings and all 27 skins at four angles and normal/close zoom. Fresh source import/export also passed. The initial concurrent capture/test attempt exhausted system memory; isolated reruns passed. These checks do not claim additional platform or advanced spell support.

Code is MIT; original artwork/audio is CC0-1.0 to the extent rights are held. Godot and third-party notices and OFL font licences are bundled. Editable source, original assets and pinned developer tools are public in this repository. No telemetry or external account service.

ZIP size: **19,501,877 bytes**. SHA-256:

`3347e6043de3e4c7cbb3456f3d82b215c1294566332c23806f0b9bee966c0e81`

![Actual Isometric Tabletop running inside ODM](https://raw.githubusercontent.com/laurentsparks-art/isometric-tabletop/f84cb14ff27cee0e95a42dcb3a18822daf21d249/docs/images/primary.png)

[Environments](https://github.com/laurentsparks-art/isometric-tabletop/blob/f84cb14ff27cee0e95a42dcb3a18822daf21d249/docs/images/environments.png) · [Four rotations](https://github.com/laurentsparks-art/isometric-tabletop/blob/f84cb14ff27cee0e95a42dcb3a18822daf21d249/docs/images/rotation.png) · [Active gameplay](https://github.com/laurentsparks-art/isometric-tabletop/blob/f84cb14ff27cee0e95a42dcb3a18822daf21d249/docs/images/gameplay.png)
