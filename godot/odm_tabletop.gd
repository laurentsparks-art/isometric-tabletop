extends Node2D

const Tiles = preload("res://odm_tiles.gd")
const Art = preload("res://odm_art.gd")
const GridProjection = preload("res://odm_projection.gd")
const Token = preload("res://odm_token.gd")
@onready var layer: TileMapLayer = $TileMapLayer
@onready var ground_layer: TileMapLayer = $GroundLayer
@onready var camera: Camera2D = $Camera2D
var art := Art.new()
var author_set: TileSet
var art_tiles: Dictionary = {}
var orientation_notes: Array = []
var terrain_variants: Dictionary = {}
var render_cells: Array[Dictionary] = []
var skin_id := ""
var view: Dictionary = {}
var width := 0
var height := 0
var revision := -1
var lookup: Dictionary = {}
var markers: Dictionary = {}
var selected_token := ""
var map_key := ""
var last_pick := Vector2i(-1, -1)
var dragging := false
var auto_fit := true
var receive_callback
var orientation := 0
var rotating := false
var rotation_queue: Array[int] = []
var rotation_tween: Tween
var base_zoom := Vector2.ONE
var reduced_motion := false
var presentation_key := ""
var profile: Dictionary = {}
var frame_times: Array[float] = []
var rotation_frame_max := 0.0
var rotation_start := 0
var last_hover := Vector2i(-1, -1)
var events_layer
var camera_locked := false
var camera_focus := Vector2.ZERO
var web_bridge

