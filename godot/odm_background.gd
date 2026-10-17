extends Node2D
var texture: Texture2D
var camera: Camera2D
var rotation_nudge := 0.0

func react_to_rotation(direction: int) -> void:
	rotation_nudge = 10.0 * direction

func _process(_delta: float) -> void:
	rotation_nudge = move_toward(rotation_nudge, 0.0, _delta * 12.0)
	queue_redraw()

func _draw() -> void:
	var size := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), Color("151b24"))
	if texture == null:
		return
	var image_size := Vector2(texture.get_size())
	var scale_value := maxf(size.x / image_size.x, size.y / image_size.y) * 1.12
	var extent := image_size * scale_value
	var offset := (size - extent) / 2
	if camera != null:
		# A restrained stage parallax; clamp so panning cannot expose edges.
		offset -= (camera.position * 0.025).clamp(-(extent - size) / 2, (extent - size) / 2)
	draw_texture_rect(texture, Rect2(offset + Vector2(rotation_nudge * 0.55, 0), extent), false, Color(0.55, 0.55, 0.55, 1))
