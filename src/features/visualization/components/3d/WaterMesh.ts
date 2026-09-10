import * as THREE from "three";
import type { BasemapStyle } from "../../data/visualization.data";
import type { AreaObject } from "../../types/visualization.types";
import { flatPolygonGeometry } from "./sceneMath";

/** Water bodies as slightly recessed, softly reflective plates. */
export function buildWater(water: AreaObject[], basemap: BasemapStyle): THREE.Group {
  const group = new THREE.Group();
  group.name = "water";
  if (water.length === 0) return group;
  const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(basemap.water.fill), shininess: 60, specular: 0xffffff, transparent: true, opacity: 0.95 });
  for (const w of water) {
    const mesh = new THREE.Mesh(flatPolygonGeometry(w.geometry.points), mat);
    mesh.position.y = 0.12; // above block plates, below roads (bridges) — see LandscapeMesh stack
    mesh.receiveShadow = true;
    mesh.name = w.id;
    mesh.userData.objectId = w.id;
    group.add(mesh);
  }
  return group;
}
