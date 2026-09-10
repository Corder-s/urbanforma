import * as THREE from "three";
import type { BasemapStyle } from "../../data/visualization.data";
import type { Bounds, BoundaryObject, TerrainObject } from "../../types/visualization.types";
import { flatPolygonGeometry, toScene } from "./sceneMath";

/**
 * Ground: a large base plane, the site plate (slightly raised so it reads as
 * the subject) and optional contour lines. Terrain is indicative only.
 */
export function buildTerrain(world: Bounds, boundary: BoundaryObject | null, contours: TerrainObject[], basemap: BasemapStyle, showContours: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = "terrain";

  const pad = Math.max(world.width, world.height);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width + pad * 2, world.height + pad * 2),
    new THREE.MeshLambertMaterial({ color: basemap.ground3d })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(world.x + world.width / 2, -0.05, world.y + world.height / 2);
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);

  // world extent plate (matches the 2-D world rectangle)
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width, world.height),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(basemap.ground).lerp(new THREE.Color("#ffffff"), 0.35) })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(world.x + world.width / 2, 0, world.y + world.height / 2);
  plate.receiveShadow = true;
  group.add(plate);

  if (boundary) {
    const site = new THREE.Mesh(flatPolygonGeometry(boundary.geometry.points), new THREE.MeshLambertMaterial({ color: new THREE.Color(basemap.site) }));
    site.position.y = 0.08;
    site.receiveShadow = true;
    site.name = "site-plate";
    group.add(site);
  }

  if (showContours && contours.length > 0) {
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(basemap.contour), transparent: true, opacity: 0.8 });
    for (const c of contours) {
      const pts = c.geometry.points.map((p) => toScene(p, 0.09));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }

  return group;
}
