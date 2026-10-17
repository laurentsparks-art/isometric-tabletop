extends SceneTree
const Art = preload("res://odm_art.gd")
var checks := 0
var failures := 0
func verify(ok: bool, text: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		push_error(text)
func _initialize() -> void:
	call_deferred("run_tests")
func run_tests() -> void:
	var art := Art.new()
	verify(art.manifest.get("skins", {}).size() == 27, "All current ODM skins bound")
	verify(art.manifest.get("tokens", {}).size() == 22, "12 classes and 10 enemies")
	var scene = load("res://tabletop.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/all-terrain.json"))
	for specification in [["cp-yard", "cp-door-cage"], ["cp-yard", "door-wood-plain"], ["cp-street", "cp-door-cage"], ["desert", "door-curtain-beaded"], ["laboratory", "door-iron-reinforced"]]:
		var selected: Dictionary = art.tileset(scene.layer.tile_set, {"id": specification[0], "bind": {"+": specification[1]}})
		for axis in ["axis-a", "axis-b"]:
			var tile: Dictionary = selected.tiles["+:" + axis]
			var expected: String = art.manifest.materials[specification[1]].variants[axis].atlas
			verify(selected.set.get_source(tile.source).texture.resource_path.ends_with(expected), "Explicit material atlas respects custom bindings " + str(specification) + axis)
	var rev := 0
	for id in art.manifest.skins:
		fixture.skin = {"id": id, "bind": art.manifest.skins[id].bind}
		rev += 1
		scene.apply_snapshot({"revision": rev, "view": fixture})
		verify(scene.terrain_cell_count() == fixture.explored.size(), "All authorized tiles for " + id)
		if id == "frozen":
			for tag in ["|", "^"]:
				var key: String = str(tag) + (":axis-a" if tag == "|" else ":default")
				var tile: Dictionary = scene.art_tiles.tiles[key]
				verify(scene.layer.tile_set.get_source(tile.source).texture.resource_path.contains("__frozen"), "Frozen-specific atlas " + tag)
		verify(scene.get_node("Stage/Background").texture != null, "Background loaded for " + id)
		for tag in [".", "#", "~", ",", "+", "|", "^"]:
			var entry := art.material(id, tag)
			verify(entry.get("tag") == tag, "Correct material semantic role " + id + tag)
			var variant: Dictionary = entry.variants.get("default", entry.variants.get("axis-a", {}))
			verify(art.texture(variant.atlas) != null, "Atlas loaded " + id + tag)
		verify(scene.layer.get_cell_source_id(scene.logical_to_cell(Vector2i(4, 3))) == -1, "No hidden terrain " + id)
	verify(Art.orientation("   #+#   ", 3, 3, Vector2i(1, 1)).axis == "axis-b", "Left/right walls project down-right: door axis-b")
	verify(Art.orientation(" #  +  # ", 3, 3, Vector2i(1, 1)).axis == "axis-a", "Above/below walls project down-left: door axis-a")
	verify(Art.orientation(" # #+# # ", 3, 3, Vector2i(1, 1)).ambiguous, "Cross-wall ambiguity")
	verify(Art.orientation("    +    ", 3, 3, Vector2i(1, 1)).ambiguous, "Unknown neighbours not used")
	verify(Art.orientation("    +    ", 3, 3, Vector2i(1, 1)).axis == "axis-a", "Stable ambiguous default")
	verify(Art.orientation("   |||   ", 3, 3, Vector2i(1, 1), "|").axis == "axis-a", "Lowwall neighbours")
	verify(Art.orientation("    |  | ", 3, 3, Vector2i(1, 1), "|").axis == "axis-b", "Lowwall endpoint follows single neighbour")
	verify(Art.orientation("   |+|   ", 3, 3, Vector2i(1, 1)).axis == "axis-b" and Art.orientation("   |+|   ", 3, 3, Vector2i(1, 1)).ambiguous == false, "Door between low walls")
	verify(Art.orientation(" #  +#   ", 3, 3, Vector2i(1, 1)).axis == "axis-a" and Art.orientation(" #  +#   ", 3, 3, Vector2i(1, 1)).ambiguous == true, "Corner is ambiguous")
	verify(Art.orientation("+# .# .# ", 3, 3, Vector2i(0, 0)).axis == "axis-a" and Art.orientation("+# .# .# ", 3, 3, Vector2i(0, 0)).ambiguous == true, "Board edge single wall")
	verify(Art.orientation(" #  +  # ", 3, 3, Vector2i(1, 1)).axis == "axis-a" and Art.orientation(" #  +  # ", 3, 3, Vector2i(1, 1)).ambiguous == false, "North south door")
	verify(art.material("bad-skin", ".", "not-shipped") == art.material("stone-dungeon", "."), "Unknown skin/material fallback")
	verify(art.material("forest-floor", ".", "wall-dungeon-mossy") == art.material("forest-floor", "."), "Wrong material role fallback")
	for id in art.manifest.tokens:
		verify(art.token_texture(id) != null, "Token image loaded " + id)
	verify(art.token_texture("class/private-data") == null, "Unknown token stays marker")
	fixture.tokens[0].archetype = "class/wizard"
	fixture.skin = {"id": "cavern", "bind": {}}
	rev += 1
	scene.apply_snapshot({"revision": rev, "view": fixture})
	verify(scene.markers[fixture.tokens[0].id].art_texture != null, "Projected archetype becomes standee")
	verify(scene.markers.enemy1.position == scene.logical_to_local(Vector2(6.5, 2.5)), "Art preserves large footprint positions")
	verify(not scene.orientation_notes.is_empty(), "Ambiguous visible doors have diagnostic notes")
	rev += 1
	scene.apply_snapshot({"revision": rev, "view": null})
	verify(scene.terrain_cell_count() == 0 and scene.markers.is_empty(), "Closure clears generated visuals")
	verify(scene.get_node("Stage/Background").texture == null, "Closure clears background")
	if failures == 0:
		print("ODM_ISOMETRIC_ART_OK: ", checks, " checks")
	quit(0 if failures == 0 else 1)
