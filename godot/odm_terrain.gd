extends TileMapLayer

var width := 0
var visible_cells: Dictionary = {}

func _use_tile_data_runtime_update(coords: Vector2i) -> bool:
	return not visible_cells.has(coords)

func _tile_data_runtime_update(coords: Vector2i, data: TileData) -> void:
	if not visible_cells.has(coords):
		data.modulate = Color(0.38, 0.38, 0.46)
