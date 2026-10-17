extends Node2D
var board
var floor_texture: Texture2D
var floor_region := Rect2()
var floor_material := ""

func configure() -> void:
	floor_texture = null
	floor_material = ""
	if board == null or board.view.is_empty():
		return
	var requested := str(board.view.get("skin", {}).get("bind", {}).get(".", ""))
	var material: Dictionary = board.art.material(board.skin_id, ".", requested)
	var variant: Dictionary = material.get("variants", {}).get("default", {})
	if variant.is_empty():
		return
	floor_material = str(variant.get("file", ""))
	floor_texture = board.art.texture(str(variant.get("atlas", "")))
	var geometry: Dictionary = board.art.manifest.get("geometry", {})
	var region: Array = geometry.get("region", [128,384])
	var margin: Array = geometry.get("margin", [8,8])
	var separation: Array = geometry.get("separation", [16,16])
	var anchor: Array = geometry.get("anchor", [64,288])
	var cell: Array = variant.get("cell", [0,0])
	# A complete 128x64 floor diamond from its own guttered atlas region.
	floor_region = Rect2(int(margin[0]) + int(cell[0]) * (int(region[0]) + int(separation[0])), int(margin[1]) + int(cell[1]) * (int(region[1]) + int(separation[1])) + int(anchor[1]) - 32,128,64)
	queue_redraw()

func needs_floor(tag: String) -> bool:
	var skin: Dictionary = board.art.manifest.get("skins", {}).get(board.skin_id, {})
	return tag in ["+", "|", "^"] or (tag == "#" and bool(skin.get("wallFloorSupport", false)))

func supported_cells() -> Array[int]:
	var result: Array[int] = []
	if board == null or board.view.is_empty():
		return result
	for index in board.view.get("explored", []):
		var i := int(index)
		if i >= 0 and i < board.view.terrain.length() and needs_floor(board.view.terrain[i]) and not result.has(i):
			result.append(i)
	return result

func _draw() -> void:
	if board == null or board.view.is_empty():
		return
	var skin: Dictionary = board.art.manifest.get("skins", {}).get(board.skin_id, {})
	var colour := Color(str(skin.get("supportColor", "#454741")))
	var visible: Dictionary = {}
	for index in board.view.get("visible", []):
		visible[int(index)] = true
	for index in board.view.get("explored", []):
		var i := int(index)
		if i < 0 or i >= board.view.terrain.length() or board.view.terrain[i] == " ":
			continue
		var centre: Vector2 = board.logical_to_local(Vector2(i % board.width, i / board.width))
		var tint := Color.WHITE if visible.has(i) else Color(0.38,0.38,0.46)
		# The existing half-pixel seam guard stays under known cells only.
		var shape := PackedVector2Array([centre+Vector2(0,-32.5),centre+Vector2(64.5,0),centre+Vector2(0,32.5),centre+Vector2(-64.5,0)])
		draw_colored_polygon(shape,colour*tint)
		if board.view.terrain[i] in ["+", "|", "^"] and floor_texture != null:
			draw_texture_rect_region(floor_texture,Rect2(centre-Vector2(64,32),Vector2(128,64)),floor_region,tint)
