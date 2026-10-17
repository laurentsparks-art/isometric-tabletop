extends Node2D

var board

func _draw() -> void:
	if board == null or board.view.is_empty():
		return
	var half: Vector2 = Vector2(board.layer.tile_set.tile_size) / 2
	for zone in board.view.get("spellZones", []):
		for cell in zone.get("cells", []):
			if int(cell) < 0 or int(cell) >= board.view.terrain.length() or board.view.terrain[int(cell)] == " ":
				continue
			var centre: Vector2 = board.logical_to_local(Vector2(int(cell) % board.width, int(cell) / board.width))
			var shape := PackedVector2Array([centre + Vector2(0, -half.y), centre + Vector2(half.x, 0), centre + Vector2(0, half.y), centre + Vector2(-half.x, 0)])
			draw_colored_polygon(shape, Color(0.65, 0.28, 0.85, 0.3))
	for cell in board.view.get("reachable", []):
		if int(cell) < 0 or int(cell) >= board.view.terrain.length() or board.view.terrain[int(cell)] == " ":
			continue
		var at := Vector2i(int(cell) % board.width, int(cell) / board.width)
		var centre: Vector2 = board.logical_to_local(Vector2(at))
		var diamond := PackedVector2Array([centre + Vector2(0, -half.y), centre + Vector2(half.x, 0), centre + Vector2(0, half.y), centre + Vector2(-half.x, 0)])
		draw_colored_polygon(diamond, Color(0.9, 0.72, 0.25, 0.24))
