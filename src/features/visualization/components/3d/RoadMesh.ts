import * as THREE from "three";
import type { RoadObject, TransitObject, UtilityObject } from "../../types/visualization.types";
import { ribbonGeometry, toScene } from "./sceneMath";

const ROAD_COLOR: Record<RoadObject["properties"]["roadClass"], number> = {
  Arterial: 0xd6dde8,
  Collector: 0xdde4ee,
  Local: 0xe4e9f1,
  Pedestrian: 0xd9cfbc,
};

/** Roads and paths as flat ribbons just above the ground; transit as a raised line. */
export function buildRoads(roads: RoadObject[], transit: TransitObject[], utilities: UtilityObject[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "roads";

  const mats = new Map<number, THREE.MeshLambertMaterial>();
  const mat = (hex: number) => {
    let m = mats.get(hex);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex });
      mats.set(hex, m);
    }
    return m;
  };

  for (const r of roads) {
    const isPath = r.type === "path";
    const mesh = new THREE.Mesh(ribbonGeometry(r.geometry.points, r.geometry.width), mat(isPath ? ROAD_COLOR.Pedestrian : ROAD_COLOR[r.properties.roadClass]));
    mesh.position.y = isPath ? 0.16 : 0.18;
    mesh.receiveShadow = true;
    mesh.name = r.id;
    mesh.userData.objectId = r.id;
    group.add(mesh);
    if (!isPath && r.properties.roadClass !== "Local") {
      // centre line
      const pts = r.geometry.points.map((p) => toScene(p, 0.22));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: r.properties.roadClass === "Arterial" ? 0xd9ae5a : 0xffffff })));
    }
  }

  for (const t of transit) {
    const pts = t.geometry.points.map((p) => toScene(p, 0.6));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 12, gapSize: 6 }));
    line.computeLineDistances();
    line.name = t.id;
    group.add(line);
    const stationGeo = new THREE.CylinderGeometry(4, 4, 1.2, 16);
    const stationMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    for (const s of t.properties.stations) {
      const m = new THREE.Mesh(stationGeo, stationMat);
      m.position.set(s.point.x, 0.7, s.point.y);
      group.add(m);
    }
  }

  for (const u of utilities) {
    const pts = u.geometry.points.map((p) => toScene(p, 0.3));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xd97706, dashSize: 3, gapSize: 3 }));
    line.computeLineDistances();
    group.add(line);
  }

  return group;
}
