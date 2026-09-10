import * as THREE from "three";
import type { TreeObject } from "../../types/visualization.types";

/** Trees as two instanced meshes (trunks + canopies) — cheap at any count. */
export function buildTrees(trees: TreeObject[], castShadow: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = "trees";
  if (trees.length === 0) return group;

  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = new THREE.SphereGeometry(1, 10, 8);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x9c7b56 }), trees.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshLambertMaterial({ color: 0x7fb877 }), trees.length);
  canopies.castShadow = castShadow;
  trunks.castShadow = false;

  const m = new THREE.Matrix4();
  trees.forEach((t, i) => {
    const { x, y } = t.geometry.point;
    const h = t.properties.heightM;
    const r = t.properties.canopyM;
    m.compose(new THREE.Vector3(x, 0, y), new THREE.Quaternion(), new THREE.Vector3(1, h * 0.45, 1));
    trunks.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, h * 0.45 + r * 0.7, y), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.9, r));
    canopies.setMatrixAt(i, m);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  group.add(trunks, canopies);
  return group;
}
