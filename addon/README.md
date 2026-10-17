# Isometric Tabletop 0.1.0

Optional Godot board renderer for Open Dungeon Master. ODM owns authentication, visibility, rules, movement and multiplayer state. This addon only draws authorized snapshots and returns pointer interactions.

Release candidate: requires ODM 0.28.0 **plus the documented generic host patches**. It does not currently run on unmodified 0.28.0. No public repository or catalogue entry exists yet.

Install this folder through Admin > Addons, enable it, then open a campaign map and choose View > Isometric. No setup, Godot install, package install or separate service is needed. No permissions or downloads are requested.

Q/E or arrow buttons rotate. Wheel zooms; middle/right drag pans; 0 fits. Options set initial orientation and names. Global ODM audio preferences control the rotation swish.

Use Board for measurement/ruler previews, advanced targeting and private map pictures. Persistent shared drawings are supported. Switching views preserves campaign state.

Verified: Windows server and headed Chrome/WebGL 2. Linux, macOS, desktop client and mobile have not been verified; this initial candidate declares Windows only. Expand platforms after testing.

Code MIT; original art/swish CC0 where rights are held. Godot and font notices are in ui/. THIRD_PARTY.md identifies dependencies. Editable Godot source, tools and full documentation are in the repository parent of this installable folder.

If blank: return to Board, check required host patch level, browser WebGL 2 and the network request for index.pck. Never weaken the iframe sandbox or force SwiftShader.
