extends SceneTree
var checks := 0
var failures := 0
func verify(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		push_error(label)
func _initialize() -> void:
	call_deferred("run_tests")
func run_tests() -> void:
	var board = load("res://tabletop.tscn").instantiate()
	root.add_child(board)
	await process_frame
	var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/original-art.json"))
	var rev := 0
	for skin in board.art.manifest.skins:
		rev += 1
		var next: Dictionary = fixture.duplicate(true)
		next.skin = {"id":skin,"bind":{}}
		board.apply_snapshot({"revision":rev,"view":next})
		var ground = board.get_node("GroundSupport")
		verify(ground.floor_texture != null,"Resolved floor " + skin)
		var expected: Array[int] = []
		for index in next.explored:
			var i := int(index)
			var wall_support: bool = bool(board.art.manifest.skins[skin].get("wallFloorSupport", false))
			if (next.terrain[i] in ["+","|","^"] or (wall_support and next.terrain[i] == "#")) and not expected.has(i):
				expected.append(i)
		verify(ground.supported_cells() == expected,"Exactly authorized structure cells " + skin)
		var image: Image = ground.floor_texture.get_image()
		for point in [Vector2i(64,12),Vector2i(40,26),Vector2i(64,26),Vector2i(88,26),Vector2i(24,32),Vector2i(64,32),Vector2i(104,32),Vector2i(64,44)]:
			var at: Vector2i = Vector2i(ground.floor_region.position) + point
			verify(image.get_pixelv(at).a > 0.9,"Opaque floor interior " + skin + str(point))
		for q in 4:
			board._change_orientation(q)
			verify(ground.supported_cells() == expected,"No duplicate/void/hidden floor after rotation " + skin)
			for i in expected:
				verify(board.ground_layer.z_index < board.layer.z_index,"Ground never overpaints fence fronts")
				verify(board.layer.get_cell_source_id(board.logical_to_cell(Vector2i(i % board.width,i / board.width))) >= 0,"Structure above support " + skin)
		verify(ground.z_index < board.layer.z_index,"Support sorts below structures")
	# Candidate walls receive support only when the player projection explores them.
	var partial: Dictionary = fixture.duplicate(true)
	partial.skin = {"id":"open-ground","bind":{}}
	partial.width = 3
	partial.height = 2
	partial.terrain = "# #+|^"
	partial.explored = [0,1,3,4,5]
	partial.visible = [0,3,4,5]
	partial.tokens = []
	board.apply_snapshot({"revision":rev+1,"view":partial})
	for q in 4:
		board._change_orientation(q)
		verify(board.get_node("GroundSupport").supported_cells() == [0,3,4,5],"No floor under redacted space or unexplored wall at viewpoint " + str(q))
	# Known-space redaction must still win over an explored index.
	var hidden: Dictionary = fixture.duplicate(true)
	hidden.terrain = " ".repeat(int(fixture.width)*int(fixture.height))
	board.apply_snapshot({"revision":rev+2,"view":hidden})
	verify(board.get_node("GroundSupport").supported_cells().is_empty(),"No support through redaction")
	board.apply_snapshot({"revision":rev+3,"view":null})
	verify(board.get_node("GroundSupport").supported_cells().is_empty(),"Map closure clears support")
	board.queue_free()
	await process_frame
	print("ODM_GROUND_TESTS checks=%d failures=%d" % [checks,failures])
	quit(0 if failures == 0 else 1)
