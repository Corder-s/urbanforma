import * as THREE from "three";
import type { AreaObject } from "../../types/visualization.types";
import { flatPolygonGeometry } from "./sceneMath";

/** Blocks, plazas, parking and green areas as thin plates on the ground. */
export function buildLandscape(blocks: AreaObject[], parking: AreaObject[], green: AreaObject[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "landscape";

  const add = (list: AreaObject[], color: number, y: number) => {
    if (list.length === 0) return;
    const mat = new THREE.MeshLambertMaterial({ color });
    for (const a of list) {
      const mesh = new THREE.Mesh(flatPolygonGeometry(a.geometry.points), mat);
      mesh.position.y = y;
      mesh.receiveShadow = true;
      mesh.name = a.id;
      mesh.userData.objectId = a.id;
      group.add(mesh);
    }
  };

  // Vertical stack (metres above the ground plane): site plate 0.08 → blocks 0.10 →
  // water 0.12 → plazas / parking 0.14 → green 0.15 → paths 0.16 → roads 0.18.
  add(blocks.filter((b) => !/plaza/i.test(b.properties.category)), 0xffffff, 0.1);
  add(blocks.filter((b) => /plaza/i.test(b.properties.category)), 0xf3ecdc, 0.14);
  add(parking, 0xe9edf3, 0.14);
  add(green.filter((g) => g.layer === "parks"), 0xc4e2bb, 0.15);
  add(green.filter((g) => g.layer !== "parks"), 0xcfe7c8, 0.15);

  return group;
}
