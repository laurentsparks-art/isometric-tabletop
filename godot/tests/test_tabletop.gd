extends SceneTree

const Tags = preload("res://odm_tiles.gd")
var failures := 0
var checks := 0

func verify(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		push_error(label)

func _initialize() -> void:
	call_deferred("run_tests")

func run_tests() -> void:
	var scene = load("res://tabletop.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/all-terrain.json"))
	scene.apply_snapshot({"revision": 1, "view": fixture})
	await process_frame
	verify(scene.lookup.missing.is_empty(), "All seven author tags discovered")
	verify(scene.lookup.duplicates.is_empty(), "Author tiles have no duplicate tags")
	verify(scene.lookup.layer == "ODM TAG", "Legacy author metadata preserved")
	for tag in Tags.TAGS:
		var i: int = fixture.terrain.find(tag)
		var cell: Vector2i = scene.logical_to_cell(Vector2i(i % int(fixture.width), i / int(fixture.width)))
		var expected: Dictionary = scene.lookup.tiles[tag]
		verify(scene.surface_layer(tag).get_cell_source_id(cell) == expected.source, "Terrain source: " + tag)
		verify(scene.surface_layer(tag).get_cell_atlas_coords(cell) == expected.atlas, "Terrain atlas: " + tag)
		verify(scene.surface_layer(tag).get_cell_alternative_tile(cell) == expected.alternative, "Terrain alternative: " + tag)
	for y in int(fixture.height):
		for x in int(fixture.width):
			var at := Vector2i(x, y)
			verify(scene.local_to_logical(scene.logical_to_local(Vector2(at))) == at, "Logical picking round trip")
	verify(scene.logical_to_local(Vector2(1, 0)) - scene.logical_to_local(Vector2.ZERO) == Vector2(64, 32), "ODM x axis projects diagonally")
	verify(scene.layer.get_cell_source_id(scene.logical_to_cell(Vector2i(4, 3))) == -1, "Unknown cell has no tile")
	verify(scene.view.reachable.has(21), "JSON reachable cells normalized to integer indexes")
	verify(scene.markers.has("ally1"), "Authorized party token outside sight survives")
	verify(scene.markers.enemy1.position == scene.logical_to_local(Vector2(6.5, 2.5)), "Large footprint anchored correctly")
	var original: TileSet = scene.layer.tile_set
	var copy: TileSet = original.duplicate(true)
	var source: TileSetAtlasSource = copy.get_source(copy.get_source_id(0))
	var at: Vector2i = source.get_tile_id(0)
	var alternative := source.create_alternative_tile(at, 9)
	source.get_tile_data(at, alternative).set_custom_data("ODM TAG", ".")
	var duplicate := Tags.catalogue(copy)
	verify(duplicate.duplicates.has("."), "Duplicates reported")
	verify(duplicate.tiles["."].alternative == 0, "Duplicate choice is stable and prefers base tile")
	source.get_tile_data(at, alternative).set_custom_data("ODM TAG", "^")
	source.get_tile_data(source.get_tile_id(6), 0).set_custom_data("ODM TAG", "")
	verify(Tags.catalogue(copy).tiles["^"].alternative == 9, "Tag on a nonzero alternative supported")
	copy.set_custom_data_layer_name(0, "ODM-TAG")
	verify(Tags.catalogue(copy).missing.is_empty(), "Exact ODM-TAG name supported")
	var smaller := fixture.duplicate(true)
	smaller.width = 2
	smaller.height = 2
	smaller.terrain = ".#~^"
	smaller.explored = [0, 1, 2, 3]
	smaller.visible = [0]
	smaller.tokens = []
	smaller.reachable = []
	scene.apply_snapshot({"revision": 2, "view": smaller})
	verify(scene.terrain_cell_count() == 4 and scene.markers.is_empty(), "Same-ID dimension replacement clears stale cells and tokens")
	scene.apply_snapshot({"revision": 1, "view": fixture})
	verify(scene.width == 2, "Out-of-order snapshot ignored")
	scene.apply_snapshot({"revision": 3, "view": null})
	verify(scene.terrain_cell_count() == 0 and scene.markers.is_empty(), "Closing map clears visuals")
	verify(original.get_custom_data_layer_name(0) == "ODM TAG", "Original TileSet metadata unchanged")
	if failures == 0:
		print("ODM_ISOMETRIC_TESTS_OK: ", checks, " checks")
	quit(0 if failures == 0 else 1)
