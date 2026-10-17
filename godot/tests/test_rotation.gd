extends SceneTree
const Grid = preload("res://odm_projection.gd")
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
	var board = load("res://tabletop.tscn").instantiate()
	root.add_child(board)
	await process_frame
	var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/original-art.json"))
	board.apply_snapshot({"revision": 1, "view": fixture})
	var original := JSON.stringify(board.view)
	var camera_position: Vector2 = board.camera.position
	var zoom: Vector2 = board.camera.zoom
	for q in 4:
		board._change_orientation(q)
		verify(board.terrain_cell_count() == board.render_cells.size(), "Both layers rebuilt without stale cells")
		for y in board.height:
			for x in board.width:
				var p := Vector2i(x, y)
				verify(board.local_to_logical(board.logical_to_local(Vector2(p))) == p, "Rectangular inverse picking q=%d at=%s" % [q, p])
		verify(JSON.stringify(board.view) == original, "View-only rotation preserves authorized state")
		verify(board.revision == 1, "Rotation never increments authoritative revision")
		for id in board.markers:
			var token: Dictionary = board.markers[id].token
			var f := float(token.get("footprint", 1))
			var centre := Vector2(float(token.x) + (f - 1) / 2, float(token.y) + (f - 1) / 2)
			verify(board.markers[id].position == board.logical_to_local(centre), "Footprint centre " + id)
		for i in board.view.terrain.length():
			if board.view.terrain[i] == " ":
				verify(board.layer.get_cell_source_id(board.logical_to_cell(Vector2i(i % board.width, i / board.width))) == -1, "Hidden cells stay absent")
				verify(board.ground_layer.get_cell_source_id(board.logical_to_cell(Vector2i(i % board.width, i / board.width))) == -1, "Hidden ground stays absent")
		for axis in ["axis-a", "axis-b"]:
			verify(Grid.visual_axis(Grid.visual_axis(axis,q),q) == axis, "Axis parity is reversible")
		var delta: Vector2 = board.logical_to_local(Vector2(0,-1)) - board.logical_to_local(Vector2.ZERO)
		verify(delta.normalized().is_equal_approx(Grid.north(q)), "North arrow follows actual projection")
	var marker_ids: Dictionary = {}
	for id in board.markers:
		marker_ids[id] = board.markers[id].get_instance_id()
	board._change_orientation(0)
	for id in marker_ids:
		verify(board.markers[id].get_instance_id() == marker_ids[id], "Rotation reuses marker " + id)
	verify(board.camera.position.is_equal_approx(camera_position), "Camera centre returns after full turn")
	board.request_rotation(1)
	board.rotation_tween.pause()
	board.rotation_tween.custom_step(0.05)
	
	verify(board.orientation == 1, "Polished reprojection occurs after 40 ms")
	# SSE refresh at midpoint must preserve orientation and complete the tween.
	board.apply_snapshot({"revision":2,"view":fixture})
	board.rotation_tween.custom_step(0.3)
	verify(not board.rotating and board.orientation == 1, "180 ms transition settles after incoming snapshot")
	verify(board.camera.offset == Vector2.ZERO and board.camera.zoom.is_equal_approx(zoom), "No cumulative transform drift")
	for i in 20:
		board.request_rotation(1)
	verify(board.rotation_queue.size() <= 3, "Bounded input queue")
	await create_timer(1.2).timeout
	verify(not board.rotating and board.rotation_queue.is_empty(), "Queue drains predictably")
	board.request_rotation(1)
	var resized: Dictionary = fixture.duplicate(true)
	resized.height = int(fixture.height) + 1
	resized.terrain += " ".repeat(int(fixture.width))
	board.apply_snapshot({"revision":3,"view":resized})
	verify(not board.rotating and board.rotation_queue.is_empty(), "Same-ID dimension change cancels tween")
	var fitted_zoom: Vector2 = board.camera.zoom
	await create_timer(0.3).timeout
	verify(board.camera.zoom == fitted_zoom, "Old tween cannot override replacement fit")
	board.reduced_motion = true
	var before: int = board.orientation
	board.request_rotation(-1)
	verify(board.orientation == posmod(before - 1, 4) and not board.rotating, "Reduced motion is instant")
	board.reduced_motion = false
	board.request_rotation(1)
	board.apply_snapshot({"revision":4,"view":null})
	await create_timer(0.3).timeout
	verify(board.markers.is_empty() and board.terrain_cell_count() == 0 and not board.rotating, "Closing map cancels rotation without stale visuals")
	for size in [Vector2i(3,8),Vector2i(9,2),Vector2i(1,5),Vector2i(5,1)]:
		for q in 4:
			for y in size.y:
				for x in size.x:
					var p := Vector2(x,y)
					var v := Grid.to_view(p,size,q)
					verify(Grid.to_logical(v,size,q) == p, "Rectangular algebra inverse")
					var extent := Grid.visual_size(size,q)
					verify(v.x >= 0 and v.y >= 0 and v.x < extent.x and v.y < extent.y, "Rotated extents")
	board.queue_free()
	await process_frame
	print("ODM_ROTATION_TESTS checks=%d failures=%d" % [checks,failures])
	quit(0 if failures == 0 else 1)
