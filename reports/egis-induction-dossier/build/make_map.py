#!/usr/bin/env python3
"""
Generate SVG path geometry for the island of Ireland from Natural Earth 10m data.

Emits assets/ireland_geo.json containing:
  - roi     : SVG path data for the Republic of Ireland (all polygons)
  - ni      : SVG path data for Northern Ireland (UK polygons on the island)
  - project : the projection constants, so scheme points can be placed in the
              same coordinate space by the page's own JS.

Projection is a Lambert conformal conic tuned to Ireland (standard parallels
53.5N/54.5N, central meridian 8W) which is what OSi/TII mapping approximates.
"""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, os.pardir, "assets", "ireland_geo.json")

# ---------------------------------------------------------------- projection

LON0 = math.radians(-8.0)
LAT1 = math.radians(53.5)
LAT2 = math.radians(54.5)
LAT0 = math.radians(53.5)
R = 1000.0


def _n():
    return math.log(math.cos(LAT1) / math.cos(LAT2)) / math.log(
        math.tan(math.pi / 4 + LAT2 / 2) / math.tan(math.pi / 4 + LAT1 / 2)
    )


N = _n()
F = (math.cos(LAT1) * math.tan(math.pi / 4 + LAT1 / 2) ** N) / N
RHO0 = R * F / (math.tan(math.pi / 4 + LAT0 / 2) ** N)


def project(lon_deg, lat_deg):
    """Lambert conformal conic -> planar x,y (y already flipped for SVG)."""
    lon = math.radians(lon_deg)
    lat = math.radians(lat_deg)
    rho = R * F / (math.tan(math.pi / 4 + lat / 2) ** N)
    theta = N * (lon - LON0)
    x = rho * math.sin(theta)
    # SVG y grows downward, so negate the northing to put north at the top.
    y = rho * math.cos(theta) - RHO0
    return x, y


# ---------------------------------------------------------------- simplify

def perp_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(pts, tol):
    """Iterative Douglas-Peucker (no recursion limit risk on long coastlines)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        worst, idx = -1.0, -1
        for k in range(i + 1, j):
            d = perp_dist(pts[k], pts[i], pts[j])
            if d > worst:
                worst, idx = d, k
        if worst > tol:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(pts, keep) if k]


# ---------------------------------------------------------------- extraction

def polygons(feature):
    g = feature["geometry"]
    if g["type"] == "Polygon":
        return [g["coordinates"]]
    return g["coordinates"]


def on_island(ring):
    """True when a ring sits inside the island-of-Ireland bounding box."""
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    return (
        min(lons) > -11.5
        and max(lons) < -5.3
        and min(lats) > 51.2
        and max(lats) < 55.5
    )


def build(feature, island_only, min_area, tol):
    """Return (svg_path_string, bounds) for the wanted polygons of a feature."""
    parts = []
    for poly in polygons(feature):
        outer = poly[0]
        if island_only and not on_island(outer):
            continue
        pts = [project(c[0], c[1]) for c in outer]
        # shoelace area in projected units, to drop specks
        area = abs(
            sum(
                pts[i][0] * pts[(i + 1) % len(pts)][1]
                - pts[(i + 1) % len(pts)][0] * pts[i][1]
                for i in range(len(pts))
            )
            / 2
        )
        if area < min_area:
            continue
        parts.append(simplify(pts, tol))
    return parts


def to_path(parts, ndigits=2):
    out = []
    for pts in parts:
        d = "M" + " L".join(f"{x:.{ndigits}f},{y:.{ndigits}f}" for x, y in pts) + "Z"
        out.append(d)
    return "".join(out)


def bounds(all_parts):
    xs = [p[0] for parts in all_parts for pts in parts for p in pts]
    ys = [p[1] for parts in all_parts for pts in parts for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def main():
    irl = json.load(open(os.path.join(HERE, "ne10_Ireland.json")))
    uk = json.load(open(os.path.join(HERE, "ne10_United_Kingdom.json")))

    roi = build(irl, island_only=True, min_area=0.05, tol=0.11)
    ni = build(uk, island_only=True, min_area=0.05, tol=0.11)

    minx, miny, maxx, maxy = bounds([roi, ni])
    pad = 1.5
    vb = [minx - pad, miny - pad, (maxx - minx) + 2 * pad, (maxy - miny) + 2 * pad]

    data = {
        "roi": to_path(roi),
        "ni": to_path(ni),
        "viewBox": [round(v, 2) for v in vb],
        "projection": {
            "type": "lcc",
            "lon0": -8.0,
            "lat1": 53.5,
            "lat2": 54.5,
            "lat0": 53.5,
            "R": R,
            "n": N,
            "F": F,
            "rho0": RHO0,
        },
        "counts": {"roiParts": len(roi), "niParts": len(ni)},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(data, fh)
    # The page is opened over file://, where fetch() is blocked, so the same
    # payload is also emitted as a plain script that assigns a global.
    with open(OUT.replace(".json", ".js"), "w") as fh:
        fh.write("window.__ireland = ")
        json.dump(data, fh)
        fh.write(";\n")
    print(
        f"roi parts={len(roi)} pts={sum(len(p) for p in roi)}  "
        f"ni parts={len(ni)} pts={sum(len(p) for p in ni)}"
    )
    print("viewBox", data["viewBox"])
    print("bytes", os.path.getsize(OUT))


if __name__ == "__main__":
    main()
