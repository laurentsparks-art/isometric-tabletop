extends Node2D

var token: Dictionary = {}
var art_texture: Texture2D
var selected := false
var unit := Vector2(64, 32)

func _draw() -> void:
	var colours := {"pc": Color("56c9df"), "enemy": Color("e96963"), "npc": Color("c9a5eb"), "prop": Color("b7a68a")}
	var colour: Color = colours.get(token.get("kind", "prop"), Color.WHITE)
	var f := float(token.get("footprint", 1))
	var diamond := PackedVector2Array([Vector2(0, -unit.y * f), Vector2(unit.x * f, 0), Vector2(0, unit.y * f), Vector2(-unit.x * f, 0), Vector2(0, -unit.y * f)])
	draw_colored_polygon(diamond, Color(colour, 0.15))
	draw_polyline(diamond, Color("f5d675") if selected else colour, 3.0)
	if token.get("active", false):
		var turn_outline := PackedVector2Array()
		for point in diamond:
			turn_outline.append(point * 1.12)
		draw_polyline(turn_outline, Color("ffffff"), 2.0)
	var lift := 16.0 if token.get("elevation", "") == "flying" else 0.0
	var font := ThemeDB.fallback_font
	if art_texture != null:
		# Footpoint stays at the server's footprint centre, not a sprite corner.
		var size := Vector2(art_texture.get_size()) * minf(1.65, 1.0 + (f - 1) * 0.25)
		draw_texture_rect(art_texture, Rect2(Vector2(-size.x / 2, -size.y - lift + 8), size), false, Color(0.55, 0.55, 0.55) if token.get("down", false) else Color.WHITE)
	else:
		var head := Vector2(0, -28 - lift)
		draw_line(Vector2.ZERO, head, colour, 5)
		draw_circle(head, 17, Color("171525"))
		draw_arc(head, 17, 0, TAU, 32, colour, 3)
		var initial := str(token.get("name", "?")).left(1)
		if not OS.has_feature("web"):
			draw_string(font, head + Vector2(-6, 6), initial, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, colour)
	if token.get("down", false):
		draw_line(Vector2(-20, -48), Vector2(20, -8), Color.WHITE, 3)
	# Browser labels use the exact ODM font at screen resolution.
	if OS.has_feature("web"):
		return
	var text := str(token.get("name", ""))
	var text_width := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
	draw_string(font, Vector2(-text_width / 2, -110 - lift if art_texture != null else -56 - lift), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)

	var details := str(token.get("health", ""))
	for condition in token.get("conditions", []):
		details += " · " + str(condition.get("label", ""))
	if not details.is_empty():
		var detail_width := font.get_string_size(details, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
		draw_string(font, Vector2(-detail_width / 2, 22), details, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("ded5bb"))
