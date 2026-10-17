extends RefCounted

const MANIFEST = "res://assets/metadata/catalogue.json"
var manifest: Dictionary = {}
var textures: Dictionary = {}
var cache: Dictionary = {}

func _init() -> void:
	if FileAccess.file_exists(MANIFEST):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
		if parsed is Dictionary:
			manifest = parsed

func texture(path: String) -> Texture2D:
	if path.is_empty() or not ResourceLoader.exists("res://assets/" + path):
		return null
	if not textures.has(path):
		textures[path] = load("res://assets/" + path)
	return textures[path]

# All path/resource choices come from the shipped catalogue, never bridge URLs.
func material(skin_id: String, tag: String, requested: String = "") -> Dictionary:
	var materials: Dictionary = manifest.get("materials", {})
	var skins: Dictionary = manifest.get("skins", {})
	var skin: Dictionary = skins.get(skin_id, skins.get("stone-dungeon", {}))
	var fallback: Dictionary = skins.get("stone-dungeon", {})
	for id in [requested, skin.get("bind", {}).get(tag, ""), fallback.get("bind", {}).get(tag, "")]:
		if materials.has(id) and materials[id].get("tag") == tag:
			return materials[id]
	return {}

func tileset(original: TileSet, skin: Dictionary) -> Dictionary:
	var key := JSON.stringify(skin)
	if cache.has(key):
		return cache[key]
	var set: TileSet = original.duplicate(true)
	# Retain author sources as a last-resort fallback if an asset is absent.
	var tag_layer := set.get_custom_data_layer_by_name("ODM-TAG")
	if tag_layer < 0:
		tag_layer = set.get_custom_data_layers_count()
		set.add_custom_data_layer()
		set.set_custom_data_layer_name(tag_layer, "ODM-TAG")
		set.set_custom_data_layer_type(tag_layer, TYPE_STRING)
	var axis_layer := set.get_custom_data_layers_count()
	set.add_custom_data_layer()
	set.set_custom_data_layer_name(axis_layer, "ODM-AXIS")
	set.set_custom_data_layer_type(axis_layer, TYPE_STRING)
	var result := {"set": set, "tiles": {}, "skin": skin.get("id", "stone-dungeon"), "placeholder": false}
	var skin_info: Dictionary = manifest.get("skins", {}).get(result.skin, {})
	result.placeholder = skin_info.get("status", "") == "placeholder"
	var source_id := 100
	for tag in [".", "#", "~", ",", "+", "|", "^"]:
		var entry := material(str(result.skin), tag, str(skin.get("bind", {}).get(tag, "")))
		for axis in entry.get("variants", {}):
			var variant: Dictionary = entry.variants[axis]
			var atlas_path: String = str(skin_info.get("atlasOverrides", {}).get(tag, variant.atlas))
			var image := texture(atlas_path)
			if image == null:
				continue
			var source := TileSetAtlasSource.new()
			source.texture = image
			var geometry: Dictionary = manifest.get("geometry", {})
			var region: Array = geometry.get("region", [128, 256])
			var margin: Array = geometry.get("margin", [0, 0])
			var separation: Array = geometry.get("separation", [0, 0])
			source.texture_region_size = Vector2i(int(region[0]), int(region[1]))
			source.margins = Vector2i(int(margin[0]), int(margin[1]))
			source.separation = Vector2i(int(separation[0]), int(separation[1]))
			source.use_texture_padding = true
			var at := Vector2i(int(variant.cell[0]), int(variant.cell[1]))
			source.create_tile(at)
			var data := source.get_tile_data(at, 0)
			var origin: Array = manifest.get("origin", [0, 32])
			data.texture_origin = Vector2i(int(origin[0]), int(origin[1]))
			data.y_sort_origin = 0
			# set_custom_data requires this source to belong to a TileSet.
			set.add_source(source, source_id)
			data.set_custom_data("ODM-TAG", tag)
			data.set_custom_data("ODM-AXIS", axis)
			result.tiles[tag + ":" + axis] = {"source": source_id, "atlas": at, "alternative": 0}
			source_id += 1
	cache[key] = result
	return result

# ODM x projects down-right; ODM y projects down-left. The authored door
# axis-a panel follows y, while the authored fence axis-a follows x.
# Keep asset names stable and select the actual panel plane per role.
# Spaces are unknown, not walls. Ambiguity cannot consult a secret/raw map.
static func orientation(terrain: String, width: int, height: int, at: Vector2i, tag: String = "+") -> Dictionary:
	var counts := [0, 0]
	var directions := [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]
	for i in directions.size():
		var next: Vector2i = at + directions[i]
		if next.x < 0 or next.y < 0 or next.x >= width or next.y >= height:
			continue
		var index := next.y * width + next.x
		if index >= terrain.length():
			continue
		var neighbour := terrain[index]
		if neighbour == "#" or neighbour == "|":
			counts[i / 2] += 1
	if tag == "|" and counts[0] != counts[1]:
		return {"axis": "axis-a" if counts[0] > counts[1] else "axis-b", "ambiguous": false}
	if counts[0] == 2 and counts[1] != 2:
		return {"axis": "axis-b" if tag == "+" else "axis-a", "ambiguous": false}
	if counts[1] == 2 and counts[0] != 2:
		return {"axis": "axis-a" if tag == "+" else "axis-b", "ambiguous": false}
	return {"axis": "axis-a", "ambiguous": true}

func background(skin_id: String) -> Texture2D:
	var skins: Dictionary = manifest.get("skins", {})
	return texture(str(skins.get(skin_id, skins.get("stone-dungeon", {})).get("background", "")))

func token_texture(archetype: String) -> Texture2D:
	return texture(str(manifest.get("tokens", {}).get(archetype, {}).get("file", "")))
