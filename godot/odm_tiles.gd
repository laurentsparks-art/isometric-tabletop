extends RefCounted

const TAGS = [".", "#", "~", ",", "+", "|", "^"]

static func catalogue(tiles: TileSet) -> Dictionary:
	var result := {"tiles": {}, "duplicates": [], "missing": [], "layer": "ODM-TAG"}
	var layer := tiles.get_custom_data_layer_by_name("ODM-TAG")
	if layer < 0:
		layer = tiles.get_custom_data_layer_by_name("ODM TAG")
		result.layer = "ODM TAG"
	if layer < 0 or tiles.get_custom_data_layer_type(layer) != TYPE_STRING:
		result.missing = TAGS.duplicate()
		return result
	var sources: Array[int] = []
	for i in tiles.get_source_count():
		sources.append(tiles.get_source_id(i))
	sources.sort()
	for source_id in sources:
		var source = tiles.get_source(source_id)
		if not source is TileSetAtlasSource:
			continue
		var coords: Array[Vector2i] = []
		for i in source.get_tiles_count():
			coords.append(source.get_tile_id(i))
		coords.sort_custom(func(a, b): return a.y < b.y or (a.y == b.y and a.x < b.x))
		for atlas in coords:
			var alternatives: Array[int] = [0]
			for i in source.get_alternative_tiles_count(atlas):
				var id: int = source.get_alternative_tile_id(atlas, i)
				if not alternatives.has(id):
					alternatives.append(id)
			alternatives.sort()
			for alternative in alternatives:
				var data: TileData = source.get_tile_data(atlas, alternative)
				var tag = data.get_custom_data_by_layer_id(layer)
				if not tag is String or not TAGS.has(tag):
					continue
				if result.tiles.has(tag):
					if not result.duplicates.has(tag):
						result.duplicates.append(tag)
				else:
					result.tiles[tag] = {"source": source_id, "atlas": atlas, "alternative": alternative}
	for tag in TAGS:
		if not result.tiles.has(tag):
			result.missing.append(tag)
	return result
