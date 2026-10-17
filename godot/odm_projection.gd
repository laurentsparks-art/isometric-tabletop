extends RefCounted
# Zen Garden's IsometricProjection, extended to rectangular and fractional cells.
# Every display layer uses this transform; ODM coordinates never change.
static func to_view(p: Vector2, size: Vector2i, quarter: int) -> Vector2:
	match posmod(quarter, 4):
		1: return Vector2(size.y - 1 - p.y, p.x)
		2: return Vector2(size.x - 1 - p.x, size.y - 1 - p.y)
		3: return Vector2(p.y, size.x - 1 - p.x)
	return p

static func to_logical(p: Vector2, size: Vector2i, quarter: int) -> Vector2:
	match posmod(quarter, 4):
		1: return Vector2(p.y, size.y - 1 - p.x)
		2: return Vector2(size.x - 1 - p.x, size.y - 1 - p.y)
		3: return Vector2(size.x - 1 - p.y, p.x)
	return p

static func visual_size(size: Vector2i, quarter: int) -> Vector2i:
	return Vector2i(size.y, size.x) if posmod(quarter, 2) else size

static func visual_axis(axis: String, quarter: int) -> String:
	if posmod(quarter, 2) and axis in ["axis-a", "axis-b"]:
		return "axis-b" if axis == "axis-a" else "axis-a"
	return axis

static func north(quarter: int) -> Vector2:
	var size := Vector2i(2, 3)
	var delta := to_view(Vector2(0, -1), size, quarter) - to_view(Vector2.ZERO, size, quarter)
	return Vector2((delta.x - delta.y) * 64, (delta.x + delta.y) * 32).normalized()
