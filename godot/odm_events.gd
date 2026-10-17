extends Node2D
# Presentation-only marks and transient feedback from the official host bridge.
var board: Node2D
var pulses: Array[Dictionary] = []
func known(at: Vector2) -> bool:
 var p := Vector2i(at.floor())
 return p.x >= 0 and p.y >= 0 and p.x < board.width and p.y < board.height and board.view.get("terrain", "")[p.y * board.width + p.x] != " "
func pulse(at: Vector2, tone := Color("e9bd67")) -> void:
 if not known(at): return
 pulses.append({"at": at, "until": Time.get_ticks_msec() + 650, "tone": tone})
 set_process(true)
 queue_redraw()
func _process(_delta: float) -> void:
 pulses = pulses.filter(func(p): return p.until > Time.get_ticks_msec())
 queue_redraw()
 if pulses.is_empty(): set_process(false)
func _draw() -> void:
 if board == null or board.view.is_empty(): return
 for mark in board.view.get("marks", []):
  var points: Array = mark.get("points", [])
  for i in range(1, points.size()):
   var a := Vector2(float(points[i-1].x), float(points[i-1].y))
   var b := Vector2(float(points[i].x), float(points[i].y))
   var steps := maxi(1, ceili(a.distance_to(b) * 4))
   for step in steps:
    var start := a.lerp(b, float(step) / steps)
    var end := a.lerp(b, float(step+1) / steps)
    if known(start) and known(end): draw_line(board.logical_to_local(start), board.logical_to_local(end), Color("d6b475"), 3.0, true)
 for token in board.view.get("tokens", []):
  if not known(Vector2(token.x, token.y)): continue
  for aura in token.get("auras", []):
   var r := float(aura.get("radiusFeet", 0)) / 5.0
   var pts := PackedVector2Array()
   for i in 33:
    var angle := TAU * i / 32
    var at := Vector2(token.x, token.y) + Vector2(cos(angle),sin(angle)) * r
    if known(at): pts.append(board.logical_to_local(at))
    elif pts.size() > 1:
     draw_polyline(pts, Color(0.7,0.75,1,0.35),2.0,true);pts.clear()
   if pts.size() > 1: draw_polyline(pts,Color(0.7,0.75,1,0.35),2.0,true)
 for pulse_data in pulses:
  var remaining := float(pulse_data.until-Time.get_ticks_msec())/650.0
  var p: Vector2 = board.logical_to_local(pulse_data.at)
  var c: Color = pulse_data.tone;c.a = remaining
  draw_arc(p, (1.0-remaining)*40.0+12.0, 0, TAU, 32,c,3.0,true)