func _ready() -> void:
	events_layer = preload("res://odm_events.gd").new()
	events_layer.board = self
	events_layer.z_index = 100
	events_layer.set_process(false)
	add_child(events_layer)
	author_set = layer.tile_set
	ground_layer.tile_set = author_set
	lookup = Tiles.catalogue(author_set)
	$Stage/Background.camera = camera
	$Reachable.board = self
	$GroundSupport.board = self
	get_viewport().size_changed.connect(func():
		if auto_fit:
			fit_camera())
	if OS.has_feature("web"):

		web_bridge = JavaScriptBridge.get_interface("odmIso")
		receive_callback = JavaScriptBridge.create_callback(_receive_web)
		web_bridge.receive = receive_callback
		_send({"type": "ready", "tags": lookup.tiles.keys(), "duplicates": lookup.duplicates, "missing": lookup.missing})
	elif OS.get_cmdline_user_args().has("--art-fixture"):
		apply_snapshot({"revision": 1, "view": JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/original-art.json"))})
	elif OS.get_cmdline_user_args().has("--fixture"):
		apply_snapshot({"revision": 1, "view": JSON.parse_string(FileAccess.get_file_as_string("res://fixtures/all-terrain.json"))})

func _receive_web(args: Array) -> void:
	if args.size() == 1 and args[0] is String:
		var packet = JSON.parse_string(args[0])
		if packet is Dictionary:
			if packet.get("type", "snapshot") == "snapshot":
				apply_snapshot(packet)
			elif packet.get("revision") == revision and packet.get("mapId") == view.get("mapId"):
				reduced_motion = packet.get("reducedMotion", false) == true
				if packet.get("type") == "camera":
					camera_locked = packet.get("mode") == "lock"
					if packet.get("mode") != "free" and packet.get("x") != null and packet.get("y") != null:
						camera_focus = Vector2(float(packet.x), float(packet.y))
						camera.position = logical_to_local(camera_focus)
						auto_fit = false
					if packet.get("zoom") != null:
						camera.zoom = Vector2.ONE * clampf(float(packet.zoom), 0.025, 3.0)
				elif packet.get("type") == "ping":
					var at := Vector2(float(packet.x), float(packet.y))
					events_layer.pulse(at)
					if packet.get("focus", false): camera.position = logical_to_local(at)
				elif packet.get("type") == "fx":
					for fx in packet.get("events", []):
						var points = fx.get("to", [])
						if points is Dictionary: points = [points]
						if points is Array:
							for at in points:
								if at is Dictionary and at.has("x") and at.has("y"): events_layer.pulse(Vector2(float(at.x), float(at.y)))
				elif packet.get("type") == "rotate" and packet.get("direction") in [-1.0, 1.0]:
					request_rotation(int(packet.direction))
				elif packet.get("type") == "view-state" and packet.get("orientation") in [0.0, 1.0, 2.0, 3.0]:
					_cancel_rotation()
					_change_orientation(int(packet.orientation))

func _send(message: Dictionary) -> void:
	if web_bridge != null:
		web_bridge.send(JSON.stringify(message))

# Preserve the author's TileSet layout. ODM's two square-grid axes project
# down-right/down-left; local_to_map converts those centres into the existing
# TileSet's (possibly staggered) grid coordinates without editing its resource.
func logical_to_local(at: Vector2) -> Vector2:
	at = GridProjection.to_view(at, Vector2i(width, height), orientation)
	var half := Vector2(layer.tile_set.tile_size) / 2
	return layer.map_to_local(Vector2i.ZERO) + Vector2((at.x - at.y) * half.x, (at.x + at.y) * half.y)

func logical_to_cell(at: Vector2i) -> Vector2i:
	return layer.local_to_map(logical_to_local(Vector2(at)))

func local_to_logical(at: Vector2) -> Vector2i:
	var centre := layer.map_to_local(layer.local_to_map(at)) - layer.map_to_local(Vector2i.ZERO)
	var half := Vector2(layer.tile_set.tile_size) / 2
	var p := Vector2(roundi((centre.x / half.x + centre.y / half.y) / 2), roundi((centre.y / half.y - centre.x / half.x) / 2))
	return Vector2i(GridProjection.to_logical(p, Vector2i(width, height), orientation))

func surface_layer(tag: String) -> TileMapLayer:
	return ground_layer if tag in [".", "~", ","] else layer

func terrain_cell_count() -> int:
	return layer.get_used_cells().size() + ground_layer.get_used_cells().size()

func clear_board() -> void:
	layer.clear()
	ground_layer.clear()
	orientation_notes.clear()
	terrain_variants.clear()
	render_cells.clear()
	$Stage/Background.texture = null
	events_layer.pulses.clear()
	events_layer.set_process(false)
	for marker in markers.values():
		remove_child(marker)
		marker.queue_free()
	markers.clear()
	view = {}
	skin_id = ""
	art_tiles = {}
	width = 0
	height = 0
	selected_token = ""
	events_layer.queue_redraw()
	$Reachable.queue_redraw()
	$GroundSupport.queue_redraw()

func apply_snapshot(packet: Dictionary, reproject := false) -> void:
	var phase_start := Time.get_ticks_usec()
	var next_revision := int(packet.get("revision", -1))
	if not reproject and next_revision <= revision:
		return
	if not reproject and (packet.get("view") == null or str(packet.get("view", {}).get("mapId", "")) != str(view.get("mapId", "")) or int(packet.get("view", {}).get("width", 0)) != width or int(packet.get("view", {}).get("height", 0)) != height):
		_cancel_rotation()
	revision = next_revision
	var previous_selection := selected_token
	var previous_mine: String = str(view.get("myTokenId", ""))
	clear_board()
	var next = packet.get("view")
	if not next is Dictionary:
		map_key = ""
		_report()
		return
	width = int(next.get("width", 0))
	height = int(next.get("height", 0))
	var terrain: String = str(next.get("terrain", ""))
	if width <= 0 or height <= 0 or width > 512 or height > 512 or terrain.length() != width * height:
		clear_board()
		_report()
		return
	view = next
	skin_id = str(view.get("skin", {}).get("id", ""))
	if view.has("skin"):
		art_tiles = art.tileset(author_set, view.skin)
		layer.tile_set = art_tiles.set
		$Stage/Background.texture = art.background(skin_id)
	else:
		art_tiles = {}
		layer.tile_set = author_set
	ground_layer.tile_set = layer.tile_set
	profile.resourcesMs = (Time.get_ticks_usec() - phase_start) / 1000.0
	phase_start = Time.get_ticks_usec()
	var reachable: Array[int] = []
	for index in view.get("reachable", []):
		reachable.append(int(index))
	view.reachable = reachable
	layer.visible_cells.clear()
	ground_layer.visible_cells.clear()
	var explored: Dictionary = {}
	for index in view.get("explored", []):
		explored[int(index)] = true
	for index in view.get("visible", []):
		layer.visible_cells[logical_to_cell(Vector2i(int(index) % width, int(index) / width))] = true
		ground_layer.visible_cells[logical_to_cell(Vector2i(int(index) % width, int(index) / width))] = true
	profile.fogMs = (Time.get_ticks_usec() - phase_start) / 1000.0
	phase_start = Time.get_ticks_usec()
	for index in terrain.length():
		var tag := terrain[index]
		if tag == " " or not explored.has(index) or not lookup.tiles.has(tag):
			continue
		var tile: Dictionary = lookup.tiles[tag]
		var logical_axis := "default"
		var ambiguous := false
		if not art_tiles.is_empty():
			var axis := "default"
			if tag == "+" or tag == "|":
				var decision := Art.orientation(terrain, width, height, Vector2i(index % width, index / width), tag)
				logical_axis = decision.axis
				ambiguous = decision.ambiguous
				axis = GridProjection.visual_axis(decision.axis, orientation)
				terrain_variants[str(index % width) + "," + str(index / width)] = {"tag": tag, "axis": axis, "ambiguous": decision.ambiguous, "logicalAxis": decision.axis}
				if decision.ambiguous and tag == "+":
					orientation_notes.append({"x": index % width, "y": index / width, "default": axis})
			var tile_key := tag + ":" + axis
			if art_tiles.tiles.has(tile_key):
				tile = art_tiles.tiles[tile_key]
		render_cells.append({"at": Vector2i(index % width, index / width), "tag": tag, "axis": logical_axis, "ambiguous": ambiguous, "fallback": lookup.tiles[tag]})
		surface_layer(tag).set_cell(logical_to_cell(Vector2i(index % width, index / width)), tile.source, tile.atlas, tile.alternative)
	layer.notify_runtime_tile_data_update()
	ground_layer.notify_runtime_tile_data_update()
	profile.tilesMs = (Time.get_ticks_usec() - phase_start) / 1000.0
	phase_start = Time.get_ticks_usec()
	for token in view.get("tokens", []):
		var marker := Node2D.new()
		marker.set_script(Token)
		marker.token = token
		marker.art_texture = art.token_texture(str(token.get("archetype", "")))
		marker.unit = Vector2(layer.tile_set.tile_size) / 2
		var f := float(token.get("footprint", 1))
		marker.position = logical_to_local(Vector2(float(token.x) + (f - 1) / 2, float(token.y) + (f - 1) / 2))
		# Party positions are intentionally shared even outside personal sight.
		if token.kind == "pc" and not explored.has(int(token.y) * width + int(token.x)):
			marker.z_index = 2
		markers[token.id] = marker
		add_child(marker)
	profile.tokensMs = (Time.get_ticks_usec() - phase_start) / 1000.0
	phase_start = Time.get_ticks_usec()
	if previous_mine == str(view.get("myTokenId", "")) and markers.has(previous_selection):
		selected_token = previous_selection
		markers[selected_token].selected = true
	var next_key := str(view.get("mapId", "")) + ":" + str(width) + ":" + str(height)
	if next_key != map_key:
		map_key = next_key
		auto_fit = true
		fit_camera()
	events_layer.queue_redraw()
	$Reachable.queue_redraw()
	$GroundSupport.queue_redraw()
	$GroundSupport.configure()
	profile.overlaysMs = (Time.get_ticks_usec() - phase_start) / 1000.0
	_report()

func fit_camera() -> void:
	if width <= 0 or height <= 0:
		return
	camera.position = logical_to_local(Vector2((width - 1) / 2.0, (height - 1) / 2.0)) - Vector2(0, 64)
	var half := Vector2(layer.tile_set.tile_size) / 2
	var extent := Vector2((width + height) * half.x + 128, (width + height) * half.y + 256)
	var viewport_size := get_viewport_rect().size
	var scale_value := clampf(minf(viewport_size.x / extent.x, viewport_size.y / extent.y), 0.025, 2.5)
	camera.zoom = Vector2.ONE * scale_value
	auto_fit = true

func _report() -> void:
	var state := {"groundSupport": {"cells": $GroundSupport.supported_cells(), "textured": $GroundSupport.floor_texture != null, "source": $GroundSupport.floor_material}, "performance": profile, "width": width, "height": height, "orientation": orientation, "rotating": rotating, "queue": rotation_queue.size(), "north": {"x": GridProjection.north(orientation).x, "y": GridProjection.north(orientation).y}, "skin": skin_id, "placeholderArt": art_tiles.get("placeholder", false), "doorAmbiguities": orientation_notes, "terrainVariants": terrain_variants, "backgroundLoaded": $Stage/Background.texture != null, "revision": revision, "mapId": view.get("mapId", ""), "cells": terrain_cell_count(), "tokens": markers.size(), "camera": {"x": camera.position.x, "y": camera.position.y, "zoom": camera.zoom.x}, "selectedTokenId": selected_token, "lastPick": {"x": last_pick.x, "y": last_pick.y}, "positions": {}, "viewport": {"x": get_viewport_rect().size.x, "y": get_viewport_rect().size.y}, "origin": {"x": layer.map_to_local(Vector2i.ZERO).x, "y": layer.map_to_local(Vector2i.ZERO).y}}
	for id in markers:
		state.positions[id] = {"archetype": markers[id].token.get("archetype", ""), "artLoaded": markers[id].art_texture != null, "x": markers[id].position.x, "y": markers[id].position.y, "logicalX": markers[id].token.x, "logicalY": markers[id].token.y}
	if web_bridge != null:
		web_bridge.report(JSON.stringify(state))
	_send({"type": "applied", "revision": revision, "mapId": view.get("mapId", ""), "cells": terrain_cell_count(), "tokens": markers.size()})

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and not dragging:
		var hover := local_to_logical(get_local_mouse_position())
		if hover != last_hover:
			last_hover = hover
			_send({"type": "hover", "x": hover.x, "y": hover.y})
	if rotating:
		if event is InputEventKey and event.pressed and not event.echo and event.keycode in [KEY_Q, KEY_E]:
			_send({"type": "rotation-input", "direction": -1 if event.keycode == KEY_Q else 1, "revision": revision, "mapId": view.get("mapId", "")})
			request_rotation(-1 if event.keycode == KEY_Q else 1)
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_MIDDLE or event.button_index == MOUSE_BUTTON_RIGHT:
			dragging = event.pressed and not camera_locked
			get_viewport().set_input_as_handled()
		elif not camera_locked and event.pressed and (event.button_index == MOUSE_BUTTON_WHEEL_UP or event.button_index == MOUSE_BUTTON_WHEEL_DOWN):
			var before := get_global_mouse_position()
			var factor := 1.15 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0 / 1.15
			camera.zoom = Vector2.ONE * clampf(camera.zoom.x * factor, 0.025, 3.0)
			camera.position += before - get_global_mouse_position()
			auto_fit = false
			_report()
			get_viewport().set_input_as_handled()
		elif event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			pick(local_to_logical(get_local_mouse_position()))
	elif event is InputEventMouseMotion and dragging:
		camera.position -= event.relative / camera.zoom
		auto_fit = false
		_report()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_Q, KEY_E]:
			_send({"type": "rotation-input", "direction": -1 if event.keycode == KEY_Q else 1, "revision": revision, "mapId": view.get("mapId", "")})
			request_rotation(-1 if event.keycode == KEY_Q else 1)
			return
		var directions := {KEY_LEFT: Vector2(-1, 0), KEY_RIGHT: Vector2(1, 0), KEY_UP: Vector2(0, -1), KEY_DOWN: Vector2(0, 1)}
		if directions.has(event.keycode) and not camera_locked:
			camera.position += directions[event.keycode] * 80 / camera.zoom
			auto_fit = false
		elif event.keycode == KEY_0:
			fit_camera()
		_report()

func pick(at: Vector2i) -> void:
	last_pick = at
	_report()
	if view.is_empty():
		return
	for token in view.get("tokens", []):
		var footprint := int(token.get("footprint", 1))
		if Rect2i(int(token.x), int(token.y), footprint, footprint).has_point(at):
			selected_token = token.id
			for id in markers:
				markers[id].selected = id == selected_token
				markers[id].queue_redraw()
			_report()
			_send({"type": "token-select", "tokenId": token.id, "revision": revision, "mapId": view.mapId})
			return
	if at.x < 0 or at.y < 0 or at.x >= width or at.y >= height or view.terrain[at.y * width + at.x] == " ":
		return
	var move_allowed: bool = not view.get("busy", true) and selected_token == view.get("myTokenId", "") and view.get("reachable", []).has(at.y * width + at.x)
	_send({"type": "move" if move_allowed else "tile-select", "x": at.x, "y": at.y, "tokenId": selected_token, "revision": revision, "mapId": view.mapId})

# Adapted from Zen Garden rotation_transition.gd; polished to 180 ms:
# 40 ms anticipation, 30 ms overshoot, 110 ms settle. Camera-space accent
# keeps every board layer and HTML label synchronized without spinning diamonds.
func request_rotation(direction: int) -> void:
	if view.is_empty() or direction not in [-1, 1]:
		return
	if rotating:
		if rotation_queue.size() < 3:
			rotation_queue.append(direction)
		return
	if reduced_motion:
		_change_orientation(orientation + direction)
		return
	rotation_start = Time.get_ticks_usec()
	rotation_frame_max = 0.0
	rotating = true
	dragging = false
	base_zoom = camera.zoom
	var anticipation := Vector2(-7.0 * direction, 2.5)
	rotation_tween = create_tween()
	rotation_tween.tween_property(camera, "offset", -anticipation / base_zoom, 0.04).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	rotation_tween.parallel().tween_property(camera, "zoom", base_zoom * 1.018, 0.04)
	rotation_tween.tween_callback(func():
		_change_orientation(orientation + direction)
		$Stage/Background.react_to_rotation(direction))
	rotation_tween.tween_property(camera, "offset", anticipation * 0.28 / base_zoom, 0.03).set_trans(Tween.TRANS_SINE)
	rotation_tween.parallel().tween_property(camera, "zoom", base_zoom * 0.994, 0.03)
	rotation_tween.tween_property(camera, "offset", Vector2.ZERO, 0.11).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	rotation_tween.parallel().tween_property(camera, "zoom", base_zoom, 0.11)
	rotation_tween.finished.connect(func():
		rotating = false
		profile.animationMs = (Time.get_ticks_usec() - rotation_start) / 1000.0
		profile.rotationFrameMaxMs = rotation_frame_max
		_report()
		if not rotation_queue.is_empty():
			request_rotation(rotation_queue.pop_front()))
	_report()

func _cancel_rotation() -> void:
	if rotation_tween != null and rotation_tween.is_valid():
		rotation_tween.kill()
	if rotating:
		camera.zoom = base_zoom
	camera.offset = Vector2.ZERO
	rotating = false
	rotation_queue.clear()

func _change_orientation(next: int) -> void:
	var started := Time.get_ticks_usec()
	if view.is_empty():
		orientation = posmod(next, 4)
		return
	var centre := Vector2((width - 1) / 2.0, (height - 1) / 2.0)
	var old_centre := logical_to_local(centre)
	orientation = posmod(next, 4)
	camera.position += logical_to_local(centre) - old_centre
	_reproject_terrain()
	if camera_locked: camera.position = logical_to_local(camera_focus)
	var token_start := Time.get_ticks_usec()
	for marker in markers.values():
		var token: Dictionary = marker.token
		var f := float(token.get("footprint", 1))
		marker.position = logical_to_local(Vector2(float(token.x) + (f - 1) / 2, float(token.y) + (f - 1) / 2))
	profile.tokensMs = (Time.get_ticks_usec() - token_start) / 1000.0
	var overlay_start := Time.get_ticks_usec()
	events_layer.queue_redraw()
	$Reachable.queue_redraw()
	$GroundSupport.queue_redraw()
	profile.overlaysMs = (Time.get_ticks_usec() - overlay_start) / 1000.0
	profile.resourcesMs = 0.0
	profile.midpointMs = (Time.get_ticks_usec() - started) / 1000.0
	_report()


func _reproject_terrain() -> void:
	# Reuse the TileSet, authorized cell decisions and token instances.
	var started := Time.get_ticks_usec()
	layer.clear()
	ground_layer.clear()
	layer.visible_cells.clear()
	ground_layer.visible_cells.clear()
	for index in view.get("visible", []):
		layer.visible_cells[logical_to_cell(Vector2i(int(index) % width, int(index) / width))] = true
		ground_layer.visible_cells[logical_to_cell(Vector2i(int(index) % width, int(index) / width))] = true
	profile.fogMs = (Time.get_ticks_usec() - started) / 1000.0
	started = Time.get_ticks_usec()
	terrain_variants.clear()
	for cell in render_cells:
		var axis := GridProjection.visual_axis(str(cell.axis), orientation)
		var tile: Dictionary = art_tiles.get("tiles", {}).get(str(cell.tag) + ":" + axis, cell.fallback)
		surface_layer(str(cell.tag)).set_cell(logical_to_cell(cell.at), tile.source, tile.atlas, tile.alternative)
		if cell.tag in ["+", "|"]:
			terrain_variants["%d,%d" % [cell.at.x, cell.at.y]] = {"tag": cell.tag, "axis": axis, "logicalAxis": cell.axis, "ambiguous": cell.ambiguous}
	profile.tilesMs = (Time.get_ticks_usec() - started) / 1000.0
	started = Time.get_ticks_usec()
	layer.notify_runtime_tile_data_update()
	ground_layer.notify_runtime_tile_data_update()
	layer.update_internals()
	ground_layer.update_internals()
	profile.tileInternalsMs = (Time.get_ticks_usec() - started) / 1000.0

func _process(_delta: float) -> void:
	frame_times.append(_delta * 1000.0)
	if frame_times.size() > 120:
		frame_times.pop_front()
	profile.frameMeanMs = frame_times.reduce(func(a, b): return a + b, 0.0) / frame_times.size()
	if rotating:
		rotation_frame_max = maxf(rotation_frame_max, _delta * 1000.0)
	# Only send on transform/projection changes, never forward names or hidden data.
	var transform := get_global_transform_with_canvas()
	var key := str(transform) + str(revision) + str(orientation) + str(rotating) + str(get_viewport_rect().size)
	if key == presentation_key:
		return
	presentation_key = key
	var labels: Array = []
	var anchors := {}
	for id in markers:
		var marker: Node2D = markers[id]
		var lift := 16.0 if marker.token.get("elevation", "") == "flying" else 0.0
		var point: Vector2 = transform * (marker.position + Vector2(0, (-110 if marker.art_texture != null else -56) - lift))
		labels.append({"id": id, "x": point.x, "y": point.y})
		var top := -48.0
		if marker.art_texture != null:
			top = -marker.art_texture.get_height() * minf(1.65, 1.0 + (float(marker.token.get("footprint", 1)) - 1.0) * 0.25) + 8.0
		var a: Vector2 = transform * (marker.position + Vector2(0, top - lift))
		var b: Vector2 = transform * (marker.position + Vector2(0, 8 - lift))
		var size := get_viewport_rect().size
		var anchor := [a.x / size.x, a.y / size.y, b.y / size.y]
		if anchor.all(func(n): return n >= -1.0 and n <= 2.0):
			anchors[id] = anchor
	for label in view.get("labels", []):
		var at := Vector2(float(label.x), float(label.y))
		if events_layer.known(at):
			var point: Vector2 = transform * logical_to_local(at)
			labels.append({"text": str(label.text), "x": point.x, "y": point.y})
	var north := GridProjection.north(orientation)
	_send({"type": "presentation", "revision": revision, "mapId": view.get("mapId", ""), "orientation": orientation, "rotating": rotating, "north": {"x": north.x, "y": north.y}, "labels": labels, "anchors": anchors, "viewport": {"x": get_viewport_rect().size.x, "y": get_viewport_rect().size.y}})
